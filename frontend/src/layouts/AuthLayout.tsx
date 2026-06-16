import { Outlet } from 'react-router-dom'

export function AuthLayout() {
  return (
    <div className="auth-layout">
      <div className="auth-layout__panel">
        <div className="brand-lockup">
          <span className="brand-lockup__eyebrow">Sistema de pronosticos</span>
          <h1>pronostidamus</h1>
          <p>
            Accede a tus salas, registra pronosticos y revisa la tabla de posiciones desde
            una base de frontend lista para integrar con el backend.
          </p>
          <div className="brand-lockup__assets">
            <div className="asset-slot">
              <span>Logo completo</span>
              <small>Reservado para asset futuro</small>
            </div>
            <div className="asset-slot">
              <span>Favicon</span>
              <small>Reservado para asset futuro</small>
            </div>
          </div>
        </div>
        <Outlet />
      </div>
    </div>
  )
}
