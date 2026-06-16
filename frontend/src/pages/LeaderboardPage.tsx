import { useEffect, useState } from 'react'
import { apiClient } from '../api/apiClient'
import { SectionCard } from '../components/SectionCard'
import { useActiveRoom } from '../hooks/useActiveRoom'
import type { LeaderboardEntry } from '../types/leaderboard'

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return 'No se pudo cargar el leaderboard.'
}

export function LeaderboardPage() {
  const { activeRoom, error: roomError, isLoading: isLoadingRoom } = useActiveRoom()
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!activeRoom) {
      return
    }

    let isMounted = true

    const loadLeaderboard = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await apiClient.get<LeaderboardEntry[]>(
          `/rooms/${activeRoom.id}/leaderboard`,
        )

        if (!isMounted) {
          return
        }

        setEntries(response)
      } catch (error) {
        if (!isMounted) {
          return
        }

        setError(getErrorMessage(error))
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadLeaderboard()

    return () => {
      isMounted = false
    }
  }, [activeRoom])

  const hasPredictions = entries.some((entry) => entry.totalPredictions > 0)

  return (
    <SectionCard
      title="Tabla de posiciones"
      description="Ranking ordenado por puntos, exactos, simples y username alfabetico."
    >
      {isLoadingRoom ? <p className="inline-note">Cargando sala activa...</p> : null}
      {roomError ? <p className="form-error">{roomError}</p> : null}

      {!isLoadingRoom && !roomError && !activeRoom ? (
        <p className="inline-note">No tienes una sala activa para consultar el leaderboard.</p>
      ) : null}

      {activeRoom ? (
        <div className="room-banner">
          <div>
            <span className="room-banner__label">Sala activa</span>
            <strong>{activeRoom.name}</strong>
          </div>
          <span className="inline-note">{activeRoom.code}</span>
        </div>
      ) : null}

      {isLoading ? <p className="inline-note">Cargando tabla de posiciones...</p> : null}
      {error ? <p className="form-error">{error}</p> : null}

      {!isLoading && !error && entries.length === 0 ? (
        <p className="inline-note">No hay usuarios o puntajes disponibles para esta sala.</p>
      ) : null}

      {!isLoading && !error && entries.length > 0 && !hasPredictions ? (
        <p className="inline-note">
          Aun no hay pronosticos registrados en esta sala. La tabla muestra a los usuarios con
          puntaje inicial en cero.
        </p>
      ) : null}

      {entries.length > 0 ? (
        <div className="leaderboard-table-wrapper">
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th>Posicion</th>
                <th>Usuario</th>
                <th>Puntos</th>
                <th>Exactos</th>
                <th>Simples</th>
                <th>Fallidos</th>
                <th>Total pronosticos</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, index) => (
                <tr key={entry.userId}>
                  <td>{index + 1}</td>
                  <td>{entry.username}</td>
                  <td>{entry.totalPoints}</td>
                  <td>{entry.exactHits}</td>
                  <td>{entry.simpleHits}</td>
                  <td>{entry.failedPredictions}</td>
                  <td>{entry.totalPredictions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </SectionCard>
  )
}
