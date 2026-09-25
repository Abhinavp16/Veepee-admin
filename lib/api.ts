const DEFAULT_API_BASE = "https://veepee-impex.vercel.app/api/v1"
const RAW_API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_API_BASE
const API_BASE = RAW_API_BASE.replace(/\/+$/, "")

export function buildApiUrl(endpoint: string): string {
  const normalizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`
  return `${API_BASE}${normalizedEndpoint}`
}

interface FetchOptions extends RequestInit { skipAuth?: boolean }

function clearSession() {
  localStorage.removeItem("accessToken")
  localStorage.removeItem("refreshToken")
  localStorage.removeItem("user")
}

function createApiErrorResponse(message: string, status = 503): Response {
  return new Response(JSON.stringify({ success: false, message }), { status, headers: { "Content-Type": "application/json" } })
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem("refreshToken")
  if (!refreshToken) return null
  try {
    const response = await fetch(buildApiUrl("/auth/refresh-token"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ refreshToken }) })
    if (!response.ok) { clearSession(); window.location.href = "/login"; return null }
    const payload = await response.json()
    localStorage.setItem("accessToken", payload.data.accessToken)
    if (payload.data.refreshToken) localStorage.setItem("refreshToken", payload.data.refreshToken)
    return payload.data.accessToken
  } catch { return null }
}

export async function apiFetch(endpoint: string, options: FetchOptions = {}): Promise<Response> {
  const { skipAuth, ...fetchOptions } = options
  const isFormDataBody = typeof FormData !== "undefined" && fetchOptions.body instanceof FormData
  const headers: HeadersInit = { ...fetchOptions.headers }
  if (!isFormDataBody && !(headers as Record<string, string>)["Content-Type"]) (headers as Record<string, string>)["Content-Type"] = "application/json"
  if (!skipAuth) { const token = localStorage.getItem("accessToken"); if (token) (headers as Record<string, string>).Authorization = `Bearer ${token}` }
  let response: Response
  try { response = await fetch(buildApiUrl(endpoint), { ...fetchOptions, headers }) } catch (error) { if (error instanceof TypeError) return createApiErrorResponse(`Unable to reach API at ${API_BASE}. Check backend server and NEXT_PUBLIC_API_BASE_URL.`); throw error }
  if (response.status === 401 && !skipAuth) {
    const token = await refreshAccessToken()
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
  clearSession()
  window.location.href = "/login"
}
