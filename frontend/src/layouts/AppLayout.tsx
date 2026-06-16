import { NavLink, Outlet } from 'react-router-dom'
import logo from '../assets/logo.png'
import { useAuth } from '../context/useAuth'

const navigationItems = [
  { label: 'Dashboard', to: '/' },
  { label: 'Partidos', to: '/matches' },
  { label: 'Tabla', to: '/leaderboard' },
]

export function AppLayout() {
  const { logout, user } = useAuth()
  const isAdmin = user?.roles.includes('admin') ?? false
  const visibleNavigationItems = isAdmin
    ? [...navigationItems, { label: 'Admin', to: '/admin' }]
    : navigationItems

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar__brand">
          <img alt="pronostidamus" className="brand-logo brand-logo--sidebar" src={logo} />
          <span className="sidebar__eyebrow">Sistema</span>
        </div>

        <nav className="sidebar__nav" aria-label="Principal">
          {visibleNavigationItems.map((item) => (
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
          <p>Usuario actual: {user?.username ?? 'sin sesion'}</p>
          <button className="button button--ghost" onClick={logout} type="button">
            Cerrar sesion
          </button>
        </div>
      </aside>

      <main className="app-content">
        <header className="page-header">
          <div className="page-header__brand">
            <img alt="pronostidamus" className="brand-logo brand-logo--header" src={logo} />
            <div>
              <span className="page-header__eyebrow">Panel principal</span>
              <h1>pronostidamus</h1>
            </div>
          </div>
          <p>Navegacion protegida, sesion persistente y acceso administrativo por rol.</p>
        </header>

        <Outlet />
      </main>
    </div>
  )
}
