import { MatchStatus } from '../types';

export function isPredictionLocked(matchDate: string, status: MatchStatus): boolean {
  if (status === MatchStatus.CLOSED || status === MatchStatus.FINISHED) {
    return true;
  }

  const fiveMinutesBefore = new Date(matchDate).getTime() - 5 * 60 * 1000;
  return Date.now() >= fiveMinutesBefore;
}

export function getMatchVisualStatus(matchDate: string, status: MatchStatus): string {
  if (status === MatchStatus.FINISHED) {
    return 'Finalizado';
  }

  if (status === MatchStatus.CLOSED || isPredictionLocked(matchDate, status)) {
    return 'Cerrado';
  }

  return 'Programado';
}
