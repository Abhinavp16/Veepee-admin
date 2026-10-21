const DEFAULT_API_BASE = "https://veepee-impex.vercel.app/api/v1"
const RAW_API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_API_BASE
const API_BASE = RAW_API_BASE.replace(/\/+$/, "")

export function buildApiUrl(endpoint: string): string {
  const normalizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`
  return `${API_BASE}${normalizedEndpoint}`
}

interface FetchOptions extends RequestInit { skipAuth?: boolean }

// Staff sign in from their own area; everyone else from /login.
export function loginPath(): string {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "null")
    return user?.role === "staff" ? "/member/login" : "/login"
  } catch { return "/login" }
}

function clearSession() {
  localStorage.removeItem("accessToken")
  localStorage.removeItem("refreshToken")
  localStorage.removeItem("user")
  localStorage.removeItem("sessionExpiresAt")
}

// Shown once on the login page after a session ends by itself.
const SESSION_ENDED_KEY = "sessionEndedMessage"

/** Signs out on this device and opens the right login page with a note. */
export function endSession(message = "Your session has ended. Please sign in again.") {
  const next = loginPath()
  clearSession()
  sessionStorage.setItem(SESSION_ENDED_KEY, message)
  window.location.href = next
}

/** The note left by endSession, read once. */
export function takeSessionEndedMessage(): string | null {
  const message = sessionStorage.getItem(SESSION_ENDED_KEY)
  if (message) sessionStorage.removeItem(SESSION_ENDED_KEY)
  return message
}

/** Saves a sign-in or refresh response (tokens and the session's end). */
export function saveSession(data: { accessToken: string; refreshToken?: string; sessionExpiresAt?: string; user?: unknown }) {
  localStorage.setItem("accessToken", data.accessToken)
  if (data.refreshToken) localStorage.setItem("refreshToken", data.refreshToken)
  if (data.user) localStorage.setItem("user", JSON.stringify(data.user))
  if (data.sessionExpiresAt) localStorage.setItem("sessionExpiresAt", data.sessionExpiresAt)
  else localStorage.removeItem("sessionExpiresAt")
}

function createApiErrorResponse(message: string, status = 503): Response {
  return new Response(JSON.stringify({ success: false, message }), { status, headers: { "Content-Type": "application/json" } })
}

// The server accepts each refresh token once. So only one refresh runs at a
// time: requests in this tab share it, and other tabs wait for it (a browser
// lock) and then use the token it saved.
let refreshInFlight: Promise<string | null> | null = null

function refreshAccessToken(sentToken: string | null): Promise<string | null> {
  if (!refreshInFlight) {
    refreshInFlight = withRefreshLock(() => runRefresh(sentToken)).finally(() => { refreshInFlight = null })
  }
  return refreshInFlight
}

function withRefreshLock<T>(task: () => Promise<T>): Promise<T> {
  if (typeof navigator !== "undefined" && navigator.locks?.request) {
    return navigator.locks.request("veepee-admin-token-refresh", task) as Promise<T>
  }
  return task()
}

async function runRefresh(sentToken: string | null): Promise<string | null> {
  // Already renewed (by another tab, or just before): use that token.
  const current = localStorage.getItem("accessToken")
  if (current && current !== sentToken) return current

  const refreshToken = localStorage.getItem("refreshToken")
  if (!refreshToken) { endSession(); return null }

  let response: Response
  try {
    response = await fetch(buildApiUrl("/auth/refresh-token"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ refreshToken }) })
  } catch {
    return null // Offline or server unreachable: keep the session.
  }
  // Only a refused refresh ends the session; 429 and 5xx are temporary.
  if (response.status === 401 || response.status === 403) {
    const payload = await response.json().catch(() => null)
    endSession(payload?.error?.code === "SESSION_EXPIRED"
      ? "Your 5-hour session has ended. Please sign in again."
      : "Your session has ended. Please sign in again.")
    return null
  }
  if (!response.ok) return null
  const payload = await response.json().catch(() => null)
  if (!payload?.data?.accessToken) return null
  saveSession(payload.data)
  return payload.data.accessToken
}

export async function apiFetch(endpoint: string, options: FetchOptions = {}): Promise<Response> {
  const { skipAuth, ...fetchOptions } = options
  const isFormDataBody = typeof FormData !== "undefined" && fetchOptions.body instanceof FormData
  const headers: HeadersInit = { ...fetchOptions.headers }
  if (!isFormDataBody && !(headers as Record<string, string>)["Content-Type"]) (headers as Record<string, string>)["Content-Type"] = "application/json"
  const sentToken = skipAuth ? null : localStorage.getItem("accessToken")
  if (sentToken) (headers as Record<string, string>).Authorization = `Bearer ${sentToken}`
  let response: Response
  try { response = await fetch(buildApiUrl(endpoint), { ...fetchOptions, headers }) } catch (error) { if (error instanceof TypeError) return createApiErrorResponse(`Unable to reach API at ${API_BASE}. Check backend server and NEXT_PUBLIC_API_BASE_URL.`); throw error }
  if (response.status === 401 && !skipAuth) {
    const token = await refreshAccessToken(sentToken)
    if (token) {
      (headers as Record<string, string>).Authorization = `Bearer ${token}`
      try { response = await fetch(buildApiUrl(endpoint), { ...fetchOptions, headers }) } catch (error) { if (error instanceof TypeError) return createApiErrorResponse(`Unable to reach API at ${API_BASE}. Check backend server and NEXT_PUBLIC_API_BASE_URL.`); throw error }
    }
  }
  return response
}

export function isAuthenticated(): boolean { return typeof window !== "undefined" && !!localStorage.getItem("accessToken") }
export function getUser() { if (typeof window === "undefined") return null; try { const user = localStorage.getItem("user"); return user ? JSON.parse(user) : null } catch { clearSession(); return null } }
export async function logout() {
  if (typeof window === "undefined") return
  const accessToken = localStorage.getItem("accessToken")
  const refreshToken = localStorage.getItem("refreshToken")
  if (accessToken) {
    try { await fetch(buildApiUrl("/auth/logout"), { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` }, body: JSON.stringify({ refreshToken }) }) } catch { /* Local cleanup still completes when the API is unavailable. */ }
  }
  const next = loginPath()
  clearSession()
  window.location.href = next
}
