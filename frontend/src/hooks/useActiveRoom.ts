import { useEffect, useState } from 'react'
import { ApiError, apiClient } from '../api/apiClient'
import type { RoomSummary } from '../types/room'

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message
  }

  return 'No se pudieron cargar las salas.'
}

function selectActiveRoom(rooms: RoomSummary[]) {
  return rooms.find((room) => room.isActive) ?? rooms[0] ?? null
}

export function useActiveRoom() {
  const [rooms, setRooms] = useState<RoomSummary[]>([])
  const [activeRoom, setActiveRoom] = useState<RoomSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const loadRooms = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const response = await apiClient.get<RoomSummary[]>('/rooms/my')

        if (!isMounted) {
          return
        }

        setRooms(response)
        setActiveRoom(selectActiveRoom(response))
      } catch (error) {
        if (!isMounted) {
          return
        }

        if (error instanceof ApiError && error.status === 401) {
          setError('Tu sesion ya no es valida. Vuelve a iniciar sesion.')
        } else {
          setError(getErrorMessage(error))
        }

        setRooms([])
        setActiveRoom(null)
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadRooms()

    return () => {
      isMounted = false
    }
  }, [])

  return {
    rooms,
    activeRoom,
    isLoading,
    error,
  }
}
