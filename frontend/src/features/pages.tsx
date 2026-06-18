import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { AppShell } from '../layout/AppShell';
import { useAuth } from '../context/AuthContext';
import { ProtectedRoute } from '../routes/ProtectedRoute';
import { matchesService, type MatchPayload } from '../services/matchesService';
import { predictionsService } from '../services/predictionsService';
import { roomsService } from '../services/roomsService';
import { extractErrorMessage } from '../services/api';
import { usersService, type UserPayload } from '../services/usersService';
import { PageHeader, StateCard, StatTile, StatusBadge } from '../components/common';
import { buildLeaderboard, getRoomMembers } from '../utils/leaderboard';
import { formatDateTime, fromDateTimeLocalValue, toDateTimeLocalValue } from '../utils/date';
import { getMatchVisualStatus, isPredictionLocked } from '../utils/predictions';
import {
  MatchStatus,
  UserRole,
  type LeaderboardItem,
  type Match,
  type Prediction,
  type Room,
  type User,
} from '../types';

type RoomDetailTab = 'matches' | 'predictions' | 'room-predictions';
type AdminRoomSection = 'overview' | 'members' | 'matches';
type AdminRoomDetailTab = 'members' | 'matches' | 'room-predictions';

function toneForMatchStatus(statusLabel: string) {
  if (statusLabel === 'Finalizado') {
    return 'info';
  }

  if (statusLabel === 'Cerrado') {
    return 'warning';
  }

  return 'success';
}

function sortMatchesByDate(matches: Match[]) {
  return [...matches].sort(
    (left, right) => new Date(left.matchDate).getTime() - new Date(right.matchDate).getTime(),
  );
}

function getMatchDayKey(matchDate: string) {
  return new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'America/La_Paz',
  }).format(new Date(matchDate));
}

function formatMatchDayLabel(matchDate: string) {
  return new Intl.DateTimeFormat('es-BO', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/La_Paz',
  }).format(new Date(matchDate));
}

function getCurrentRoomPredictions(matches: Match[], allPredictions: Record<string, Prediction[]>) {
  return matches.reduce<Record<string, Prediction[]>>((accumulator, match) => {
    accumulator[match.id] = allPredictions[match.id] ?? [];
    return accumulator;
  }, {});
}

function getUserRoomCount(rooms: Room[], userId: string) {
  return rooms.filter((room) =>
    room.roomUsers?.some((membership) => membership.userId === userId),
  ).length;
}

