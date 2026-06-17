import api from './api';
import type { Prediction } from '../types';

export interface PredictionPayload {
  userId: string;
  predictedTeamAScore: number;
  predictedTeamBScore: number;
}

export const predictionsService = {
  async getByMatch(matchId: string) {
    const { data } = await api.get<Prediction[]>(`/matches/${matchId}/predictions`);
    return data;
  },
  async create(matchId: string, payload: PredictionPayload) {
    const { data } = await api.post<Prediction>(`/matches/${matchId}/predictions`, payload);
    return data;
  },
  async update(predictionId: string, payload: Omit<PredictionPayload, 'userId'>) {
    const { data } = await api.patch<Prediction>(`/predictions/${predictionId}`, payload);
    return data;
  },
};
