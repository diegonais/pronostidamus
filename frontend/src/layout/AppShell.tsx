import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

interface NavItem {
  label: string;
  to: string;
}

const adminLinks: NavItem[] = [
  { label: 'Resumen', to: '/admin' },
  { label: 'Usuarios', to: '/admin/users' },
  { label: 'Salas', to: '/admin/rooms' },
  { label: 'Partidos', to: '/admin/matches' },
  { label: 'Tabla', to: '/admin/leaderboard' },
];

const userLinks: NavItem[] = [
  { label: 'Panel', to: '/user' },
  { label: 'Perfil', to: '/user/profile' },
  { label: 'Mis salas', to: '/user/rooms' },
  { label: 'Pronósticos', to: '/user/predictions' },
  { label: 'Tabla', to: '/user/leaderboard' },
];

export function AppShell() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  if (!currentUser) {
    return null;
  }

  const links = currentUser.role === UserRole.ADMIN ? adminLinks : userLinks;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <img className="brand-logo" src="/pronostidamus.png" alt="Pronostidamus" />
          <img className="brand-ball" src="/ball.png" alt="Balón oficial" />
          <div>
            <p className="eyebrow">Pronostidamus</p>
            <h1>Panel deportivo</h1>
          </div>
        </div>

        <div className="user-box">
          <strong>{currentUser.name}</strong>
          <span>
            @{currentUser.username} · {currentUser.role}
          </span>
        </div>

        <nav className="nav-list">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/admin' || link.to === '/user'}
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <button
          className="secondary-button"
          type="button"
          onClick={() => {
            logout();
            navigate('/login');
          }}
        >
          Cerrar sesión
        </button>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