function useCatalogData() {
  const [users, setUsers] = useState<User[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [matchesByRoom, setMatchesByRoom] = useState<Record<string, Match[]>>({});
  const [predictionsByMatch, setPredictionsByMatch] = useState<Record<string, Prediction[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function refresh() {
    try {
      setLoading(true);
      setError('');

      const [usersResponse, roomsResponse] = await Promise.all([
        usersService.getAll(),
        roomsService.getAll(),
      ]);

      setUsers(usersResponse);
      setRooms(roomsResponse);

      const roomMatchesEntries = await Promise.all(
        roomsResponse.map(async (room) => [room.id, await matchesService.getByRoom(room.id)] as const),
      );

      const nextMatchesByRoom = Object.fromEntries(roomMatchesEntries);
      setMatchesByRoom(nextMatchesByRoom);

      const matchIds = roomMatchesEntries.flatMap(([, matches]) => matches.map((match) => match.id));
      const predictionsEntries = await Promise.all(
        matchIds.map(async (matchId) => [matchId, await predictionsService.getByMatch(matchId)] as const),
      );

      setPredictionsByMatch(Object.fromEntries(predictionsEntries));
    } catch (requestError) {
      setError(extractErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
  }, []);

  return {
    users,
    rooms,
    matchesByRoom,
    predictionsByMatch,
    loading,
    error,
    refresh,
  };
}

function SectionTable({
  headers,
  children,
}: {
  headers: string[];
  children: ReactNode;
}) {
  return (
    <div className="table-wrap">
      <table className="app-table">
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function getAccessibleRooms(rooms: Room[], currentUser: User | null) {
  if (currentUser?.role === UserRole.ADMIN) {
    return rooms;
  }

  return rooms.filter((room) =>
    room.roomUsers?.some((membership) => membership.userId === currentUser?.id),
  );
}

function LoginPage() {
  const { currentUser, login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (currentUser) {
    return <Navigate to="/user" replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setLoading(true);
      setError('');
      await login(form);
      navigate('/user', { replace: true });
    } catch (loginError) {
      setError(extractErrorMessage(loginError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-screen">
      <section className="auth-card">
        <div className="auth-brand">
          <img src="/ball.png" alt="Balon oficial" />
          <img src="/pronostidamus.png" alt="Pronostidamus" />
        </div>

        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            Username
            <input
              value={form.username}
              onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))}
              required
              minLength={3}
            />
          </label>
          <label>
            Contrasena
            <input
              type="password"
              value={form.password}
              onChange={(event) =>
                setForm((current) => ({ ...current, password: event.target.value }))
              }
              required
              minLength={6}
            />
          </label>
          {error ? <StateCard tone="error">{error}</StateCard> : null}
          <button className="primary-button" disabled={loading} type="submit">
            {loading ? 'Validando...' : 'Entrar'}
          </button>
        </form>

      </section>
    </div>
  );
}

function AdminDashboardPage() {
  const { rooms, matchesByRoom, predictionsByMatch, users, loading, error } = useCatalogData();
  const matches = Object.values(matchesByRoom).flat();
  const activeRooms = rooms.filter((room) => room.isActive).length;
  const activeUsers = users.filter((user) => user.isActive).length;
  const finishedMatches = matches.filter((match) => match.status === MatchStatus.FINISHED).length;
  const pendingMatches = matches.filter(
    (match) => getMatchVisualStatus(match.matchDate, match.status) === 'Programado',
  ).length;
  const roomSnapshots = rooms
    .map((room) => {
      const roomMatches = matchesByRoom[room.id] ?? [];
      const roomPredictions = roomMatches.flatMap((match) => predictionsByMatch[match.id] ?? []);
      return {
        room,
        matches: roomMatches.length,
        predictions: roomPredictions.length,
      };
    })
    .sort((left, right) => right.matches - left.matches || right.predictions - left.predictions);

  if (loading) {
    return <AppLoadingScreen message="Cargando datos del panel..." />;
  }

  return (
    <div className="admin-dashboard-layout">
      <section className="page-stack">
        <PageHeader
          title="Resumen admin"
          description="Un punto de control rapido para ver el estado del sistema y bajar a la sala o gestion que necesites."
        />
        {error ? <StateCard tone="error">{error}</StateCard> : null}
        <div className="stats-grid">
          <StatTile label="Usuarios activos" value={activeUsers} helper={`${users.length} registrados`} />
          <StatTile label="Salas activas" value={activeRooms} helper={`${rooms.length} creadas`} />
          <StatTile label="Partidos" value={matches.length} />
          <StatTile label="Programados" value={pendingMatches} helper={`${finishedMatches} finalizados`} />
        </div>

        <section className="panel-card">
          <PageHeader
            title="Gestion ordenada"
            description="La tabla completa ya vive dentro de cada sala. Desde aqui solo vemos senales y accesos rapidos."
          />
          <div className="admin-overview-grid">
            <article className="subsection-card compact-card">
              <h3>Usuarios</h3>
              <p className="page-description">
                Revisa estado y rol desde una lista resumida, y abre el formulario solo cuando quieras editar.
              </p>
            </article>
            <article className="subsection-card compact-card">
              <h3>Salas</h3>
              <p className="page-description">
                Cada sala se maneja por bloques: configuracion, miembros y partidos, sin mostrar todo a la vez.
              </p>
            </article>
            <article className="subsection-card compact-card">
              <h3>Tabla</h3>
              <p className="page-description">
                La lectura competitiva queda dentro de la experiencia de sala, que es donde realmente hace sentido.
              </p>
            </article>
          </div>
        </section>
      </section>

      <aside className="page-stack admin-side-column">
        <section className="panel-card">
          <PageHeader
            title="Salas con mas movimiento"
            description="Un vistazo corto para decidir en que sala entrar sin abrir una tabla enorme."
          />
          {roomSnapshots.length === 0 ? (
            <StateCard>No hay salas creadas todavia.</StateCard>
          ) : (
            <div className="admin-overview-grid">
              {roomSnapshots.slice(0, 6).map(({ room, matches: roomMatches, predictions }) => (
                <article key={room.id} className="subsection-card compact-card">
                  <div className="summary-row">
                    <h3>{room.name}</h3>
                    <StatusBadge
                      label={room.isActive ? 'Activa' : 'Deshabilitada'}
                      tone={room.isActive ? 'success' : 'muted'}
                    />
                  </div>
                  <div className="compact-metrics">
                    <span>{room.roomUsers?.length ?? 0} miembros</span>
                    <span>{roomMatches} partidos</span>
                    <span>{predictions} pronosticos</span>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </aside>
    </div>
  );
}

function AdminUsersPage() {
  const { users, rooms, loading, error, refresh } = useCatalogData();
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [feedback, setFeedback] = useState('');
  const [form, setForm] = useState<UserPayload>({
    name: '',
    username: '',
    email: '',
    password: '',
    role: UserRole.USER,
    isActive: true,
  });

  useEffect(() => {
    if (!editingUser) {
      return;
    }

    setForm({
      name: editingUser.name,
      username: editingUser.username,
      email: editingUser.email,
      password: '',
      role: editingUser.role,
      isActive: editingUser.isActive,
    });
  }, [editingUser]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      const payload: UserPayload = {
        ...form,
        ...(form.password?.trim() ? { password: form.password } : {}),
      };

      if (editingUser) {
        await usersService.update(editingUser.id, payload);
        setFeedback('Usuario actualizado correctamente.');
      } else {
        await usersService.create(payload);
        setFeedback('Usuario creado correctamente.');
      }

      setEditingUser(null);
      setForm({
        name: '',
        username: '',
        email: '',
        password: '',
        role: UserRole.USER,
        isActive: true,
      });
      await refresh();
    } catch (requestError) {
      setFeedback(extractErrorMessage(requestError));
    }
  }

  const totalAdmins = users.filter((user) => user.role === UserRole.ADMIN).length;
  const activeUsers = users.filter((user) => user.isActive).length;
  const inactiveUsers = users.length - activeUsers;

  if (loading) {
    return <AppLoadingScreen message="Cargando usuarios..." />;
  }

  return (
    <div className="admin-workspace">
      <section className="panel-card">
        <PageHeader
          title="Gestion de usuarios"
          description="Lista corta con lo esencial. El detalle completo aparece solo cuando eliges a quien editar."
          actions={
            <button
              className="secondary-button"
              type="button"
              onClick={() => {
                setEditingUser(null);
                setForm({
                  name: '',
                  username: '',
                  email: '',
                  password: '',
                  role: UserRole.USER,
                  isActive: true,
                });
              }}
            >
              Nuevo usuario
            </button>
          }
        />
        {error ? <StateCard tone="error">{error}</StateCard> : null}
        {feedback ? <StateCard tone="success">{feedback}</StateCard> : null}
        <div className="compact-metrics admin-metrics-row">
          <span>{users.length} registrados</span>
          <span>{totalAdmins} admins</span>
          <span>{activeUsers} activos</span>
          <span>{inactiveUsers} deshabilitados</span>
        </div>
        <SectionTable headers={['Usuario', 'Rol', 'Salas', 'Estado', 'Accion']}>
          {users.map((user) => (
            <tr key={user.id}>
              <td>
                <strong>{user.name}</strong>
                <div className="muted-text">@{user.username}</div>
              </td>
              <td>{user.role}</td>
              <td>{getUserRoomCount(rooms, user.id)}</td>
              <td>
                <StatusBadge
                  label={user.isActive ? 'Activo' : 'Deshabilitado'}
                  tone={user.isActive ? 'success' : 'muted'}
                />
              </td>
              <td>
                <button className="table-button" type="button" onClick={() => setEditingUser(user)}>
                  Editar
                </button>
              </td>
            </tr>
          ))}
        </SectionTable>
      </section>

      <aside className="page-stack admin-side-column">
        <section className="panel-card">
          <PageHeader
            title={editingUser ? 'Editar usuario' : 'Crear usuario'}
            description={
              editingUser
                ? 'Ajusta solo lo necesario. Dejamos la informacion extendida fuera de la tabla principal.'
                : 'Completa los datos basicos para habilitar un nuevo acceso.'
            }
          />
          {editingUser ? (
            <div className="detail-summary">
              <div>
                <span className="muted-text">Email</span>
                <strong>{editingUser.email}</strong>
              </div>
              <div>
                <span className="muted-text">Salas</span>
                <strong>{getUserRoomCount(rooms, editingUser.id)}</strong>
              </div>
            </div>
          ) : null}
          <form className="form-grid" onSubmit={handleSubmit}>
            <label>
              Nombre
              <input
                required
                minLength={2}
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
              />
            </label>
            <label>
              Username
              <input
                required
                minLength={3}
                value={form.username}
                onChange={(event) =>
                  setForm((current) => ({ ...current, username: event.target.value }))
                }
              />
            </label>
            <label>
              Email
              <input
                type="email"
                required
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              />
            </label>
            <label>
              Contrasena
              <input
                type="password"
                required={!editingUser}
                minLength={6}
                value={form.password ?? ''}
                onChange={(event) =>
                  setForm((current) => ({ ...current, password: event.target.value }))
                }
              />
            </label>
            <label>
              Rol
              <select
                value={form.role}
                onChange={(event) =>
                  setForm((current) => ({ ...current, role: event.target.value as UserRole }))
                }
              >
                <option value={UserRole.USER}>USER</option>
                <option value={UserRole.ADMIN}>ADMIN</option>
              </select>
            </label>
            <label>
              Estado
              <select
                value={String(form.isActive)}
                onChange={(event) =>
                  setForm((current) => ({ ...current, isActive: event.target.value === 'true' }))
                }
              >
                <option value="true">Activo</option>
                <option value="false">Deshabilitado</option>
              </select>
            </label>
            <button className="primary-button" type="submit">
              {editingUser ? 'Guardar cambios' : 'Crear usuario'}
            </button>
          </form>
        </section>
      </aside>
    </div>
  );
}

function AdminRoomsPage() {
  const { rooms, users, matchesByRoom, predictionsByMatch, loading, error, refresh } = useCatalogData();
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [activeSection, setActiveSection] = useState<AdminRoomSection>('overview');
  const [roomForm, setRoomForm] = useState({ name: '', isActive: true });
  const [selectedUserId, setSelectedUserId] = useState('');
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isAddMatchModalOpen, setIsAddMatchModalOpen] = useState(false);
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [feedback, setFeedback] = useState('');
  const [matchForm, setMatchForm] = useState<MatchPayload>({
    teamA: '',
    teamB: '',
    matchDate: '',
    teamAScore: null,
    teamBScore: null,
    status: MatchStatus.SCHEDULED,
    isActive: true,
  });

  useEffect(() => {
    if (!selectedRoom) {
      setRoomForm({ name: '', isActive: true });
      setActiveSection('overview');
      setSelectedUserId('');
      setIsAddUserModalOpen(false);
      setIsAddMatchModalOpen(false);
      setEditingMatch(null);
      return;
    }

    setRoomForm({ name: selectedRoom.name, isActive: selectedRoom.isActive });
    setActiveSection('overview');
  }, [selectedRoom]);

  useEffect(() => {
    if (!editingMatch) {
      setMatchForm({
        teamA: '',
        teamB: '',
        matchDate: '',
        teamAScore: null,
        teamBScore: null,
        status: MatchStatus.SCHEDULED,
        isActive: true,
      });
      return;
    }

    setMatchForm({
      teamA: editingMatch.teamA,
      teamB: editingMatch.teamB,
      matchDate: toDateTimeLocalValue(editingMatch.matchDate),
      teamAScore: editingMatch.teamAScore,
      teamBScore: editingMatch.teamBScore,
      status: editingMatch.status,
      isActive: editingMatch.isActive,
    });
  }, [editingMatch]);

  async function saveRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      if (selectedRoom) {
        await roomsService.update(selectedRoom.id, roomForm);
        setFeedback('Sala actualizada correctamente.');
      } else {
        await roomsService.create(roomForm);
        setFeedback('Sala creada correctamente.');
      }

      setSelectedRoom(null);
      await refresh();
    } catch (requestError) {
      setFeedback(extractErrorMessage(requestError));
    }
  }

  async function attachUser() {
    if (!selectedRoom || !selectedUserId) {
      return;
    }

    try {
      await roomsService.addUser(selectedRoom.id, selectedUserId);
      setSelectedUserId('');
      setFeedback('Usuario anadido a la sala.');
      await refresh();
    } catch (requestError) {
      setFeedback(extractErrorMessage(requestError));
    }
  }

  async function detachUser(roomId: string, userId: string) {
    if (!window.confirm('¿Quitar usuario de la sala?')) {
      return;
    }

    try {
      await roomsService.removeUser(roomId, userId);
      setFeedback('Usuario retirado de la sala.');
      await refresh();
    } catch (requestError) {
      setFeedback(extractErrorMessage(requestError));
    }
  }

  async function saveMatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedRoom) {
      setFeedback('Selecciona una sala para registrar partidos.');
      return;
    }

    if (matchForm.teamA.trim().toLowerCase() === matchForm.teamB.trim().toLowerCase()) {
      setFeedback('Los equipos no pueden ser iguales.');
      return;
    }

    try {
      const payload: MatchPayload = {
        ...matchForm,
        matchDate: fromDateTimeLocalValue(matchForm.matchDate),
      };

      if (editingMatch) {
        await matchesService.update(editingMatch.id, payload);
        setFeedback('Partido actualizado correctamente.');
      } else {
        await matchesService.create(selectedRoom.id, payload);
        setFeedback('Partido agregado a la sala.');
        setIsAddMatchModalOpen(false);
      }

      setEditingMatch(null);
      await refresh();
    } catch (requestError) {
      setFeedback(extractErrorMessage(requestError));
    }
  }

  const roomMatches = selectedRoom ? matchesByRoom[selectedRoom.id] ?? [] : [];
  const roomMemberIds = new Set((selectedRoom?.roomUsers ?? []).map((membership) => membership.userId));
  const availableUsers = users.filter((user) => !roomMemberIds.has(user.id));
  const isEditingMatch = Boolean(editingMatch);
  const isMatchModalOpen = isEditingMatch || isAddMatchModalOpen;
  const roomFinishedMatches = roomMatches.filter((match) => match.status === MatchStatus.FINISHED).length;

  if (loading) {
    return <AppLoadingScreen message="Cargando salas..." />;
  }

  return (
    <div className="page-stack">
      <section className="panel-card">
        <PageHeader
          title="Gestion de salas"
          description="Entra a una sala para administrarla como espacio propio: miembros, partidos y pronosticos por partido."
        />
        {error ? <StateCard tone="error">{error}</StateCard> : null}
        {feedback ? <StateCard tone="success">{feedback}</StateCard> : null}
        <SectionTable headers={['Sala', 'Estado', 'Miembros', 'Actividad', 'Accion']}>
          {rooms.map((room) => {
            const roomMatches = matchesByRoom[room.id] ?? [];
            const roomPredictions = roomMatches.flatMap((match) => predictionsByMatch[match.id] ?? []);

            return (
              <tr key={room.id}>
                <td>
                  <strong>{room.name}</strong>
                </td>
                <td>
                  <StatusBadge
                    label={room.isActive ? 'Activa' : 'Deshabilitada'}
                    tone={room.isActive ? 'success' : 'muted'}
                  />
                </td>
                <td>{room.roomUsers?.length ?? 0}</td>
                <td>
                  {roomMatches.length} partido{roomMatches.length === 1 ? '' : 's'} · {roomPredictions.length}{' '}
                  pronostico{roomPredictions.length === 1 ? '' : 's'}
                </td>
                <td>
                  <Link className="table-button" to={`/admin/rooms/${room.id}`}>
                    Gestionar
                  </Link>
                </td>
              </tr>
            );
          })}
        </SectionTable>
      </section>

      <section className="panel-card">
        <PageHeader
          title="Crear sala"
          description="Primero la creas y luego entras a gestionarla desde su propia vista."
        />
        <form className="form-grid" onSubmit={saveRoom}>
          <label>
            Nombre
            <input
              required
              minLength={2}
              value={roomForm.name}
              onChange={(event) => setRoomForm((current) => ({ ...current, name: event.target.value }))}
            />
          </label>
          <label>
            Estado
            <select
              value={String(roomForm.isActive)}
              onChange={(event) =>
                setRoomForm((current) => ({ ...current, isActive: event.target.value === 'true' }))
              }
            >
              <option value="true">Activa</option>
              <option value="false">Deshabilitada</option>
            </select>
          </label>
          <button className="primary-button" type="submit">
            Crear sala
          </button>
        </form>
      </section>
    </div>
  );

  return (
    <div className="admin-workspace">
      <section className="panel-card">
        <PageHeader
          title="Gestion de salas"
          description="Primero eliges una sala. Despues trabajas por secciones para no tener toda la informacion abierta al mismo tiempo."
          actions={
            <button className="secondary-button" type="button" onClick={() => setSelectedRoom(null)}>
              Nueva sala
            </button>
          }
        />
        {error ? <StateCard tone="error">{error}</StateCard> : null}
        {feedback ? <StateCard tone="success">{feedback}</StateCard> : null}
        <SectionTable headers={['Sala', 'Estado', 'Miembros', 'Partidos', 'Accion']}>
          {rooms.map((room) => (
            <tr key={room.id}>
              <td>
                <strong>{room.name}</strong>
              </td>
              <td>
                <StatusBadge
                  label={room.isActive ? 'Activa' : 'Deshabilitada'}
                  tone={room.isActive ? 'success' : 'muted'}
                />
              </td>
              <td>{room.roomUsers?.length ?? 0}</td>
              <td>{matchesByRoom[room.id]?.length ?? 0}</td>
              <td>
                <button className="table-button" type="button" onClick={() => setSelectedRoom(room)}>
                  Gestionar
                </button>
              </td>
            </tr>
          ))}
        </SectionTable>
      </section>

      <aside className="page-stack admin-side-column">
        <section className="panel-card">
          <PageHeader
            title={selectedRoom ? `Sala: ${selectedRoom!.name}` : 'Crear sala'}
            description={
              selectedRoom
                ? 'Configuracion centralizada con detalle por bloques.'
                : 'Crea una nueva sala y luego agrega miembros y partidos desde su gestion.'
            }
          />

        <form className="form-grid" onSubmit={saveRoom}>
          <label>
            Nombre
            <input
              required
              minLength={2}
              value={roomForm.name}
              onChange={(event) => setRoomForm((current) => ({ ...current, name: event.target.value }))}
            />
          </label>
          <label>
            Estado
            <select
              value={String(roomForm.isActive)}
              onChange={(event) =>
                setRoomForm((current) => ({ ...current, isActive: event.target.value === 'true' }))
              }
            >
              <option value="true">Activa</option>
              <option value="false">Deshabilitada</option>
            </select>
          </label>
          <button className="primary-button" type="submit">
            {selectedRoom ? 'Guardar sala' : 'Crear sala'}
          </button>
        </form>

        {selectedRoom ? (
          <>
            <div className="stats-grid compact-stats-grid">
              <StatTile label="Miembros" value={selectedRoom!.roomUsers?.length ?? 0} />
              <StatTile label="Partidos" value={roomMatches.length} />
              <StatTile label="Finalizados" value={roomFinishedMatches} />
            </div>

            <div className="tab-switcher" role="tablist" aria-label="Gestion de la sala">
              <button
                className={`tab-button ${activeSection === 'overview' ? 'active' : ''}`}
                type="button"
                onClick={() => setActiveSection('overview')}
              >
                Resumen
              </button>
              <button
                className={`tab-button ${activeSection === 'members' ? 'active' : ''}`}
                type="button"
                onClick={() => setActiveSection('members')}
              >
                Miembros
              </button>
              <button
                className={`tab-button ${activeSection === 'matches' ? 'active' : ''}`}
                type="button"
                onClick={() => setActiveSection('matches')}
              >
                Partidos
              </button>
            </div>

            {activeSection === 'overview' ? (
              <section className="subsection-card">
                <div className="subsection-heading">
                  <h3>Resumen de la sala</h3>
                  <StatusBadge
                    label={selectedRoom!.isActive ? 'Activa' : 'Deshabilitada'}
                    tone={selectedRoom!.isActive ? 'success' : 'muted'}
                  />
                </div>
                <div className="detail-summary">
                  <div>
                    <span className="muted-text">Miembros registrados</span>
                    <strong>{selectedRoom!.roomUsers?.length ?? 0}</strong>
                  </div>
                  <div>
                    <span className="muted-text">Partidos cargados</span>
                    <strong>{roomMatches.length}</strong>
                  </div>
                  <div>
                    <span className="muted-text">Pendientes o cerrados</span>
                    <strong>{roomMatches.length - roomFinishedMatches}</strong>
                  </div>
                </div>
              </section>
            ) : null}

            {activeSection === 'members' ? (
              <section className="subsection-card">
                <div className="modal-header">
                  <h3>Miembros</h3>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => {
                      setSelectedUserId('');
                      setIsAddUserModalOpen(true);
                    }}
                  >
                    Anadir usuario
                  </button>
                </div>
                {(selectedRoom!.roomUsers ?? []).length === 0 ? (
                  <StateCard>No hay miembros en esta sala todavia.</StateCard>
                ) : (
                  <SectionTable headers={['Miembro', 'Rol', 'Accion']}>
                    {(selectedRoom!.roomUsers ?? []).map((membership) => (
                      <tr key={membership.id}>
                        <td>
                          <strong>{membership.user.name}</strong>
                          <div className="muted-text">@{membership.user.username}</div>
                        </td>
                        <td>{membership.user.role}</td>
                        <td>
                          <button
                            className="table-button danger"
                            type="button"
                            onClick={() => detachUser(selectedRoom!.id, membership.user.id)}
                          >
                            Quitar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </SectionTable>
                )}
              </section>
            ) : null}

            {activeSection === 'matches' ? (
              <section className="subsection-card">
                <div className="modal-header">
                  <h3>Partidos de la sala</h3>
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => {
                      setEditingMatch(null);
                      setIsAddMatchModalOpen(true);
                    }}
                  >
                    Agregar partido
                  </button>
                </div>
                {roomMatches.length === 0 ? (
                  <StateCard>No hay partidos en esta sala.</StateCard>
                ) : (
                  <SectionTable headers={['Partido', 'Fecha Bolivia', 'Estado', 'Resultado', 'Accion']}>
                    {roomMatches.map((match) => {
                      const statusLabel = getMatchVisualStatus(match.matchDate, match.status);
                      return (
                        <tr key={match.id}>
                          <td>
                            {match.teamA} vs {match.teamB}
                          </td>
                          <td>{formatDateTime(match.matchDate)}</td>
                          <td>
                            <StatusBadge label={statusLabel} tone={toneForMatchStatus(statusLabel)} />
                          </td>
                          <td>
                            {match.teamAScore ?? '-'} : {match.teamBScore ?? '-'}
                          </td>
                          <td>
                            <button className="table-button" type="button" onClick={() => setEditingMatch(match)}>
                              Editar
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </SectionTable>
                )}
              </section>
            ) : null}
          </>
        ) : null}
        </section>
      </aside>

      {selectedRoom && isAddUserModalOpen ? (
        <div
          className="modal-backdrop"
          onClick={() => setIsAddUserModalOpen(false)}
          role="presentation"
        >
          <section
            className="modal-card"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-user-title"
          >
            <div className="modal-header">
              <div>
                <p className="eyebrow">Miembro</p>
                <h3 id="add-user-title">Anadir usuario</h3>
              </div>
              <button className="table-button" type="button" onClick={() => setIsAddUserModalOpen(false)}>
                Cerrar
              </button>
            </div>
            {availableUsers.length === 0 ? (
              <StateCard>Todos los usuarios disponibles ya pertenecen a esta sala.</StateCard>
            ) : (
              <div className="form-grid">
                <label>
                  Usuario
                  <select value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value)}>
                    <option value="">Selecciona usuario</option>
                    {availableUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} (@{user.username})
                      </option>
                    ))}
                  </select>
                </label>
                <div className="modal-actions">
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => setIsAddUserModalOpen(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    className="primary-button"
                    type="button"
                    onClick={async () => {
                      await attachUser();
                      setIsAddUserModalOpen(false);
                    }}
                    disabled={!selectedUserId}
                  >
                    Anadir usuario
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      ) : null}

      {selectedRoom && isMatchModalOpen ? (
        <div
          className="modal-backdrop"
          onClick={() => {
            setEditingMatch(null);
            setIsAddMatchModalOpen(false);
          }}
          role="presentation"
        >
          <section
            className="modal-card"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-match-title"
          >
            <div className="modal-header">
              <div>
                <p className="eyebrow">Partido</p>
                <h3 id="edit-match-title">{isEditingMatch ? 'Editar partido' : 'Agregar partido'}</h3>
              </div>
              <button
                className="table-button"
                type="button"
                onClick={() => {
                  setEditingMatch(null);
                  setIsAddMatchModalOpen(false);
                }}
              >
                Cerrar
              </button>
            </div>
            <form className="form-grid" onSubmit={saveMatch}>
              <label>
                Equipo A
                <input
                  required
                  value={matchForm.teamA}
                  onChange={(event) =>
                    setMatchForm((current) => ({ ...current, teamA: event.target.value }))
                  }
                />
              </label>
              <label>
                Equipo B
                <input
                  required
                  value={matchForm.teamB}
                  onChange={(event) =>
                    setMatchForm((current) => ({ ...current, teamB: event.target.value }))
                  }
                />
              </label>
              <label>
                Fecha y hora
                <input
                  type="datetime-local"
                  required
                  value={matchForm.matchDate}
                  onChange={(event) =>
                    setMatchForm((current) => ({ ...current, matchDate: event.target.value }))
                  }
                />
              </label>
              <label>
                Goles A
                <input
                  type="number"
                  min={0}
                  value={matchForm.teamAScore ?? ''}
                  onChange={(event) =>
                    setMatchForm((current) => ({
                      ...current,
                      teamAScore: event.target.value === '' ? null : Number(event.target.value),
                    }))
                  }
                />
              </label>
              <label>
                Goles B
                <input
                  type="number"
                  min={0}
                  value={matchForm.teamBScore ?? ''}
                  onChange={(event) =>
                    setMatchForm((current) => ({
                      ...current,
                      teamBScore: event.target.value === '' ? null : Number(event.target.value),
                    }))
                  }
                />
              </label>
              <label>
                Estado
                <select
                  value={matchForm.status}
                  onChange={(event) =>
                    setMatchForm((current) => ({
                      ...current,
                      status: event.target.value as MatchStatus,
                    }))
                  }
                >
                  <option value={MatchStatus.SCHEDULED}>SCHEDULED</option>
                  <option value={MatchStatus.CLOSED}>CLOSED</option>
                  <option value={MatchStatus.FINISHED}>FINISHED</option>
                </select>
              </label>
              <div className="modal-actions">
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => {
                    setEditingMatch(null);
                    setIsAddMatchModalOpen(false);
                  }}
                >
                  Cancelar
                </button>
                <button className="primary-button" type="submit">
                  {isEditingMatch ? 'Guardar partido' : 'Agregar partido'}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function AdminRoomDetailPage() {
  const { roomId = '' } = useParams();
  const { rooms, users, matchesByRoom, predictionsByMatch, loading, error, refresh } = useCatalogData();
  const [activeTab, setActiveTab] = useState<AdminRoomDetailTab>('matches');
  const [roomForm, setRoomForm] = useState({ name: '', isActive: true });
  const [selectedUserId, setSelectedUserId] = useState('');
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isAddMatchModalOpen, setIsAddMatchModalOpen] = useState(false);
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [feedback, setFeedback] = useState('');
  const [matchDayFilter, setMatchDayFilter] = useState('all');
  const [matchForm, setMatchForm] = useState<MatchPayload>({
    teamA: '',
    teamB: '',
    matchDate: '',
    teamAScore: null,
    teamBScore: null,
    status: MatchStatus.SCHEDULED,
    isActive: true,
  });
  const room = rooms.find((item) => item.id === roomId);

  useEffect(() => {
    if (!room) {
      return;
    }

    setRoomForm({ name: room.name, isActive: room.isActive });
  }, [room]);

  useEffect(() => {
    if (!editingMatch) {
      setMatchForm({
        teamA: '',
        teamB: '',
        matchDate: '',
        teamAScore: null,
        teamBScore: null,
        status: MatchStatus.SCHEDULED,
        isActive: true,
      });
      return;
    }

    setMatchForm({
      teamA: editingMatch.teamA,
      teamB: editingMatch.teamB,
      matchDate: toDateTimeLocalValue(editingMatch.matchDate),
      teamAScore: editingMatch.teamAScore,
      teamBScore: editingMatch.teamBScore,
      status: editingMatch.status,
      isActive: editingMatch.isActive,
    });
  }, [editingMatch]);

  async function saveRoom(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!room) {
      return;
    }

    try {
      await roomsService.update(room.id, roomForm);
      setFeedback('Sala actualizada correctamente.');
      await refresh();
    } catch (requestError) {
      setFeedback(extractErrorMessage(requestError));
    }
  }

  async function attachUser() {
    if (!room || !selectedUserId) {
      return;
    }

    try {
      await roomsService.addUser(room.id, selectedUserId);
      setSelectedUserId('');
      setFeedback('Usuario anadido a la sala.');
      await refresh();
    } catch (requestError) {
      setFeedback(extractErrorMessage(requestError));
    }
  }

  async function detachUser(userId: string) {
    if (!room || !window.confirm('¿Quitar usuario de la sala?')) {
      return;
    }

    try {
      await roomsService.removeUser(room.id, userId);
      setFeedback('Usuario retirado de la sala.');
      await refresh();
    } catch (requestError) {
      setFeedback(extractErrorMessage(requestError));
    }
  }

  async function saveMatch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!room) {
      return;
    }

    if (matchForm.teamA.trim().toLowerCase() === matchForm.teamB.trim().toLowerCase()) {
      setFeedback('Los equipos no pueden ser iguales.');
      return;
    }

    try {
      const payload: MatchPayload = {
        ...matchForm,
        matchDate: fromDateTimeLocalValue(matchForm.matchDate),
      };

      if (editingMatch) {
        await matchesService.update(editingMatch.id, payload);
        setFeedback('Partido actualizado correctamente.');
      } else {
        await matchesService.create(room.id, payload);
        setFeedback('Partido agregado a la sala.');
        setIsAddMatchModalOpen(false);
      }

      setEditingMatch(null);
      await refresh();
    } catch (requestError) {
      setFeedback(extractErrorMessage(requestError));
    }
  }

  if (loading) {
    return <AppLoadingScreen message="Cargando sala admin..." />;
  }

  if (!room) {
    return (
      <div className="page-stack">
        <PageHeader title="Sala admin" description="No se encontro la sala solicitada." />
        <StateCard tone="warning">La sala no existe o fue removida.</StateCard>
      </div>
    );
  }

  const roomMatches = sortMatchesByDate(matchesByRoom[room.id] ?? []);
  const finishedMatches = roomMatches.filter((match) => match.status === MatchStatus.FINISHED);
  const roomMemberIds = new Set((room.roomUsers ?? []).map((membership) => membership.userId));
  const availableUsers = users.filter((user) => !roomMemberIds.has(user.id));
  const isEditingMatch = Boolean(editingMatch);
  const isMatchModalOpen = isEditingMatch || isAddMatchModalOpen;
  const leaderboard = buildLeaderboard(
    getRoomMembers(room),
    getCurrentRoomPredictions(roomMatches, predictionsByMatch),
    roomMatches,
  );
  const matchDayOptions = roomMatches.reduce<Array<{ value: string; label: string }>>((options, match) => {
    const value = getMatchDayKey(match.matchDate);

    if (options.some((option) => option.value === value)) {
      return options;
    }

    return [...options, { value, label: formatMatchDayLabel(match.matchDate) }];
  }, []);
  const filteredPredictionMatches =
    matchDayFilter === 'all'
      ? roomMatches
      : roomMatches.filter((match) => getMatchDayKey(match.matchDate) === matchDayFilter);

  return (
    <div className="page-stack">
      <PageHeader
        title={room.name}
        description="Entraste a la sala admin. Desde aqui la gestion ocurre dentro del contexto real de la sala."
        actions={<Link className="secondary-button" to="/admin/rooms">Volver a salas</Link>}
      />
      {error ? <StateCard tone="error">{error}</StateCard> : null}
      {feedback ? <StateCard tone="success">{feedback}</StateCard> : null}
      <div className="stats-grid">
        <StatTile label="Miembros" value={room.roomUsers?.length ?? 0} />
        <StatTile label="Partidos" value={roomMatches.length} />
        <StatTile label="Finalizados" value={finishedMatches.length} />
        <StatTile
          label="Pronosticos"
          value={roomMatches.flatMap((match) => predictionsByMatch[match.id] ?? []).length}
        />
      </div>

      <section className="panel-card">
        <PageHeader
          title="Configuracion de la sala"
          description="Ajusta los datos base sin salir de la sala."
        />
        <form className="form-grid" onSubmit={saveRoom}>
          <label>
            Nombre
            <input
              required
              minLength={2}
              value={roomForm.name}
              onChange={(event) => setRoomForm((current) => ({ ...current, name: event.target.value }))}
            />
          </label>
          <label>
            Estado
            <select
              value={String(roomForm.isActive)}
              onChange={(event) =>
                setRoomForm((current) => ({ ...current, isActive: event.target.value === 'true' }))
              }
            >
              <option value="true">Activa</option>
              <option value="false">Deshabilitada</option>
            </select>
          </label>
          <button className="primary-button" type="submit">
            Guardar sala
          </button>
        </form>
      </section>

      <section className="panel-card">
        <PageHeader
          title="Tabla de la sala"
          description="La tabla vive dentro de la sala, igual que en la experiencia de usuario."
        />
        <LeaderboardTable items={leaderboard} />
      </section>

      <section className="panel-card">
        <PageHeader
          title="Gestion de la sala"
          description="Cambia entre miembros, partidos y pronosticos por partido sin salir del contexto."
        />
        <div className="tab-switcher" role="tablist" aria-label="Secciones de gestion de la sala">
          <button
            className={`tab-button ${activeTab === 'members' ? 'active' : ''}`}
            type="button"
            onClick={() => setActiveTab('members')}
          >
            Miembros
          </button>
          <button
            className={`tab-button ${activeTab === 'matches' ? 'active' : ''}`}
            type="button"
            onClick={() => setActiveTab('matches')}
          >
            Partidos
          </button>
          <button
            className={`tab-button ${activeTab === 'room-predictions' ? 'active' : ''}`}
            type="button"
            onClick={() => setActiveTab('room-predictions')}
          >
            Pronosticos por partido
          </button>
        </div>

        {activeTab === 'members' ? (
          <div className="tab-panel">
            <section className="subsection-card">
              <div className="modal-header">
                <h3>Miembros</h3>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => {
                    setSelectedUserId('');
                    setIsAddUserModalOpen(true);
                  }}
                >
                  Anadir usuario
                </button>
              </div>
              {(room.roomUsers ?? []).length === 0 ? (
                <StateCard>No hay miembros en esta sala todavia.</StateCard>
              ) : (
                <SectionTable headers={['Miembro', 'Rol', 'Accion']}>
                  {(room.roomUsers ?? []).map((membership) => (
                    <tr key={membership.id}>
                      <td>
                        <strong>{membership.user.name}</strong>
                        <div className="muted-text">@{membership.user.username}</div>
                      </td>
                      <td>{membership.user.role}</td>
                      <td>
                        <button
                          className="table-button danger"
                          type="button"
                          onClick={() => detachUser(membership.user.id)}
                        >
                          Quitar
                        </button>
                      </td>
                    </tr>
                  ))}
                </SectionTable>
              )}
            </section>
          </div>
        ) : null}

        {activeTab === 'matches' ? (
          <div className="tab-panel">
            <section className="subsection-card">
              <div className="modal-header">
                <h3>Partidos de la sala</h3>
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => {
                    setEditingMatch(null);
                    setIsAddMatchModalOpen(true);
                  }}
                >
                  Agregar partido
                </button>
              </div>
              {roomMatches.length === 0 ? (
                <StateCard>No hay partidos en esta sala.</StateCard>
              ) : (
                <SectionTable headers={['Partido', 'Fecha Bolivia', 'Estado', 'Resultado', 'Accion']}>
                  {roomMatches.map((match) => {
                    const statusLabel = getMatchVisualStatus(match.matchDate, match.status);

                    return (
                      <tr key={match.id}>
                        <td>
                          {match.teamA} vs {match.teamB}
                        </td>
                        <td>{formatDateTime(match.matchDate)}</td>
                        <td>
                          <StatusBadge label={statusLabel} tone={toneForMatchStatus(statusLabel)} />
                        </td>
                        <td>
                          {match.teamAScore ?? '-'} : {match.teamBScore ?? '-'}
                        </td>
                        <td>
                          <button className="table-button" type="button" onClick={() => setEditingMatch(match)}>
                            Editar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </SectionTable>
              )}
            </section>
          </div>
        ) : null}

        {activeTab === 'room-predictions' ? (
          <div className="tab-panel">
            <PageHeader
              title="Pronosticos por partido"
              description="Revisa que pronostico hizo cada usuario dentro de cada partido."
              actions={
                matchDayOptions.length > 0 ? (
                  <select value={matchDayFilter} onChange={(event) => setMatchDayFilter(event.target.value)}>
                    <option value="all">Todas las fechas</option>
                    {matchDayOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : null
              }
            />
            {roomMatches.length === 0 ? (
              <StateCard>No hay partidos registrados en esta sala todavia.</StateCard>
            ) : filteredPredictionMatches.length === 0 ? (
              <StateCard>No hay partidos para la fecha seleccionada.</StateCard>
            ) : (
              <div className="prediction-cards-grid">
                {filteredPredictionMatches.map((match) => {
                  const matchPredictions = predictionsByMatch[match.id] ?? [];
                  const statusLabel = getMatchVisualStatus(match.matchDate, match.status);

                  return (
                    <section key={match.id} className="subsection-card room-prediction-card">
                      <div className="match-row">
                        <div>
                          <h3>
                            {match.teamA} vs {match.teamB}
                          </h3>
                          <p className="page-description">{formatDateTime(match.matchDate)}</p>
                          <p className="page-description">
                            Resultado: {match.teamAScore ?? '-'} - {match.teamBScore ?? '-'}
                          </p>
                        </div>
                        <StatusBadge label={statusLabel} tone={toneForMatchStatus(statusLabel)} />
                      </div>
                      {matchPredictions.length === 0 ? (
                        <StateCard>No hay pronosticos registrados para este partido.</StateCard>
                      ) : (
                        <SectionTable headers={['Usuario', 'Pronostico', 'Puntos']}>
                          {matchPredictions.map((prediction) => (
                            <tr key={prediction.id}>
                              <td>
                                <strong>{prediction.user?.name ?? 'Usuario'}</strong>
                                <div className="muted-text">@{prediction.user?.username ?? ''}</div>
                              </td>
                              <td>
                                {prediction.predictedTeamAScore} - {prediction.predictedTeamBScore}
                              </td>
                              <td>{prediction.points ?? 0}</td>
                            </tr>
                          ))}
                        </SectionTable>
                      )}
                    </section>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}
      </section>

      {isAddUserModalOpen ? (
        <div
          className="modal-backdrop"
          onClick={() => setIsAddUserModalOpen(false)}
          role="presentation"
        >
          <section
            className="modal-card"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-user-title"
          >
            <div className="modal-header">
              <div>
                <p className="eyebrow">Miembro</p>
                <h3 id="add-user-title">Anadir usuario</h3>
              </div>
              <button className="table-button" type="button" onClick={() => setIsAddUserModalOpen(false)}>
                Cerrar
              </button>
            </div>
            {availableUsers.length === 0 ? (
              <StateCard>Todos los usuarios disponibles ya pertenecen a esta sala.</StateCard>
            ) : (
              <div className="form-grid">
                <label>
                  Usuario
                  <select value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value)}>
                    <option value="">Selecciona usuario</option>
                    {availableUsers.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.name} (@{user.username})
                      </option>
                    ))}
                  </select>
                </label>
                <div className="modal-actions">
                  <button
                    className="secondary-button"
                    type="button"
                    onClick={() => setIsAddUserModalOpen(false)}
                  >
                    Cancelar
                  </button>
                  <button
                    className="primary-button"
                    type="button"
                    onClick={async () => {
                      await attachUser();
                      setIsAddUserModalOpen(false);
                    }}
                    disabled={!selectedUserId}
                  >
                    Anadir usuario
                  </button>
                </div>
              </div>
            )}
          </section>
        </div>
      ) : null}

      {isMatchModalOpen ? (
        <div
          className="modal-backdrop"
          onClick={() => {
            setEditingMatch(null);
            setIsAddMatchModalOpen(false);
          }}
          role="presentation"
        >
          <section
            className="modal-card"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-match-title"
          >
            <div className="modal-header">
              <div>
                <p className="eyebrow">Partido</p>
                <h3 id="edit-match-title">{isEditingMatch ? 'Editar partido' : 'Agregar partido'}</h3>
              </div>
              <button
                className="table-button"
                type="button"
                onClick={() => {
                  setEditingMatch(null);
                  setIsAddMatchModalOpen(false);
                }}
              >
                Cerrar
              </button>
            </div>
            <form className="form-grid" onSubmit={saveMatch}>
              <label>
                Equipo A
                <input
                  required
                  value={matchForm.teamA}
                  onChange={(event) =>
                    setMatchForm((current) => ({ ...current, teamA: event.target.value }))
                  }
                />
              </label>
              <label>
                Equipo B
                <input
                  required
                  value={matchForm.teamB}
                  onChange={(event) =>
                    setMatchForm((current) => ({ ...current, teamB: event.target.value }))
                  }
                />
              </label>
              <label>
                Fecha y hora
                <input
                  type="datetime-local"
                  required
                  value={matchForm.matchDate}
                  onChange={(event) =>
                    setMatchForm((current) => ({ ...current, matchDate: event.target.value }))
                  }
                />
              </label>
              <label>
                Goles A
                <input
                  type="number"
                  min={0}
                  value={matchForm.teamAScore ?? ''}
                  onChange={(event) =>
                    setMatchForm((current) => ({
                      ...current,
                      teamAScore: event.target.value === '' ? null : Number(event.target.value),
                    }))
                  }
                />
              </label>
              <label>
                Goles B
                <input
                  type="number"
                  min={0}
                  value={matchForm.teamBScore ?? ''}
                  onChange={(event) =>
                    setMatchForm((current) => ({
                      ...current,
                      teamBScore: event.target.value === '' ? null : Number(event.target.value),
                    }))
                  }
                />
              </label>
              <label>
                Estado
                <select
                  value={matchForm.status}
                  onChange={(event) =>
                    setMatchForm((current) => ({
                      ...current,
                      status: event.target.value as MatchStatus,
                    }))
                  }
                >
                  <option value={MatchStatus.SCHEDULED}>SCHEDULED</option>
                  <option value={MatchStatus.CLOSED}>CLOSED</option>
                  <option value={MatchStatus.FINISHED}>FINISHED</option>
                </select>
              </label>
              <div className="modal-actions">
                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => {
                    setEditingMatch(null);
                    setIsAddMatchModalOpen(false);
                  }}
                >
                  Cancelar
                </button>
                <button className="primary-button" type="submit">
                  {isEditingMatch ? 'Guardar partido' : 'Agregar partido'}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function LeaderboardTable({ items }: { items: LeaderboardItem[] }) {
  if (items.length === 0) {
    return <StateCard>No hay datos suficientes para construir la tabla todavia.</StateCard>;
  }

  return (
    <SectionTable headers={['Usuario', 'Puntos', 'Pronosticos', 'Exactos', 'Ganador/empate']}>
      {items.map((item) => (
        <tr key={item.userId}>
          <td>
            <strong>{item.name}</strong>
            <div className="muted-text">@{item.username}</div>
          </td>
          <td>{item.points}</td>
          <td>{item.predictionCount}</td>
          <td>{item.exactHits}</td>
          <td>{item.outcomeHits}</td>
        </tr>
      ))}
    </SectionTable>
  );
}

function PredictionMatchCard({
  match,
  prediction,
  isLocked,
  isSubmitting = false,
  onSubmit,
}: {
  match: Match;
  prediction?: Prediction;
  isLocked: boolean;
  isSubmitting?: boolean;
  onSubmit: (match: Match, formData: FormData) => Promise<void>;
}) {
  const statusLabel = getMatchVisualStatus(match.matchDate, match.status);

  return (
    <section className={`panel-card prediction-card ${isSubmitting ? 'is-submitting' : ''}`}>
      <div className="match-row prediction-card-header">
        <div>
          <h3>
            {match.teamA} vs {match.teamB}
          </h3>
          <p className="page-description">{formatDateTime(match.matchDate)}</p>
        </div>
        <div className="prediction-card-status">
          {prediction ? (
            <span className="prediction-points-chip">
              {prediction.points ?? 0} pt{prediction.points === 1 ? '' : 's'}
            </span>
          ) : null}
          <StatusBadge label={statusLabel} tone={toneForMatchStatus(statusLabel)} />
        </div>
      </div>
      <form
        className="prediction-form"
        onSubmit={async (event) => {
          event.preventDefault();
          await onSubmit(match, new FormData(event.currentTarget));
        }}
      >
        <label>
          {match.teamA}
          <input
            name={`teamA-${match.id}`}
            type="number"
            min={0}
            defaultValue={prediction?.predictedTeamAScore ?? ''}
            disabled={isLocked || isSubmitting}
            required
          />
        </label>
        <label>
          {match.teamB}
          <input
            name={`teamB-${match.id}`}
            type="number"
            min={0}
            defaultValue={prediction?.predictedTeamBScore ?? ''}
            disabled={isLocked || isSubmitting}
            required
          />
        </label>
        {!isLocked ? (
          <button className="primary-button" type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? 'Guardando...'
              : prediction
                ? 'Actualizar pronostico'
                : 'Guardar pronostico'}
          </button>
        ) : null}
      </form>
    </section>
  );
}

function PredictionLoadingOverlay({ visible }: { visible: boolean }) {
  if (!visible) {
    return null;
  }

  return (
    <div className="loading-overlay" aria-live="polite" aria-busy="true">
      <div className="loading-overlay-card">
        <span className="loading-spinner" aria-hidden="true" />
        <strong>Guardando pronostico...</strong>
      </div>
    </div>
  );
}

function AppLoadingScreen({ message }: { message: string }) {
  return (
    <div className="app-loading-screen">
      <div className="app-loading-card">
        <div className="app-loading-brand">
          <img src="/ball.png" alt="Balon oficial" />
          <img src="/pronostidamus.png" alt="Pronostidamus" />
        </div>
        <div className="app-loading-copy">
          <span className="loading-spinner" aria-hidden="true" />
          <strong>{message}</strong>
        </div>
      </div>
    </div>
  );
}

function UserDashboardPage() {
  const { currentUser } = useAuth();
  const { rooms, matchesByRoom, loading, error } = useCatalogData();
  const myRooms = getAccessibleRooms(rooms, currentUser);
  const upcomingMatches = myRooms
    .flatMap((room) => matchesByRoom[room.id] ?? [])
    .filter((match) => !isPredictionLocked(match.matchDate, match.status));

  if (loading) {
    return <AppLoadingScreen message="Cargando panel..." />;
  }

  return (
    <div className="page-stack">
      <PageHeader
        title="Panel"
        description={`Bienvenido, ${currentUser?.name ?? ''}.`}
      />
      {error ? <StateCard tone="error">{error}</StateCard> : null}
      <div className="stats-grid">
        <StatTile label="Salas visibles" value={myRooms.length} />
        <StatTile label="Partidos disponibles" value={upcomingMatches.length} />
        <StatTile label="Puntaje exacto" value="3 pts" helper="Resultado exacto" />
        <StatTile label="Ganador/empate" value="1 pt" helper="Coincidencia parcial" />
      </div>
    </div>
  );
}

function UserProfilePage() {
  const { currentUser } = useAuth();
  const [feedback, setFeedback] = useState('');
  const [form, setForm] = useState({
    name: currentUser?.name ?? '',
    username: currentUser?.username ?? '',
    email: currentUser?.email ?? '',
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!currentUser) {
      return;
    }

    try {
      await usersService.update(currentUser.id, form);
      setFeedback('Perfil actualizado correctamente.');
    } catch (requestError) {
      setFeedback(extractErrorMessage(requestError));
    }
  }

  return (
    <div className="page-stack">
      <PageHeader
        title="Perfil"
        description="Actualiza tus datos personales."
      />
      {feedback ? <StateCard tone="success">{feedback}</StateCard> : null}
      <form className="form-grid panel-card" onSubmit={handleSubmit}>
        <label>
          Nombre
          <input
            required
            value={form.name}
            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          />
        </label>
        <label>
          Username
          <input
            required
            value={form.username}
            onChange={(event) =>
              setForm((current) => ({ ...current, username: event.target.value }))
            }
          />
        </label>
        <label>
          Email
          <input
            type="email"
            required
            value={form.email}
            onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
          />
        </label>
        <StateCard>Rol actual: {currentUser?.role}</StateCard>
        <button className="primary-button" type="submit">
          Guardar perfil
        </button>
      </form>
    </div>
  );
}

function UserRoomsPage() {
  const { currentUser } = useAuth();
  const { rooms, matchesByRoom, predictionsByMatch, loading, error } = useCatalogData();
  const myRooms = getAccessibleRooms(rooms, currentUser);

  if (loading) {
    return <AppLoadingScreen message="Cargando salas..." />;
  }

  return (
    <div className="page-stack">
      <PageHeader
        title="Mis salas"
        description={
          currentUser?.role === UserRole.ADMIN
            ? 'Accede a cualquier sala para ver sus partidos y pronosticos.'
            : 'Elige una sala para ver sus partidos y tus pronosticos.'
        }
      />
      {error ? <StateCard tone="error">{error}</StateCard> : null}
      {myRooms.length === 0 ? (
        <StateCard>No hay salas registradas para este usuario.</StateCard>
      ) : (
        <SectionTable headers={['Sala', 'Miembros', 'Actividad', 'Accion']}>
          {myRooms.map((room) => {
            const roomMatches = matchesByRoom[room.id] ?? [];
            const roomPredictions = roomMatches.flatMap(
              (match) => predictionsByMatch[match.id] ?? [],
            );

            return (
              <tr key={room.id}>
                <td>
                  <strong>{room.name}</strong>
                </td>
                <td>{room.roomUsers?.length ?? 0}</td>
                <td>
                  {roomMatches.length} partido{roomMatches.length === 1 ? '' : 's'} ·{' '}
                  {roomPredictions.length} pronostico{roomPredictions.length === 1 ? '' : 's'}
                </td>
                <td>
                  <Link className="table-button" to={`/user/rooms/${room.id}`}>
                    Entrar
                  </Link>
                </td>
              </tr>
            );
          })}
        </SectionTable>
      )}
    </div>
  );
}

function UserRoomDetailPage() {
  const { currentUser } = useAuth();
  const { roomId = '' } = useParams();
  const { rooms, matchesByRoom, predictionsByMatch, loading, error, refresh } = useCatalogData();
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const [activeTab, setActiveTab] = useState<RoomDetailTab>('predictions');
  const [finishedMatchDayFilter, setFinishedMatchDayFilter] = useState('all');
  const [submittingMatchId, setSubmittingMatchId] = useState<string | null>(null);
  const myRooms = getAccessibleRooms(rooms, currentUser);
  const room = myRooms.find((item) => item.id === roomId);

  async function submitPrediction(match: Match, formData: FormData) {
    if (!currentUser) {
      return;
    }

    const predictedTeamAScore = Number(formData.get(`teamA-${match.id}`));
    const predictedTeamBScore = Number(formData.get(`teamB-${match.id}`));

    if (predictedTeamAScore < 0 || predictedTeamBScore < 0) {
      setFeedback({ tone: 'error', message: 'Los goles no pueden ser negativos.' });
      return;
    }

    const existingPrediction = (predictionsByMatch[match.id] ?? []).find(
      (item) => item.userId === currentUser.id,
    );

    try {
      setSubmittingMatchId(match.id);
      setFeedback(null);

      if (existingPrediction) {
        await predictionsService.update(existingPrediction.id, {
          predictedTeamAScore,
          predictedTeamBScore,
        });
        setFeedback({ tone: 'success', message: 'Pronostico actualizado correctamente.' });
      } else {
        await predictionsService.create(match.id, {
          userId: currentUser.id,
          predictedTeamAScore,
          predictedTeamBScore,
        });
        setFeedback({ tone: 'success', message: 'Pronostico guardado correctamente.' });
      }

      await refresh();
    } catch (requestError) {
      setFeedback({ tone: 'error', message: extractErrorMessage(requestError) });
    } finally {
      setSubmittingMatchId(null);
    }
  }

  if (loading) {
    return <AppLoadingScreen message="Cargando sala..." />;
  }

  if (!room) {
    return (
      <div className="page-stack">
        <PageHeader title="Sala" description="No se encontro la sala solicitada." />
        <StateCard tone="warning">La sala no existe o no pertenece a este usuario.</StateCard>
      </div>
    );
  }

  const matches = sortMatchesByDate(matchesByRoom[room.id] ?? []);
  const finishedMatches = matches.filter((match) => match.status === MatchStatus.FINISHED);
  const openMatches = matches.filter((match) => !isPredictionLocked(match.matchDate, match.status));
  const pendingPredictionMatches = matches.filter(
    (match) => !isPredictionLocked(match.matchDate, match.status),
  );
  const lockedPredictionMatches = matches.filter((match) =>
    isPredictionLocked(match.matchDate, match.status),
  );
  const finishedMatchDayOptions = finishedMatches.reduce<Array<{ value: string; label: string }>>(
    (options, match) => {
      const value = getMatchDayKey(match.matchDate);

      if (options.some((option) => option.value === value)) {
        return options;
      }

      return [...options, { value, label: formatMatchDayLabel(match.matchDate) }];
    },
    [],
  );
  const filteredFinishedMatches =
    finishedMatchDayFilter === 'all'
      ? finishedMatches
      : finishedMatches.filter((match) => getMatchDayKey(match.matchDate) === finishedMatchDayFilter);
  const leaderboard = buildLeaderboard(
    getRoomMembers(room),
    getCurrentRoomPredictions(matches, predictionsByMatch),
    matches,
  );

  return (
    <div className={`page-stack page-with-overlay ${submittingMatchId ? 'is-loading' : ''}`}>
      <PredictionLoadingOverlay visible={Boolean(submittingMatchId)} />
      <PageHeader
        title={room.name}
        description="Consulta la tabla primero y luego navega por las secciones de la sala sin tener todo extendido."
      />
      {error ? <StateCard tone="error">{error}</StateCard> : null}
      {feedback ? <StateCard tone={feedback.tone}>{feedback.message}</StateCard> : null}
      <div className="stats-grid">
        <StatTile label="Miembros" value={room.roomUsers?.length ?? 0} />
        <StatTile label="Partidos" value={matches.length} />
        <StatTile label="Pendientes" value={openMatches.length} />
        <StatTile label="Finalizados" value={finishedMatches.length} />
      </div>

      <section className="panel-card">
        <PageHeader title="Tabla de la sala" description="Posiciones actuales dentro de esta sala." />
        <LeaderboardTable items={leaderboard} />
      </section>

      <section className="panel-card">
        <PageHeader
          title="Explorar la sala"
          description="Cambia entre partidos, tus pronosticos y los pronosticos del grupo."
        />
        <div className="tab-switcher" role="tablist" aria-label="Secciones de la sala">
          <button
            className={`tab-button ${activeTab === 'matches' ? 'active' : ''}`}
            type="button"
            onClick={() => setActiveTab('matches')}
          >
            Partidos
          </button>
          <button
            className={`tab-button ${activeTab === 'predictions' ? 'active' : ''}`}
            type="button"
            onClick={() => setActiveTab('predictions')}
          >
            Mis pronosticos
          </button>
          <button
            className={`tab-button ${activeTab === 'room-predictions' ? 'active' : ''}`}
            type="button"
            onClick={() => setActiveTab('room-predictions')}
          >
            Pronosticos de la sala
          </button>
        </div>

        {activeTab === 'matches' ? (
          <div className="tab-panel">
            {matches.length === 0 ? (
              <StateCard>No hay partidos cargados en esta sala.</StateCard>
            ) : (
              <SectionTable headers={['Partido', 'Fecha Bolivia', 'Estado', 'Resultado']}>
                {matches.map((match) => {
                  const statusLabel = getMatchVisualStatus(match.matchDate, match.status);

                  return (
                    <tr key={match.id}>
                      <td>
                        {match.teamA} vs {match.teamB}
                      </td>
                      <td>{formatDateTime(match.matchDate)}</td>
                      <td>
                        <StatusBadge label={statusLabel} tone={toneForMatchStatus(statusLabel)} />
                      </td>
                      <td>
                        {match.teamAScore ?? '-'} : {match.teamBScore ?? '-'}
                      </td>
                    </tr>
                  );
                })}
              </SectionTable>
            )}
          </div>
        ) : null}

        {activeTab === 'predictions' ? (
          <div className="tab-panel room-detail-sections">
            <section className="subsection-card">
              <div className="subsection-heading">
                <h3>Habilitados para pronosticar</h3>
                <span>{pendingPredictionMatches.length}</span>
              </div>
              {pendingPredictionMatches.length === 0 ? (
                <StateCard>No hay partidos habilitados para pronosticar o actualizar en esta sala.</StateCard>
              ) : (
                <div className="prediction-cards-grid">
                  {pendingPredictionMatches.map((match) => {
                    const myPrediction = (predictionsByMatch[match.id] ?? []).find(
                      (item) => item.userId === currentUser?.id,
                    );

                    return (
                      <PredictionMatchCard
                      key={match.id}
                      match={match}
                      prediction={myPrediction}
                      isLocked={false}
                      isSubmitting={submittingMatchId === match.id}
                      onSubmit={submitPrediction}
                    />
                  );
                  })}
                </div>
              )}
            </section>

            <section className="subsection-card">
              <div className="subsection-heading">
                <h3>Cerrados o finalizados</h3>
                <span>{lockedPredictionMatches.length}</span>
              </div>
              {lockedPredictionMatches.length === 0 ? (
                <StateCard>Todavia no hay partidos cerrados o finalizados.</StateCard>
              ) : (
                <div className="prediction-cards-grid">
                  {lockedPredictionMatches.map((match) => {
                    const myPrediction = (predictionsByMatch[match.id] ?? []).find(
                      (item) => item.userId === currentUser?.id,
                    );

                    return (
                      <PredictionMatchCard
                      key={match.id}
                      match={match}
                      prediction={myPrediction}
                      isLocked
                      isSubmitting={submittingMatchId === match.id}
                      onSubmit={submitPrediction}
                    />
                  );
                  })}
                </div>
              )}
            </section>
          </div>
        ) : null}

        {activeTab === 'room-predictions' ? (
          <div className="tab-panel">
            <PageHeader
              title="Pronosticos de la sala"
              description="Filtra por fecha para revisar solo la jornada que te interesa."
              actions={
                finishedMatchDayOptions.length > 0 ? (
                  <select
                    value={finishedMatchDayFilter}
                    onChange={(event) => setFinishedMatchDayFilter(event.target.value)}
                  >
                    <option value="all">Todas las fechas</option>
                    {finishedMatchDayOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                ) : null
              }
            />
            {finishedMatches.length === 0 ? (
              <StateCard>No hay partidos finalizados todavia.</StateCard>
            ) : filteredFinishedMatches.length === 0 ? (
              <StateCard>No hay partidos finalizados para la fecha seleccionada.</StateCard>
            ) : (
              <div className="prediction-cards-grid">
                {filteredFinishedMatches.map((match) => {
                  const matchPredictions = predictionsByMatch[match.id] ?? [];

                  return (
                    <section key={match.id} className="subsection-card room-prediction-card">
                      <div className="match-row">
                        <div>
                          <h3>
                            {match.teamA} vs {match.teamB}
                          </h3>
                          <p className="page-description">
                            Resultado final: {match.teamAScore ?? '-'} - {match.teamBScore ?? '-'}
                          </p>
                        </div>
                        <StatusBadge label="Finalizado" tone="info" />
                      </div>
                      {matchPredictions.length === 0 ? (
                        <StateCard>No hay pronosticos registrados para este partido.</StateCard>
                      ) : (
                        <SectionTable headers={['Usuario', 'Pronostico', 'Puntos']}>
                          {matchPredictions.map((prediction) => (
                            <tr key={prediction.id}>
                              <td>
                                <strong>{prediction.user?.name ?? 'Usuario'}</strong>
                                <div className="muted-text">@{prediction.user?.username ?? ''}</div>
                              </td>
                              <td>
                                {prediction.predictedTeamAScore} - {prediction.predictedTeamBScore}
                              </td>
                              <td>{prediction.points ?? 0}</td>
                            </tr>
                          ))}
                        </SectionTable>
                      )}
                    </section>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}
      </section>
      </div>
  );
}

function UserPredictionsPage() {
  const { currentUser } = useAuth();
  const { rooms, matchesByRoom, predictionsByMatch, loading, error, refresh } = useCatalogData();
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const [submittingMatchId, setSubmittingMatchId] = useState<string | null>(null);
  const myRooms = getAccessibleRooms(rooms, currentUser);
  const matches = sortMatchesByDate(myRooms.flatMap((room) => matchesByRoom[room.id] ?? []));

  async function submitPrediction(match: Match, formData: FormData) {
    if (!currentUser) {
      return;
    }

    const predictedTeamAScore = Number(formData.get(`teamA-${match.id}`));
    const predictedTeamBScore = Number(formData.get(`teamB-${match.id}`));

    if (predictedTeamAScore < 0 || predictedTeamBScore < 0) {
      setFeedback({ tone: 'error', message: 'Los goles no pueden ser negativos.' });
      return;
    }

    const existingPrediction = (predictionsByMatch[match.id] ?? []).find(
      (item) => item.userId === currentUser.id,
    );

    try {
      setSubmittingMatchId(match.id);
      setFeedback(null);

      if (existingPrediction) {
        await predictionsService.update(existingPrediction.id, {
          predictedTeamAScore,
          predictedTeamBScore,
        });
        setFeedback({ tone: 'success', message: 'Pronostico actualizado correctamente.' });
      } else {
        await predictionsService.create(match.id, {
          userId: currentUser.id,
          predictedTeamAScore,
          predictedTeamBScore,
        });
        setFeedback({ tone: 'success', message: 'Pronostico guardado correctamente.' });
      }

      await refresh();
    } catch (requestError) {
      setFeedback({ tone: 'error', message: extractErrorMessage(requestError) });
    } finally {
      setSubmittingMatchId(null);
    }
  }

  if (loading) {
    return <AppLoadingScreen message="Cargando pronosticos..." />;
  }

  return (
    <div className={`page-stack page-with-overlay ${submittingMatchId ? 'is-loading' : ''}`}>
      <PredictionLoadingOverlay visible={Boolean(submittingMatchId)} />
      <PageHeader
        title="Pronosticos"
        description="Edicion disponible mientras el partido no este cerrado por tiempo o estado."
      />
      {error ? <StateCard tone="error">{error}</StateCard> : null}
      {feedback ? <StateCard tone={feedback.tone}>{feedback.message}</StateCard> : null}
      {matches.length === 0 ? (
        <StateCard>Todavia no hay partidos disponibles para pronosticar.</StateCard>
      ) : (
        <div className="prediction-cards-grid">
          {matches.map((match) => {
            const myPrediction = (predictionsByMatch[match.id] ?? []).find(
              (item) => item.userId === currentUser?.id,
            );
            const locked = isPredictionLocked(match.matchDate, match.status);

            return (
              <PredictionMatchCard
              key={match.id}
              match={match}
              prediction={myPrediction}
              isLocked={locked}
              isSubmitting={submittingMatchId === match.id}
              onSubmit={submitPrediction}
            />
          );
          })}
        </div>
      )}
    </div>
  );
}

function UserLeaderboardPage() {
  const { currentUser } = useAuth();
  const { rooms, matchesByRoom, predictionsByMatch, loading, error } = useCatalogData();
  const myRooms = getAccessibleRooms(rooms, currentUser);
  const [roomId, setRoomId] = useState('');

  useEffect(() => {
    if (!roomId && myRooms[0]) {
      setRoomId(myRooms[0].id);
    }
  }, [myRooms, roomId]);

  const room = myRooms.find((item) => item.id === roomId) ?? myRooms[0];
  const matches = room ? matchesByRoom[room.id] ?? [] : [];
  const leaderboard = room
    ? buildLeaderboard(
        getRoomMembers(room),
        getCurrentRoomPredictions(matches, predictionsByMatch),
        matches,
      )
    : [];

  if (loading) {
    return <AppLoadingScreen message="Cargando tabla..." />;
  }

  return (
    <div className="page-stack">
      <PageHeader
        title="Tabla"
        description="Posiciones de la sala seleccionada."
      />
      {error ? <StateCard tone="error">{error}</StateCard> : null}
      {room ? (
        <>
          <div className="inline-actions">
            <select value={room.id} onChange={(event) => setRoomId(event.target.value)}>
              {myRooms.map((currentRoom) => (
                <option key={currentRoom.id} value={currentRoom.id}>
                  {currentRoom.name}
                </option>
              ))}
            </select>
          </div>
          <LeaderboardTable items={leaderboard} />
        </>
      ) : (
        <StateCard>No perteneces a ninguna sala todavia.</StateCard>
      )}
    </div>
  );
}

function NotFoundPage() {
  return (
    <div className="auth-screen">
      <StateCard tone="warning">La ruta solicitada no existe.</StateCard>
    </div>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.USER]} />}>
        <Route element={<AppShell />}>
          <Route element={<ProtectedRoute allowedRoles={[UserRole.ADMIN, UserRole.USER]} />}>
            <Route path="/user" element={<UserDashboardPage />} />
            <Route path="/user/profile" element={<UserProfilePage />} />
            <Route path="/user/rooms" element={<UserRoomsPage />} />
            <Route path="/user/rooms/:roomId" element={<UserRoomDetailPage />} />
            <Route path="/user/predictions" element={<UserPredictionsPage />} />
            <Route path="/user/leaderboard" element={<UserLeaderboardPage />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={[UserRole.ADMIN]} />}>
            <Route path="/admin" element={<AdminDashboardPage />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/admin/rooms" element={<AdminRoomsPage />} />
            <Route path="/admin/rooms/:roomId" element={<AdminRoomDetailPage />} />
          </Route>
        </Route>
      </Route>
      <Route path="/" element={<Navigate to="/user" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}


