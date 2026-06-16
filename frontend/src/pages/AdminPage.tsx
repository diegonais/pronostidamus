import { SectionCard } from '../components/SectionCard'
import { StatusBadge } from '../components/StatusBadge'

export function AdminPage() {
  return (
    <div className="page-grid">
      <SectionCard
        title="Area administrativa"
        description="Seccion reservada para gestion de usuarios, salas, partidos y resultados."
      >
        <div className="admin-actions">
          <article className="stat-card">
            <span>Usuarios</span>
            <strong>Pendiente de integracion</strong>
          </article>
          <article className="stat-card">
            <span>Partidos</span>
            <strong>Pendiente de integracion</strong>
          </article>
          <article className="stat-card">
            <span>Resultados</span>
            <StatusBadge tone="warning">Por implementar</StatusBadge>
          </article>
        </div>
      </SectionCard>

      <SectionCard
        title="Alcance actual"
        description="No se implementa logica admin real todavia, solo la base de navegacion y proteccion."
      >
        <ul className="feature-list">
          <li>Ruta protegida por rol admin desde la sesion local del frontend.</li>
          <li>Espacio listo para formularios y tablas administrativas.</li>
          <li>Sin consumo de endpoints que aun no existen.</li>
        </ul>
      </SectionCard>
    </div>
  )
}
