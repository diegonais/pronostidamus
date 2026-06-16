import { Outlet } from 'react-router-dom'
import logo from '../assets/logo.png'

export function AuthLayout() {
  return (
    <div className="auth-layout">
      <div className="auth-layout__panel">
        <div className="brand-lockup">
          <span className="brand-lockup__eyebrow">Sistema de pronosticos</span>
          <h1>pronostidamus</h1>
          <p>
            Accede a tus salas, registra pronosticos y revisa la tabla de posiciones desde una
            interfaz protegida conectada al backend.
          </p>
          <div className="brand-lockup__assets">
            <div className="asset-slot asset-slot--logo">
              <img alt="pronostidamus" className="brand-logo brand-logo--hero" src={logo} />
            </div>
            <div className="asset-slot">
              <span>Marca del sistema</span>
              <small>Nombre visible: pronostidamus</small>
            </div>
          </div>
        </div>
        <Outlet />
      </div>
    </div>
  )
}
