import type { AuthUser } from './session'

export type RoomSummary = {
  id: string
  name: string
  code: string
  isActive: boolean
  createdByUserId: string
  createdAt: string
  updatedAt: string
}

export type RoomMember = {
  id: string
  joinedAt: string
  user: AuthUser
}

export type RoomDetail = RoomSummary & {
  members: RoomMember[]
}
