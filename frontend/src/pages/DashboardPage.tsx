import { SectionCard } from '../components/SectionCard'
import { StatusBadge } from '../components/StatusBadge'
import { getSession } from '../types/session'

export function DashboardPage() {
  const session = getSession()

  return (
    <div className="page-grid">
      <SectionCard
        title="Resumen"
        description="Vista inicial para mostrar estado de salas, proximos cierres y accesos rapidos."
      >
        <div className="stats-grid">
          <article className="stat-card">
            <span>Sala activa</span>
            <strong>pronostidamus mundialcillo</strong>
          </article>
          <article className="stat-card">
            <span>Rol actual</span>
            <strong>{session?.roles.join(', ') ?? 'sin sesion'}</strong>
          </article>
          <article className="stat-card">
            <span>Estado</span>
            <StatusBadge tone="success">Base lista para integrar</StatusBadge>
          </article>
        </div>
      </SectionCard>

      <SectionCard
        title="Siguientes pasos"
        description="Esta pantalla queda lista para conectar datos reales del backend cuando existan."
      >
        <ul className="feature-list">
          <li>Conectar login JWT real y persistencia de usuario.</li>
          <li>Consumir salas, partidos y leaderboard desde la API.</li>
          <li>Mostrar cierres de pronosticos y resumen de puntos.</li>
        </ul>
      </SectionCard>
    </div>
  )
}
