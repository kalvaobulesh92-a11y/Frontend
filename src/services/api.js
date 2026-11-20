import axios from 'axios'

export const ACCESS_TOKEN_KEY = 'kaamconnect_access'
export const REFRESH_TOKEN_KEY = 'kaamconnect_refresh'

const API_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')

const api = axios.create({
  baseURL: API_URL,
  headers: { Accept: 'application/json' },
})

let refreshRequest

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(ACCESS_TOKEN_KEY)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const request = error.config
    const refresh = localStorage.getItem(REFRESH_TOKEN_KEY)
    if (
      error.response?.status !== 401
      || !request
      || request._retry
      || !refresh
      || request.url?.includes('/accounts/token/refresh/')
      || request.url?.includes('/accounts/login/')
    ) {
      return Promise.reject(error)
    }

    request._retry = true
    try {
      if (!refreshRequest) {
        refreshRequest = axios.post(`${API_URL}/accounts/token/refresh/`, { refresh })
          .then(({ data }) => {
            localStorage.setItem(ACCESS_TOKEN_KEY, data.access)
            if (data.refresh) localStorage.setItem(REFRESH_TOKEN_KEY, data.refresh)
            return data.access
          })
          .finally(() => { refreshRequest = null })
      }
      const access = await refreshRequest
      request.headers.Authorization = `Bearer ${access}`
      return api(request)
    } catch (refreshError) {
      localStorage.removeItem(ACCESS_TOKEN_KEY)
      localStorage.removeItem(REFRESH_TOKEN_KEY)
      return Promise.reject(refreshError)
    }
  },
)

export function getApiError(error) {
  const data = error?.response?.data
  if (!data) return 'We could not reach the server. Check your connection and try again.'
  if (typeof data.detail === 'string') return data.detail
  if (typeof data === 'string') return data
  const firstValue = Object.values(data).flat(Infinity).find((value) => typeof value === 'string')
  return firstValue || 'Please review the information and try again.'
}

export default api
