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

function getTeamDisplayName(match: Match, side: 'A' | 'B') {
  return side === 'A'
    ? (match.teamAInfo?.name ?? match.teamA)
    : (match.teamBInfo?.name ?? match.teamB);
}

function getTeamFlagUrl(match: Match, side: 'A' | 'B') {
  return side === 'A'
    ? match.teamAInfo?.flagUrl
    : match.teamBInfo?.flagUrl;
}

export function InternalMatchScoreCard({
  match,
}: InternalMatchScoreCardProps) {
  const teamAName = getTeamDisplayName(match, 'A');
  const teamBName = getTeamDisplayName(match, 'B');
  const teamAFlagUrl = getTeamFlagUrl(match, 'A');
  const teamBFlagUrl = getTeamFlagUrl(match, 'B');

  return (
    <section className="match-result-card" aria-live="polite">
      <div className="match-result-card__body">
        <div className="match-result-card__topline">
          <strong>Resultado final</strong>
          <span>{getInternalStatusLabel(match)}</span>
        </div>
        <div className="match-result-card__resultline">
          <div className="match-result-card__team match-result-card__team--home">
            {teamAFlagUrl ? (
              <img
                className="match-result-card__flag"
                src={teamAFlagUrl}
                alt={`Bandera de ${teamAName}`}
                loading="lazy"
              />
            ) : (
              <span className="match-result-card__flag-placeholder" aria-hidden="true">
                {teamAName.slice(0, 2).toUpperCase()}
              </span>
            )}
            <span>{teamAName}</span>
          </div>
          <div className="match-result-card__scoreline">
            <span>{match.teamAScore ?? '-'}</span>
            <span className="match-result-card__separator">:</span>
            <span>{match.teamBScore ?? '-'}</span>
          </div>
          <div className="match-result-card__team match-result-card__team--away">
            {teamBFlagUrl ? (
              <img
                className="match-result-card__flag"
                src={teamBFlagUrl}
                alt={`Bandera de ${teamBName}`}
                loading="lazy"
              />
            ) : (
              <span className="match-result-card__flag-placeholder" aria-hidden="true">
                {teamBName.slice(0, 2).toUpperCase()}
              </span>
            )}
            <span>{teamBName}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
