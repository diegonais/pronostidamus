import { NavLink, Outlet } from 'react-router-dom'
import { clearSession, getSession } from '../types/session'

const navigationItems = [
  { label: 'Dashboard', to: '/' },
  { label: 'Partidos', to: '/matches' },
  { label: 'Tabla', to: '/leaderboard' },
  { label: 'Admin', to: '/admin' },
]

export function AppLayout() {
  const session = getSession()

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar__brand">
          <span className="sidebar__eyebrow">pronostidamus</span>
          <strong>Panel principal</strong>
        </div>

        <nav className="sidebar__nav" aria-label="Principal">
          {navigationItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => (isActive ? 'nav-link nav-link--active' : 'nav-link')}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar__footer">
          <p>Usuario actual: {session?.username ?? 'sin sesion'}</p>
          <button className="button button--ghost" onClick={clearSession} type="button">
            Cerrar sesion local
          </button>
        </div>
      </aside>

      <main className="app-content">
        <header className="page-header">
          <div>
            <span className="page-header__eyebrow">MVP base</span>
            <h1>Frontend listo para integrar</h1>
          </div>
          <p>
            Estructura preparada para autenticacion, vistas privadas y seccion administrativa.
          </p>
        </header>

        <Outlet />
      </main>
    </div>
  )
}
