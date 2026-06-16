const fallbackApiUrl = 'http://localhost:3000'

const normalizeBaseUrl = (value: string | undefined) => {
  const source = value?.trim() || fallbackApiUrl
  return source.endsWith('/') ? source.slice(0, -1) : source
}

const apiBaseUrl = normalizeBaseUrl(import.meta.env.VITE_API_URL)

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown
  requiresAuth?: boolean
}

const getToken = () => window.localStorage.getItem('pronostidamus.token')

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers, requiresAuth = true, ...rest } = options
  const token = getToken()

  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(requiresAuth && token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  if (!response.ok) {
    throw new Error(`API request failed with status ${response.status}`)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}

export const apiClient = {
  baseUrl: apiBaseUrl,
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'GET' }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'POST', body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PUT', body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'PATCH', body }),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'DELETE' }),
}
