import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import { ApiError, apiClient } from '../api/apiClient'
import { SectionCard } from '../components/SectionCard'
import { StatusBadge } from '../components/StatusBadge'
import { useAuth } from '../context/useAuth'
import type {
  AdminUserResponse,
  FinishedMatchesCalculationResponse,
  MatchPointsCalculationResponse,
  UpdateMatchResultPayload,
} from '../types/admin'
import type { MatchResponse, MatchStatus } from '../types/match'
import type { RoomSummary } from '../types/room'
import type { UserRole } from '../types/session'

type MatchResultDraft = {
  homeScore: string
  awayScore: string
  status: MatchStatus
}

type MatchFeedback = {
  success: string | null
  error: string | null
}

const availableRoles: UserRole[] = ['user', 'admin']

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('es-BO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function getMatchStatusTone(status: MatchStatus) {
  if (status === 'finished') {
    return 'success'
  }

  if (status === 'live' || status === 'cancelled') {
    return 'warning'
  }

  return 'neutral'
}

function getMatchStatusLabel(status: MatchStatus) {
  if (status === 'scheduled') {
    return 'Programado'
  }

  if (status === 'live') {
    return 'En juego'
  }

  if (status === 'finished') {
    return 'Finalizado'
  }

  return 'Cancelado'
}

function buildResultDrafts(matches: MatchResponse[]) {
  return matches.reduce<Record<string, MatchResultDraft>>((accumulator, match) => {
    accumulator[match.id] = {
      homeScore: match.homeScore === null ? '' : String(match.homeScore),
      awayScore: match.awayScore === null ? '' : String(match.awayScore),
      status: match.status,
    }

    return accumulator
  }, {})
}

function getErrorMessage(error: unknown, fallbackMessage: string) {
  if (error instanceof ApiError) {
    return error.message
  }

  if (error instanceof Error) {
    return error.message
  }

  return fallbackMessage
}

