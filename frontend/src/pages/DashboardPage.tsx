import { SectionCard } from '../components/SectionCard'
import { StatusBadge } from '../components/StatusBadge'
import { useAuth } from '../context/useAuth'

export function DashboardPage() {
  const { user } = useAuth()

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
            <strong>{user?.roles.join(', ') ?? 'sin sesion'}</strong>
          </article>
          <article className="stat-card">
            <span>Estado</span>
            <StatusBadge tone="success">Sesion protegida activa</StatusBadge>
          </article>
        </div>
      </SectionCard>

      <SectionCard
        title="Siguientes pasos"
        description="Esta pantalla queda lista para conectar datos reales del backend cuando existan."
      >
        <ul className="feature-list">
          <li>Consumir salas, partidos y leaderboard desde la API.</li>
          <li>Mostrar cierres de pronosticos y resumen de puntos.</li>
          <li>Completar panel admin con formularios y tablas reales.</li>
        </ul>
      </SectionCard>
    </div>
  )
}
