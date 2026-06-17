import api from './api';
import type { User, UserRole } from '../types';

export interface UserPayload {
  name: string;
  username: string;
  email: string;
  password?: string;
  role?: UserRole;
  isActive?: boolean;
}

export const usersService = {
  async getAll() {
    const { data } = await api.get<User[]>('/users');
    return data;
  },
  async create(payload: UserPayload) {
    const { data } = await api.post<User>('/users', payload);
    return data;
  },
  async update(userId: string, payload: Partial<UserPayload>) {
    const { data } = await api.patch<User>(`/users/${userId}`, payload);
    return data;
  },
};
