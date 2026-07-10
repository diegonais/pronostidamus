export enum UserRole {
  ADMIN = 'ADMIN',
  USER = 'USER',
}

export enum MatchStatus {
  SCHEDULED = 'SCHEDULED',
  CLOSED = 'CLOSED',
  FINISHED = 'FINISHED',
}

export interface User {
  id: string;
  name: string;
  email: string;
  username: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RoomUser {
  id: string;
  roomId: string;
  userId: string;
  user: User;
}

export interface Room {
  id: string;
  name: string;
  isActive: boolean;
  roomUsers?: RoomUser[];
  matches?: Match[];
  createdAt: string;
  updatedAt: string;
}

export interface Team {
  id: string;
  externalId: string;
  name: string;
  nameEn: string;
  fifaCode: string | null;
  iso2: string | null;
  group: string | null;
  flagUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Match {
  id: string;
  roomId: string;
  teamAId: string | null;
  teamBId: string | null;
  teamA: string;
  teamB: string;
  matchDate: string;
  teamAScore: number | null;
  teamBScore: number | null;
  status: MatchStatus;
  isActive: boolean;
  room?: Room;
  teamAInfo?: Team | null;
  teamBInfo?: Team | null;
  predictions?: Prediction[];
  createdAt: string;
  updatedAt: string;
}

export interface Prediction {
  id: string;
  userId: string;
  matchId: string;
  predictedTeamAScore: number;
  predictedTeamBScore: number;
  points: number | null;
  isCalculated: boolean;
  user?: User;
  match?: Match;
  createdAt: string;
  updatedAt: string;
}

export interface LeaderboardItem {
  userId: string;
  username: string;
  name: string;
  points: number;
  predictionCount: number;
  exactHits: number;
  outcomeHits: number;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  message: string;
  nextPhase: string;
  user: User;
}

export interface AppError {
  message: string;
}

export interface SelectOption {
  label: string;
  value: string;
}
