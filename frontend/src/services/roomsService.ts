import api from './api';
import type { Room } from '../types';

export interface RoomPayload {
  name: string;
  isActive?: boolean;
}

export const roomsService = {
  async getAll() {
    const { data } = await api.get<Room[]>('/rooms');
    return data;
  },
  async getById(roomId: string) {
    const { data } = await api.get<Room>(`/rooms/${roomId}`);
    return data;
  },
  async create(payload: RoomPayload) {
    const { data } = await api.post<Room>('/rooms', payload);
    return data;
  },
  async update(roomId: string, payload: Partial<RoomPayload>) {
    const { data } = await api.patch<Room>(`/rooms/${roomId}`, payload);
    return data;
  },
  async addUser(roomId: string, userId: string) {
    const { data } = await api.post(`/rooms/${roomId}/users/${userId}`);
    return data;
  },
  async removeUser(roomId: string, userId: string) {
    const { data } = await api.delete(`/rooms/${roomId}/users/${userId}`);
    return data;
  },
};
