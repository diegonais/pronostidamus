import api from './api';
import type { Team } from '../types';

export const teamsService = {
  async getAll() {
    const { data } = await api.get<Team[]>('/teams');
    return data;
  },
};
