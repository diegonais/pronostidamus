import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import { ApiError, apiClient } from '../api/apiClient'
import { SectionCard } from '../components/SectionCard'
import { StatusBadge } from '../components/StatusBadge'
import { useActiveRoom } from '../hooks/useActiveRoom'
import type { MatchResponse, MatchStatus } from '../types/match'
import type { PredictionResponse } from '../types/prediction'

type PredictionDraft = {
  predictedHomeScore: string
  predictedAwayScore: string
}

type SaveFeedback = {
  isSaving: boolean
  error: string | null
  success: string | null
}

function formatMatchDate(matchDate: string) {
  return new Intl.DateTimeFormat('es-BO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(matchDate))
}

function formatDeadline(matchDate: string) {
  return new Intl.DateTimeFormat('es-BO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(new Date(matchDate).getTime() - 5 * 60 * 1000))
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

function isPredictionClosed(match: MatchResponse) {
  if (match.status !== 'scheduled') {
    return true
  }

  const deadline = new Date(match.matchDate).getTime() - 5 * 60 * 1000
  return Date.now() >= deadline
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return 'No se pudieron cargar los partidos.'
}

function buildPredictionsMap(predictions: PredictionResponse[]) {
  return predictions.reduce<Record<string, PredictionResponse>>((accumulator, prediction) => {
    accumulator[prediction.matchId] = prediction
    return accumulator
  }, {})
}

function buildDrafts(predictions: PredictionResponse[]) {
  return predictions.reduce<Record<string, PredictionDraft>>((accumulator, prediction) => {
    accumulator[prediction.matchId] = {
      predictedHomeScore: String(prediction.predictedHomeScore),
      predictedAwayScore: String(prediction.predictedAwayScore),
    }
    return accumulator
  }, {})
}

export function MatchesPage() {
  const { activeRoom, error: roomError, isLoading: isLoadingRoom } = useActiveRoom()
  const [matches, setMatches] = useState<MatchResponse[]>([])
  const [predictionsByMatchId, setPredictionsByMatchId] = useState<Record<string, PredictionResponse>>({})
  const [drafts, setDrafts] = useState<Record<string, PredictionDraft>>({})
  const [feedbackByMatchId, setFeedbackByMatchId] = useState<Record<string, SaveFeedback>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!activeRoom) {
      return
    }

    let isMounted = true

    const loadPageData = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const [matchesResponse, predictionsResponse] = await Promise.all([
          apiClient.get<MatchResponse[]>('/matches'),
          apiClient.get<PredictionResponse[]>(`/rooms/${activeRoom.id}/predictions/my`),
        ])

        if (!isMounted) {
          return
        }

        setMatches(matchesResponse)
        setPredictionsByMatchId(buildPredictionsMap(predictionsResponse))
        setDrafts(buildDrafts(predictionsResponse))
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

    void loadPageData()

    return () => {
      isMounted = false
    }
  }, [activeRoom])

  const handleDraftChange =
    (matchId: string, field: keyof PredictionDraft) => (event: ChangeEvent<HTMLInputElement>) => {
      const nextValue = event.target.value

      setDrafts((currentDrafts) => ({
        ...currentDrafts,
        [matchId]: {
          predictedHomeScore: currentDrafts[matchId]?.predictedHomeScore ?? '',
          predictedAwayScore: currentDrafts[matchId]?.predictedAwayScore ?? '',
          [field]: nextValue,
        },
      }))

      setFeedbackByMatchId((currentFeedback) => ({
        ...currentFeedback,
        [matchId]: {
          isSaving: false,
          error: null,
          success: null,
        },
      }))
    }

  const handleSubmit = (match: MatchResponse) => async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!activeRoom) {
      return
    }

    const currentDraft = drafts[match.id]
    const hasExistingPrediction = Boolean(predictionsByMatchId[match.id])

    if (!currentDraft?.predictedHomeScore || !currentDraft?.predictedAwayScore) {
      setFeedbackByMatchId((currentFeedback) => ({
        ...currentFeedback,
        [match.id]: {
          isSaving: false,
          error: 'Completa ambos marcadores para guardar el pronostico.',
          success: null,
        },
      }))
      return
    }

    const predictedHomeScore = Number(currentDraft.predictedHomeScore)
    const predictedAwayScore = Number(currentDraft.predictedAwayScore)

    if (
      !Number.isInteger(predictedHomeScore) ||
      !Number.isInteger(predictedAwayScore) ||
      predictedHomeScore < 0 ||
      predictedAwayScore < 0
    ) {
      setFeedbackByMatchId((currentFeedback) => ({
        ...currentFeedback,
        [match.id]: {
          isSaving: false,
          error: 'Los marcadores deben ser enteros iguales o mayores a cero.',
          success: null,
        },
      }))
      return
    }

    setFeedbackByMatchId((currentFeedback) => ({
      ...currentFeedback,
      [match.id]: {
        isSaving: true,
        error: null,
        success: null,
      },
    }))

    try {
      const payload = {
        predictedHomeScore,
        predictedAwayScore,
      }

      const response = hasExistingPrediction
        ? await apiClient.patch<PredictionResponse>(
            `/rooms/${activeRoom.id}/matches/${match.id}/prediction`,
            payload,
          )
        : await apiClient.post<PredictionResponse>(
            `/rooms/${activeRoom.id}/matches/${match.id}/prediction`,
            payload,
          )

      setPredictionsByMatchId((currentPredictions) => ({
        ...currentPredictions,
        [match.id]: response,
      }))
      setDrafts((currentDrafts) => ({
        ...currentDrafts,
        [match.id]: {
          predictedHomeScore: String(response.predictedHomeScore),
          predictedAwayScore: String(response.predictedAwayScore),
        },
      }))
      setFeedbackByMatchId((currentFeedback) => ({
        ...currentFeedback,
        [match.id]: {
          isSaving: false,
          error: null,
          success: hasExistingPrediction
            ? 'Pronostico actualizado correctamente.'
            : 'Pronostico registrado correctamente.',
        },
      }))
    } catch (error) {
      setFeedbackByMatchId((currentFeedback) => ({
        ...currentFeedback,
        [match.id]: {
          isSaving: false,
          error:
            error instanceof ApiError
              ? error.message
              : 'No se pudo guardar el pronostico.',
          success: null,
        },
      }))
    }
  }

  const hasPredictions = Object.keys(predictionsByMatchId).length > 0

  return (
    <SectionCard
      title="Partidos"
      description="Consulta los encuentros de la sala activa y registra tus pronosticos antes del cierre."
    >
      {isLoadingRoom ? <p className="inline-note">Cargando sala activa...</p> : null}
      {roomError ? <p className="form-error">{roomError}</p> : null}

      {!isLoadingRoom && !roomError && !activeRoom ? (
        <p className="inline-note">No tienes una sala activa disponible para pronosticar.</p>
      ) : null}

      {activeRoom ? (
        <div className="room-banner">
          <div>
            <span className="room-banner__label">Sala activa</span>
            <strong>{activeRoom.name}</strong>
          </div>
          <StatusBadge tone={activeRoom.isActive ? 'success' : 'warning'}>
            {activeRoom.isActive ? 'Habilitada' : 'Inactiva'}
          </StatusBadge>
        </div>
      ) : null}

      {isLoading ? <p className="inline-note">Cargando partidos y pronosticos...</p> : null}
      {error ? <p className="form-error">{error}</p> : null}

      {!isLoading && !error && activeRoom && !hasPredictions ? (
        <p className="inline-note">
          Aun no registraste pronosticos en esta sala. Puedes cargar el primero desde cualquier
          partido abierto.
        </p>
      ) : null}

      {!isLoading && !error && matches.length === 0 ? (
        <p className="inline-note">No hay partidos cargados todavia.</p>
      ) : null}

      <div className="matches-list">
        {matches.map((match) => {
          const prediction = predictionsByMatchId[match.id]
          const draft = drafts[match.id] ?? {
            predictedHomeScore: '',
            predictedAwayScore: '',
          }
          const feedback = feedbackByMatchId[match.id] ?? {
            isSaving: false,
            error: null,
            success: null,
          }
          const isClosed = isPredictionClosed(match)
          const isDisabled = isClosed || feedback.isSaving

          return (
            <article className="match-card" key={match.id}>
              <div className="match-card__header">
                <div>
                  <strong>
                    {match.homeTeam.name} vs {match.awayTeam.name}
                  </strong>
                  <p>
                    {match.groupName} · {match.round}
                  </p>
                </div>
                <StatusBadge tone={getMatchStatusTone(match.status)}>
                  {getMatchStatusLabel(match.status)}
                </StatusBadge>
              </div>

              <div className="match-card__meta">
                <span>Fecha: {formatMatchDate(match.matchDate)}</span>
                <span>Venue: {match.venue ?? 'Por definir'}</span>
                <span>
                  Resultado:{' '}
                  {match.homeScore !== null && match.awayScore !== null
                    ? `${match.homeScore} - ${match.awayScore}`
                    : 'Pendiente'}
                </span>
              </div>

              <form className="prediction-form" onSubmit={handleSubmit(match)}>
                <div className="prediction-form__scores">
                  <label className="field">
                    <span>{match.homeTeam.shortName}</span>
                    <input
                      min="0"
                      disabled={isDisabled}
                      inputMode="numeric"
                      onChange={handleDraftChange(match.id, 'predictedHomeScore')}
                      type="number"
                      value={draft.predictedHomeScore}
                    />
                  </label>

                  <label className="field">
                    <span>{match.awayTeam.shortName}</span>
                    <input
                      min="0"
                      disabled={isDisabled}
                      inputMode="numeric"
                      onChange={handleDraftChange(match.id, 'predictedAwayScore')}
                      type="number"
                      value={draft.predictedAwayScore}
                    />
                  </label>
                </div>

                {prediction ? (
                  <p className="inline-note">
                    Tu pronostico actual: {prediction.predictedHomeScore} -{' '}
                    {prediction.predictedAwayScore}
                  </p>
                ) : null}

                {match.status === 'finished' && prediction ? (
                  <p className="inline-note">
                    Puntos obtenidos:{' '}
                    {prediction.points === null ? 'pendientes de calcular' : prediction.points}
                  </p>
                ) : null}

                {isClosed ? (
                  <p className="inline-note">
                    Pronostico cerrado. El cierre fue a las {formatDeadline(match.matchDate)}.
                  </p>
                ) : (
                  <button className="button" disabled={feedback.isSaving} type="submit">
                    {feedback.isSaving
                      ? 'Guardando...'
                      : prediction
                        ? 'Actualizar pronostico'
                        : 'Guardar pronostico'}
                  </button>
                )}

                {feedback.error ? <p className="form-error">{feedback.error}</p> : null}
                {feedback.success ? <p className="success-note">{feedback.success}</p> : null}
              </form>
            </article>
          )
        })}
      </div>
    </SectionCard>
  )
}
