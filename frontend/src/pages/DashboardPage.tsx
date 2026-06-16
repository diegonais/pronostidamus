import { Link } from 'react-router-dom'
import { SectionCard } from '../components/SectionCard'
import { StatusBadge } from '../components/StatusBadge'
import { useAuth } from '../context/useAuth'
import { useActiveRoom } from '../hooks/useActiveRoom'

export function DashboardPage() {
  const { user } = useAuth()
  const { activeRoom, error, isLoading } = useActiveRoom()

  return (
    <div className="page-grid">
      <SectionCard
        title="Resumen"
        description="Acceso rapido a la sala activa, partidos y tabla de posiciones."
      >
        {isLoading ? <p className="inline-note">Cargando sala activa...</p> : null}
        {error ? <p className="form-error">{error}</p> : null}

        <div className="stats-grid">
          <article className="stat-card">
            <span>Sala activa</span>
            <strong>{activeRoom?.name ?? 'Sin sala disponible'}</strong>
            <small>{activeRoom?.code ?? 'No perteneces a ninguna sala todavia.'}</small>
          </article>

          <article className="stat-card">
            <span>Rol actual</span>
            <strong>{user?.roles.join(', ') ?? 'sin sesion'}</strong>
            <small>Usuario: {user?.username ?? 'sin sesion'}</small>
          </article>

          <article className="stat-card">
            <span>Estado</span>
            <StatusBadge tone={activeRoom?.isActive ? 'success' : 'warning'}>
              {activeRoom?.isActive ? 'Sala habilitada' : 'Sin sala activa'}
            </StatusBadge>
            <small>La sesion protegida ya esta conectada a la API.</small>
          </article>
        </div>
      </SectionCard>

      <SectionCard
        title="Accesos"
        description="Entradas principales para registrar pronosticos y seguir el ranking."
      >
        <div className="quick-links">
          <Link className="quick-link-card" to="/matches">
            <strong>Partidos</strong>
            <p>Ver calendario, resultados y registrar o editar pronosticos antes del cierre.</p>
          </Link>

          <Link className="quick-link-card" to="/leaderboard">
            <strong>Leaderboard</strong>
            <p>Consultar posiciones, exactos, aciertos simples y total acumulado por usuario.</p>
          </Link>
        </div>
      </SectionCard>
    </div>
  )
}
