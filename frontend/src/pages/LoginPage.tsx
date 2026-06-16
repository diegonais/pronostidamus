import { useState } from 'react'
import type { FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { SectionCard } from '../components/SectionCard'
import { apiClient } from '../api/apiClient'
import { createSession } from '../types/session'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!username.trim() || !password.trim()) {
      setErrorMessage('Ingresa usuario y password para continuar.')
      return
    }

    createSession({
      token: 'frontend-base-token',
      username: username.trim(),
      roles: username.trim().toLowerCase() === 'diego' ? ['user', 'admin'] : ['user'],
    })

    const nextPath = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname
    navigate(nextPath || '/', { replace: true })
  }

  return (
    <SectionCard
      title="Iniciar sesion"
      description="La integracion con el endpoint real de auth queda preparada para el siguiente paso."
    >
      <form className="form-grid" onSubmit={handleSubmit}>
        <label className="field">
          <span>Usuario</span>
          <input
            autoComplete="username"
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Ej. diego"
            type="text"
            value={username}
          />
        </label>

        <label className="field">
          <span>Password</span>
          <input
            autoComplete="current-password"
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password del MVP"
            type="password"
            value={password}
          />
        </label>

        {errorMessage ? <p className="form-error">{errorMessage}</p> : null}

        <div className="inline-note">
          <strong>API base:</strong> <code>{apiClient.baseUrl}</code>
        </div>

        <button className="button" type="submit">
          Entrar
        </button>
      </form>
    </SectionCard>
  )
}
