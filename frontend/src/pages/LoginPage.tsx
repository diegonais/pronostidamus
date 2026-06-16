import { useState } from 'react'
import type { FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { apiClient } from '../api/apiClient'
import { SectionCard } from '../components/SectionCard'
import { getApiErrorMessage } from '../context/authErrors'
import { useAuth } from '../context/useAuth'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage('')

    if (!username.trim() || !password.trim()) {
      setErrorMessage('Ingresa usuario y password para continuar.')
      return
    }

    try {
      setIsSubmitting(true)

      await login({
        username: username.trim(),
        password,
      })

      const nextPath = (location.state as { from?: { pathname?: string } } | null)?.from
        ?.pathname
      navigate(nextPath || '/', { replace: true })
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <SectionCard
      title="Iniciar sesion"
      description="Usa tus credenciales del MVP para obtener un JWT y entrar a las rutas privadas."
    >
      <form className="form-grid" onSubmit={handleSubmit}>
        <label className="field">
          <span>Usuario</span>
          <input
            autoComplete="username"
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Ej. diego"
            disabled={isSubmitting}
            type="text"
            value={username}
          />
        </label>

        <label className="field">
          <span>Password</span>
          <input
            autoComplete="current-password"
            onChange={(event) => setPassword(event.target.value)}
            disabled={isSubmitting}
            placeholder="Password"
            type="password"
            value={password}
          />
        </label>

        {errorMessage ? <p className="form-error">{errorMessage}</p> : null}

        <div className="inline-note">
          <strong>API base:</strong> <code>{apiClient.baseUrl}</code>
        </div>

        <button className="button" type="submit">
          {isSubmitting ? 'Ingresando...' : 'Entrar'}
        </button>
      </form>
    </SectionCard>
  )
}
