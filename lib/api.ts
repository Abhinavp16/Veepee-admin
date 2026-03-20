const DEFAULT_API_BASE = "https://veepee-impex.vercel.app/api/v1"
const RAW_API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || DEFAULT_API_BASE
const API_BASE = RAW_API_BASE.replace(/\/+$/, "")

export function buildApiUrl(endpoint: string): string {
  const normalizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`
  return `${API_BASE}${normalizedEndpoint}`
}

interface FetchOptions extends RequestInit {
  skipAuth?: boolean
}

function createApiErrorResponse(message: string, status = 503): Response {
  return new Response(JSON.stringify({ success: false, message }), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem('refreshToken')
  if (!refreshToken) return null

  try {
    const res = await fetch(buildApiUrl("/auth/refresh-token"), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })

    if (!res.ok) {
      // Refresh token expired - clear storage and redirect to login
      localStorage.removeItem('accessToken')
      localStorage.removeItem('refreshToken')
      localStorage.removeItem('user')
      window.location.href = '/login'
      return null
    }

    const data = await res.json()
    localStorage.setItem('accessToken', data.data.accessToken)
    if (data.data.refreshToken) {
      localStorage.setItem('refreshToken', data.data.refreshToken)
    }
    return data.data.accessToken
  } catch {
    return null
  }
}

export async function apiFetch(endpoint: string, options: FetchOptions = {}): Promise<Response> {
  const { skipAuth, ...fetchOptions } = options

  const isFormDataBody = typeof FormData !== "undefined" && fetchOptions.body instanceof FormData
  const headers: HeadersInit = {
    ...fetchOptions.headers,
  }

  if (!isFormDataBody && !(headers as Record<string, string>)["Content-Type"]) {
    ;(headers as Record<string, string>)["Content-Type"] = "application/json"
  }

  if (!skipAuth) {
    const token = localStorage.getItem('accessToken')
    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
    }
  }

  let res: Response
  try {
    res = await fetch(buildApiUrl(endpoint), {
      ...fetchOptions,
      headers,
    })
  } catch (error) {
    if (error instanceof TypeError) {
      return createApiErrorResponse(`Unable to reach API at ${API_BASE}. Check backend server and NEXT_PUBLIC_API_BASE_URL.`)
    }
    throw error
  }

  // If 401 and not skipping auth, try to refresh token
  if (res.status === 401 && !skipAuth) {
    const newToken = await refreshAccessToken()
    if (newToken) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${newToken}`
      try {
        res = await fetch(buildApiUrl(endpoint), {
          ...fetchOptions,
          headers,
        })
      } catch (error) {
        if (error instanceof TypeError) {
          return createApiErrorResponse(`Unable to reach API at ${API_BASE}. Check backend server and NEXT_PUBLIC_API_BASE_URL.`)
        }
        throw error
      }
    }
  }

  return res
}

export function isAuthenticated(): boolean {
  if (typeof window === 'undefined') return false
  return !!localStorage.getItem('accessToken')
}

export function getUser() {
  if (typeof window === 'undefined') return null
  const user = localStorage.getItem('user')
  return user ? JSON.parse(user) : null
}

export function logout() {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
  localStorage.removeItem('user')
  window.location.href = '/login'
}
