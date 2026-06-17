import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export function extractErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;

    if (typeof data === 'string') {
      return data;
    }

    if (Array.isArray(data?.message)) {
      return data.message.join(', ');
    }

    if (typeof data?.message === 'string') {
      return data.message;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Ocurrió un error inesperado.';
}

export default api;
