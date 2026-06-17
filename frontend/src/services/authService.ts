import api from './api';
import type { LoginRequest, LoginResponse } from '../types';

export const authService = {
  async previewLogin(payload: LoginRequest) {
    const { data } = await api.post<LoginResponse>('/auth/preview-login', payload);
    return data;
  },
};
