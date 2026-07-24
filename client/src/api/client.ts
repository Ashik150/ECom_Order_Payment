import axios from 'axios'

const baseURL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api'
const usesNgrokFreeDomain = /\.ngrok-free\.(app|dev)(?:\/|$)/.test(baseURL)

export const api = axios.create({
  baseURL,
  timeout: 15_000,
  headers: {
    'content-type': 'application/json',
    ...(usesNgrokFreeDomain ? { 'ngrok-skip-browser-warning': '1' } : {}),
  },
})

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('raco_access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      sessionStorage.removeItem('raco_access_token')
      window.dispatchEvent(new Event('raco:unauthorized'))
    }
    return Promise.reject(error)
  },
)

export function apiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return String(error.response?.data?.message ?? error.message)
  }
  return error instanceof Error ? error.message : 'Something went wrong'
}
