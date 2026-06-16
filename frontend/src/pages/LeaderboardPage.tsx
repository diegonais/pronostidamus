import { SectionCard } from '../components/SectionCard'

const columns = ['Posicion', 'Usuario', 'Puntos', 'Exactos', 'Aciertos simples']

export function LeaderboardPage() {
  return (
    <SectionCard
      title="Tabla de posiciones"
      description="Estructura inicial para mostrar el leaderboard por sala con los criterios del MVP."
    >
      <div className="leaderboard-table">
        <div className="leaderboard-table__header">
          {columns.map((column) => (
            <span key={column}>{column}</span>
          ))}
        </div>
        <div className="leaderboard-table__empty">
          El leaderboard se mostrara aqui cuando exista el endpoint correspondiente.
        </div>
      </div>
    </SectionCard>
  )
}
