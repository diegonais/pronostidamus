import { ApiError } from '../api/apiClient'

export function getApiErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return error.message
  }

  return 'No fue posible iniciar sesion. Intenta nuevamente.'
}