export function AdminPage() {
  const { refreshUser, user } = useAuth()
  const [users, setUsers] = useState<AdminUserResponse[]>([])
  const [rooms, setRooms] = useState<RoomSummary[]>([])
  const [matches, setMatches] = useState<MatchResponse[]>([])
  const [matchDrafts, setMatchDrafts] = useState<Record<string, MatchResultDraft>>({})
  const [matchFeedbackById, setMatchFeedbackById] = useState<Record<string, MatchFeedback>>({})
  const [pageError, setPageError] = useState<string | null>(null)
  const [pageSuccess, setPageSuccess] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingUserId, setIsSavingUserId] = useState<string | null>(null)
  const [isSavingMatchId, setIsSavingMatchId] = useState<string | null>(null)
  const [isRecalculatingAll, setIsRecalculatingAll] = useState(false)

  useEffect(() => {
    let isMounted = true

    const loadAdminData = async () => {
      setIsLoading(true)
      setPageError(null)

      try {
        const [usersResponse, roomsResponse, matchesResponse] = await Promise.all([
          apiClient.get<AdminUserResponse[]>('/admin/users'),
          apiClient.get<RoomSummary[]>('/rooms/my'),
          apiClient.get<MatchResponse[]>('/matches'),
        ])

        if (!isMounted) {
          return
        }

        setUsers(usersResponse)
        setRooms(roomsResponse)
        setMatches(matchesResponse)
        setMatchDrafts(buildResultDrafts(matchesResponse))
      } catch (error) {
        if (!isMounted) {
          return
        }

        setPageError(getErrorMessage(error, 'No se pudo cargar la informacion administrativa.'))
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadAdminData()

    return () => {
      isMounted = false
    }
  }, [])

  const finishedMatchesCount = useMemo(
    () => matches.filter((match) => match.status === 'finished').length,
    [matches],
  )

  const handleRoleToggle =
    (targetUser: AdminUserResponse, role: UserRole) => async (event: ChangeEvent<HTMLInputElement>) => {
      const nextRoles = event.target.checked
        ? [...targetUser.roles, role]
        : targetUser.roles.filter((currentRole) => currentRole !== role)

      if (nextRoles.length === 0) {
        setPageError('Cada usuario debe conservar al menos un rol.')
        setPageSuccess(null)
        return
      }

      setIsSavingUserId(targetUser.id)
      setPageError(null)
      setPageSuccess(null)

      try {
        const updatedUser = await apiClient.patch<AdminUserResponse>(`/admin/users/${targetUser.id}`, {
          roles: nextRoles,
        })

        setUsers((currentUsers) =>
          currentUsers.map((currentUser) => (currentUser.id === updatedUser.id ? updatedUser : currentUser)),
        )

        if (targetUser.id === user?.id) {
          await refreshUser()
        }

        setPageSuccess(`Roles actualizados para ${updatedUser.username}.`)
      } catch (error) {
        setPageError(getErrorMessage(error, 'No se pudieron actualizar los roles del usuario.'))
      } finally {
        setIsSavingUserId(null)
      }
    }

  const handleUserStatusChange =
    (targetUser: AdminUserResponse, action: 'enable' | 'disable') => async () => {
      setIsSavingUserId(targetUser.id)
      setPageError(null)
      setPageSuccess(null)

      try {
        const updatedUser = await apiClient.patch<AdminUserResponse>(
          `/admin/users/${targetUser.id}/${action}`,
        )

        setUsers((currentUsers) =>
          currentUsers.map((currentUser) => (currentUser.id === updatedUser.id ? updatedUser : currentUser)),
        )

        if (targetUser.id === user?.id) {
          await refreshUser()
        }

        setPageSuccess(
          action === 'enable'
            ? `Usuario ${updatedUser.username} habilitado correctamente.`
            : `Usuario ${updatedUser.username} deshabilitado correctamente.`,
        )
      } catch (error) {
        setPageError(getErrorMessage(error, 'No se pudo actualizar el estado del usuario.'))
      } finally {
        setIsSavingUserId(null)
      }
    }

  const handleMatchDraftChange =
    (matchId: string, field: keyof MatchResultDraft) =>
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const nextValue = event.target.value

      setMatchDrafts((currentDrafts) => ({
        ...currentDrafts,
        [matchId]: {
          homeScore: currentDrafts[matchId]?.homeScore ?? '',
          awayScore: currentDrafts[matchId]?.awayScore ?? '',
          status: currentDrafts[matchId]?.status ?? 'scheduled',
          [field]: nextValue,
        },
      }))

      setMatchFeedbackById((currentFeedback) => ({
        ...currentFeedback,
        [matchId]: {
          success: null,
          error: null,
        },
      }))
    }

  const handleMatchResultSubmit = (match: MatchResponse) => async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const currentDraft = matchDrafts[match.id]

    if (!currentDraft || currentDraft.homeScore === '' || currentDraft.awayScore === '') {
      setMatchFeedbackById((currentFeedback) => ({
        ...currentFeedback,
        [match.id]: {
          success: null,
          error: 'Completa ambos marcadores antes de guardar el resultado.',
        },
      }))
      return
    }

    const homeScore = Number(currentDraft.homeScore)
    const awayScore = Number(currentDraft.awayScore)

    if (
      !Number.isInteger(homeScore) ||
      !Number.isInteger(awayScore) ||
      homeScore < 0 ||
      awayScore < 0
    ) {
      setMatchFeedbackById((currentFeedback) => ({
        ...currentFeedback,
        [match.id]: {
          success: null,
          error: 'Los resultados deben ser enteros iguales o mayores a cero.',
        },
      }))
      return
    }

    const payload: UpdateMatchResultPayload = {
      homeScore,
      awayScore,
      status: currentDraft.status,
    }

    setIsSavingMatchId(match.id)
    setPageError(null)
    setPageSuccess(null)

    try {
      const updatedMatch = await apiClient.patch<MatchResponse>(`/admin/matches/${match.id}/result`, payload)

      setMatches((currentMatches) =>
        currentMatches.map((currentMatch) => (currentMatch.id === updatedMatch.id ? updatedMatch : currentMatch)),
      )
      setMatchDrafts((currentDrafts) => ({
        ...currentDrafts,
        [match.id]: {
          homeScore: String(updatedMatch.homeScore ?? ''),
          awayScore: String(updatedMatch.awayScore ?? ''),
          status: updatedMatch.status,
        },
      }))
      setMatchFeedbackById((currentFeedback) => ({
        ...currentFeedback,
        [match.id]: {
          success: 'Resultado actualizado correctamente.',
          error: null,
        },
      }))
    } catch (error) {
      setMatchFeedbackById((currentFeedback) => ({
        ...currentFeedback,
        [match.id]: {
          success: null,
          error: getErrorMessage(error, 'No se pudo actualizar el resultado.'),
        },
      }))
    } finally {
      setIsSavingMatchId(null)
    }
  }

  const handleRecalculateMatch = (matchId: string) => async () => {
    setIsSavingMatchId(matchId)
    setPageError(null)
    setPageSuccess(null)

    try {
      const response = await apiClient.post<MatchPointsCalculationResponse>(
        `/admin/matches/${matchId}/calculate-points`,
      )

      setMatchFeedbackById((currentFeedback) => ({
        ...currentFeedback,
        [matchId]: {
          success: `Puntos recalculados para ${response.processedPredictions} pronosticos.`,
          error: null,
        },
      }))
    } catch (error) {
      setMatchFeedbackById((currentFeedback) => ({
        ...currentFeedback,
        [matchId]: {
          success: null,
          error: getErrorMessage(error, 'No se pudieron recalcular los puntos del partido.'),
        },
      }))
    } finally {
      setIsSavingMatchId(null)
    }
  }

  const handleRecalculateAll = async () => {
    setIsRecalculatingAll(true)
    setPageError(null)
    setPageSuccess(null)

    try {
      const response = await apiClient.post<FinishedMatchesCalculationResponse>(
        '/admin/matches/calculate-points',
      )

      setPageSuccess(
        `Recalculo completado para ${response.processedMatches} partidos finalizados y ${response.results.reduce((total, result) => total + result.processedPredictions, 0)} pronosticos.`,
      )
    } catch (error) {
      setPageError(getErrorMessage(error, 'No se pudieron recalcular los puntos globales.'))
    } finally {
      setIsRecalculatingAll(false)
    }
  }

  return (
    <div className="admin-page">
      <SectionCard
        title="Panel admin"
        description="Gestion de usuarios, salas visibles, partidos y recalculo de puntos usando endpoints reales del backend."
      >
        <div className="stats-grid admin-summary-grid">
          <article className="stat-card">
            <span>Usuarios</span>
            <strong>{users.length}</strong>
            <small>{users.filter((currentUser) => currentUser.isActive).length} activos</small>
          </article>

          <article className="stat-card">
            <span>Salas visibles</span>
            <strong>{rooms.length}</strong>
            <small>Se listan desde tu membresia actual.</small>
          </article>

          <article className="stat-card">
            <span>Partidos finalizados</span>
            <strong>{finishedMatchesCount}</strong>
            <small>{matches.length} partidos totales cargados.</small>
          </article>
        </div>

        {isLoading ? <p className="inline-note">Cargando datos administrativos...</p> : null}
        {pageError ? <p className="form-error">{pageError}</p> : null}
        {pageSuccess ? <p className="success-note">{pageSuccess}</p> : null}
      </SectionCard>

      <SectionCard
        title="Usuarios"
        description="Activa o desactiva usuarios y ajusta sus roles cuando el backend lo permite."
      >
        {!isLoading && users.length === 0 ? (
          <p className="inline-note">No hay usuarios disponibles para administrar.</p>
        ) : null}

        <div className="admin-users-list">
          {users.map((currentUser) => {
            const isSaving = isSavingUserId === currentUser.id

            return (
              <article className="admin-card" key={currentUser.id}>
                <div className="admin-card__header">
                  <div>
                    <strong>{currentUser.username}</strong>
                    <p>Actualizado: {formatDateTime(currentUser.updatedAt)}</p>
                  </div>
                  <StatusBadge tone={currentUser.isActive ? 'success' : 'warning'}>
                    {currentUser.isActive ? 'Habilitado' : 'Deshabilitado'}
                  </StatusBadge>
                </div>

                <div className="admin-roles">
                  {availableRoles.map((role) => (
                    <label className="checkbox-field" key={`${currentUser.id}-${role}`}>
                      <input
                        checked={currentUser.roles.includes(role)}
                        disabled={isSaving}
                        onChange={handleRoleToggle(currentUser, role)}
                        type="checkbox"
                      />
                      <span>{role}</span>
                    </label>
                  ))}
                </div>

                <div className="admin-actions-row">
                  <button
                    className="button button--ghost"
                    disabled={isSaving || currentUser.isActive}
                    onClick={handleUserStatusChange(currentUser, 'enable')}
                    type="button"
                  >
                    {isSaving ? 'Guardando...' : 'Habilitar'}
                  </button>

                  <button
                    className="button button--ghost"
                    disabled={isSaving || !currentUser.isActive}
                    onClick={handleUserStatusChange(currentUser, 'disable')}
                    type="button"
                  >
                    {isSaving ? 'Guardando...' : 'Deshabilitar'}
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      </SectionCard>

      <SectionCard
        title="Salas"
        description="Vista simple de salas obtenidas desde el backend. No se agrega gestion avanzada mientras no exista soporte adicional."
      >
        {!isLoading && rooms.length === 0 ? (
          <p className="inline-note">No hay salas visibles para el usuario administrador actual.</p>
        ) : null}

        <div className="admin-rooms-list">
          {rooms.map((room) => (
            <article className="admin-card" key={room.id}>
              <div className="admin-card__header">
                <div>
                  <strong>{room.name}</strong>
                  <p>Codigo: {room.code}</p>
                </div>
                <StatusBadge tone={room.isActive ? 'success' : 'warning'}>
                  {room.isActive ? 'Activa' : 'Inactiva'}
                </StatusBadge>
              </div>
            </article>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="Partidos y resultados"
        description="Actualiza marcadores reales, marca estados y recalcula puntos por partido o de todos los finalizados."
      >
        <div className="admin-toolbar">
          <button
            className="button"
            disabled={isLoading || isRecalculatingAll || matches.length === 0}
            onClick={handleRecalculateAll}
            type="button"
          >
            {isRecalculatingAll ? 'Recalculando...' : 'Recalcular partidos finalizados'}
          </button>
        </div>

        {!isLoading && matches.length === 0 ? (
          <p className="inline-note">No hay partidos disponibles para administrar.</p>
        ) : null}

        <div className="admin-matches-list">
          {matches.map((match) => {
            const currentDraft = matchDrafts[match.id] ?? {
              homeScore: '',
              awayScore: '',
              status: match.status,
            }
            const feedback = matchFeedbackById[match.id]
            const isSaving = isSavingMatchId === match.id

            return (
              <article className="admin-card" key={match.id}>
                <div className="admin-card__header">
                  <div>
                    <strong>
                      {match.homeTeam.name} vs {match.awayTeam.name}
                    </strong>
                    <p>
                      {match.groupName} | {match.round} | {formatDateTime(match.matchDate)}
                    </p>
                  </div>
                  <StatusBadge tone={getMatchStatusTone(match.status)}>
                    {getMatchStatusLabel(match.status)}
                  </StatusBadge>
                </div>

                <form className="admin-match-form" onSubmit={handleMatchResultSubmit(match)}>
                  <div className="admin-match-form__scores">
                    <label className="field">
                      <span>{match.homeTeam.shortName}</span>
                      <input
                        min="0"
                        disabled={isSaving}
                        inputMode="numeric"
                        onChange={handleMatchDraftChange(match.id, 'homeScore')}
                        type="number"
                        value={currentDraft.homeScore}
                      />
                    </label>

                    <label className="field">
                      <span>{match.awayTeam.shortName}</span>
                      <input
                        min="0"
                        disabled={isSaving}
                        inputMode="numeric"
                        onChange={handleMatchDraftChange(match.id, 'awayScore')}
                        type="number"
                        value={currentDraft.awayScore}
                      />
                    </label>

                    <label className="field">
                      <span>Estado</span>
                      <select
                        className="select-field"
                        disabled={isSaving}
                        onChange={handleMatchDraftChange(match.id, 'status')}
                        value={currentDraft.status}
                      >
                        <option value="scheduled">scheduled</option>
                        <option value="live">live</option>
                        <option value="finished">finished</option>
                        <option value="cancelled">cancelled</option>
                      </select>
                    </label>
                  </div>

                  <div className="admin-actions-row">
                    <button className="button" disabled={isSaving} type="submit">
                      {isSaving ? 'Guardando...' : 'Guardar resultado'}
                    </button>

                    <button
                      className="button button--ghost"
                      disabled={isSaving}
                      onClick={handleRecalculateMatch(match.id)}
                      type="button"
                    >
                      {isSaving ? 'Procesando...' : 'Recalcular puntos'}
                    </button>
                  </div>

                  {feedback?.error ? <p className="form-error">{feedback.error}</p> : null}
                  {feedback?.success ? <p className="success-note">{feedback.success}</p> : null}
                </form>
              </article>
            )
          })}
        </div>
      </SectionCard>
    </div>
  )
}
