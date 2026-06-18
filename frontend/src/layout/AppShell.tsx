import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

interface NavItem {
  label: string;
  to: string;
}

interface NavSection {
  title?: string;
  links: NavItem[];
}

const userLinks: NavItem[] = [
  { label: 'Panel', to: '/user' },
  { label: 'Perfil', to: '/user/profile' },
  { label: 'Mis salas', to: '/user/rooms' },
];

const adminToolsLinks: NavItem[] = [
  { label: 'Resumen admin', to: '/admin' },
  { label: 'Gestion de usuarios', to: '/admin/users' },
  { label: 'Gestion de salas', to: '/admin/rooms' },
];

export function AppShell() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    function handleScroll() {
      setShowScrollTop(window.scrollY > 320);
    }

    handleScroll();
    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  if (!currentUser) {
    return null;
  }

  const sections: NavSection[] =
    currentUser.role === UserRole.ADMIN
      ? [
          { title: 'Panel', links: userLinks },
          { title: 'Admin', links: adminToolsLinks },
        ]
      : [{ title: 'Panel', links: userLinks }];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark">
            <img className="brand-ball" src="/ball.png" alt="Balon oficial" />
            <img className="brand-logo" src="/pronostidamus.png" alt="Pronostidamus" />
          </div>
        </div>

        <div className="user-box">
          <strong>{currentUser.name}</strong>
          <span>
            @{currentUser.username} · {currentUser.role}
          </span>
        </div>

        {sections.map((section) => (
          <div key={section.title ?? 'default'} className="nav-section">
            {section.title ? <p className="nav-section-title">{section.title}</p> : null}
            <nav className="nav-list">
              {section.links.map((link) => (
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
          </div>
        ))}

        <button
          className="secondary-button"
          type="button"
          onClick={() => {
            logout();
            navigate('/login');
          }}
        >
          Cerrar sesion
        </button>

        <div className="sidebar-footer">
          <span>Desarrollado por </span>
          <a
            href="https://diegonais.vercel.app"
            target="_blank"
            rel="noreferrer"
          >
            diegonais
          </a>
          <span> - 2026</span>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>

      {showScrollTop ? (
        <button
          className="scroll-top-button"
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Volver arriba"
        >
          ↑
        </button>
      ) : null}
    </div>
  );
}
