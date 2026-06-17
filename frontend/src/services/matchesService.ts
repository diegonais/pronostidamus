import api from './api';
import type { Match, MatchStatus } from '../types';

export interface MatchPayload {
  teamA: string;
  teamB: string;
  matchDate: string;
  teamAScore?: number | null;
  teamBScore?: number | null;
  status?: MatchStatus;
  isActive?: boolean;
}

export const matchesService = {
  async getByRoom(roomId: string) {
    const { data } = await api.get<Match[]>(`/rooms/${roomId}/matches`);
    return data;
  },
  async create(roomId: string, payload: MatchPayload) {
    const { data } = await api.post<Match>(`/rooms/${roomId}/matches`, payload);
    return data;
  },
  async update(matchId: string, payload: Partial<MatchPayload>) {
    const { data } = await api.patch<Match>(`/matches/${matchId}`, payload);
    return data;
  },
};
