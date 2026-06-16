import { SectionCard } from '../components/SectionCard'
import { StatusBadge } from '../components/StatusBadge'
import type { MatchCardView } from '../types/match'

const initialMatches: MatchCardView[] = [
  {
    id: 'placeholder-1',
    homeTeam: 'Equipo local',
    awayTeam: 'Equipo visitante',
    groupName: 'Grupo pendiente',
    matchDateLabel: 'Fecha por definir desde backend',
    status: 'scheduled',
  },
]

export function MatchesPage() {
  return (
    <SectionCard
      title="Partidos"
      description="Vista base para listar encuentros y registrar pronosticos cuando la API este lista."
    >
      <div className="table-like">
        {initialMatches.map((match) => (
          <article className="match-row" key={match.id}>
            <div>
              <strong>
                {match.homeTeam} vs {match.awayTeam}
              </strong>
              <p>
                {match.groupName} · {match.matchDateLabel}
              </p>
            </div>
            <StatusBadge>{match.status}</StatusBadge>
          </article>
        ))}
      </div>
    </SectionCard>
  )
}
