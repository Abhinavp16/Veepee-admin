const API_BASE = 'http://192.168.1.10:5000/api/v1'

interface FetchOptions extends RequestInit {
  skipAuth?: boolean
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem('refreshToken')
  if (!refreshToken) return null

  try {
    const res = await fetch(`${API_BASE}/auth/refresh-token`, {
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

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...fetchOptions.headers,
  }

  if (!skipAuth) {
    const token = localStorage.getItem('accessToken')
    if (token) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${token}`
    }
  }

  let res = await fetch(`${API_BASE}${endpoint}`, {
    ...fetchOptions,
    headers,
  })

  // If 401 and not skipping auth, try to refresh token
  if (res.status === 401 && !skipAuth) {
    const newToken = await refreshAccessToken()
    if (newToken) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${newToken}`
      res = await fetch(`${API_BASE}${endpoint}`, {
        ...fetchOptions,
        headers,
      })
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
