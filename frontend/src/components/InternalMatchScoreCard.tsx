import type { Match } from '../types';
import { formatDateTime } from '../utils/date';

type InternalMatchScoreCardProps = {
  match: Match;
};

function getInternalStatusLabel(match: Match) {
  if (match.status === 'FINISHED') {
    return 'Finalizado';
  }

  if (match.status === 'CLOSED') {
    return 'Cerrado';
  }

  return formatDateTime(match.matchDate);
}

export function InternalMatchScoreCard({
  match,
}: InternalMatchScoreCardProps) {
  return (
    <section className="match-result-card" aria-live="polite">
      <div className="match-result-card__body">
        <div className="match-result-card__topline">
          <strong>Resultado final</strong>
          <span>{getInternalStatusLabel(match)}</span>
        </div>
        <div className="match-result-card__resultline">
          <span className="match-result-card__team match-result-card__team--home">
            {match.teamA}
          </span>
          <div className="match-result-card__scoreline">
            <span>{match.teamAScore ?? '-'}</span>
            <span className="match-result-card__separator">:</span>
            <span>{match.teamBScore ?? '-'}</span>
          </div>
          <span className="match-result-card__team match-result-card__team--away">
            {match.teamB}
          </span>
        </div>
      </div>
    </section>
  );
}
