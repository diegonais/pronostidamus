import { useEffect, useState, type FormEvent } from 'react';
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom';
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

function toneForMatchStatus(statusLabel: string) {
  if (statusLabel === 'Finalizado') {
    return 'info';
  }

  if (statusLabel === 'Cerrado') {
    return 'warning';
  }

  return 'success';
}

function getCurrentRoomPredictions(roomId: string, matches: Match[], allPredictions: Record<string, Prediction[]>) {
  return matches
    .filter((match) => match.roomId === roomId)
    .reduce<Record<string, Prediction[]>>((accumulator, match) => {
      accumulator[match.id] = allPredictions[match.id] ?? [];
      return accumulator;
    }, {});
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
  children: React.ReactNode;
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

function LoginPage() {
  const { currentUser, login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', email: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (currentUser) {
    return <Navigate to={currentUser.role === UserRole.ADMIN ? '/admin' : '/user'} replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setLoading(true);
      setError('');
      const user = await login(form);
      navigate(user.role === UserRole.ADMIN ? '/admin' : '/user', { replace: true });
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
          <img src="/pronostidamus.png" alt="Pronostidamus" />
          <img src="/ball.png" alt="Balón oficial" />
        </div>
        <div>
          <p className="eyebrow">Ingreso temporal</p>
          <h1>Pronostidamus</h1>
          <p className="page-description">
            Usa el endpoint actual `POST /auth/preview-login` con un usuario activo de la base de datos.
          </p>
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
            Email
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              required
            />
          </label>
          {error ? <StateCard tone="error">{error}</StateCard> : null}
          <button className="primary-button" disabled={loading} type="submit">
            {loading ? 'Validando...' : 'Entrar'}
          </button>
        </form>

        <StateCard>
          Usuarios seed disponibles: `diego / diego@example.com`, `salva / salva@example.com`,
          `josue / josue@example.com`, `paolo / paolo@example.com`.
        </StateCard>
      </section>
    </div>
  );
}

function AdminDashboardPage() {
  const { rooms, matchesByRoom, users, loading, error } = useCatalogData();
  const matches = Object.values(matchesByRoom).flat();

  if (loading) {
    return <StateCard>Cargando datos del panel...</StateCard>;
  }

  return (
    <div className="page-stack">
      <PageHeader
        title="Dashboard Admin"
        description="Resumen rápido del estado actual del backend conectado."
      />
      {error ? <StateCard tone="error">{error}</StateCard> : null}
      <div className="stats-grid">
        <StatTile label="Usuarios" value={users.length} />
        <StatTile label="Salas" value={rooms.length} />
        <StatTile label="Partidos" value={matches.length} />
        <StatTile
          label="Programados"
          value={matches.filter((match) => getMatchVisualStatus(match.matchDate, match.status) === 'Programado').length}
        />
      </div>
      <StateCard>
        El backend todavía no expone métricas agregadas de cierre ni cálculo de puntos; este panel resume a partir
        de los endpoints base disponibles.
      </StateCard>
    </div>
  );
}

function AdminUsersPage() {
  const { users, loading, error, refresh } = useCatalogData();
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [feedback, setFeedback] = useState('');
  const [form, setForm] = useState<UserPayload>({
    name: '',
    username: '',
    email: '',
    role: UserRole.USER,
    isActive: true,
  });

  useEffect(() => {
    if (editingUser) {
      setForm({
        name: editingUser.name,
        username: editingUser.username,
        email: editingUser.email,
        role: editingUser.role,
        isActive: editingUser.isActive,
      });
    }
  }, [editingUser]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      if (editingUser) {
        await usersService.update(editingUser.id, form);
        setFeedback('Usuario actualizado correctamente.');
      } else {
        await usersService.create(form);
        setFeedback('Usuario creado correctamente.');
      }
      setEditingUser(null);
      setForm({ name: '', username: '', email: '', role: UserRole.USER, isActive: true });
      await refresh();
    } catch (requestError) {
      setFeedback(extractErrorMessage(requestError));
    }
  }

  if (loading) {
    return <StateCard>Cargando usuarios...</StateCard>;
  }

  return (
    <div className="page-stack two-column">
      <section className="panel-card">
        <PageHeader title="Usuarios" description="Alta, edición y deshabilitación lógica vía `PATCH /users/:id`." />
        {error ? <StateCard tone="error">{error}</StateCard> : null}
        {feedback ? <StateCard tone="success">{feedback}</StateCard> : null}
        <SectionTable headers={['Nombre', 'Username', 'Email', 'Rol', 'Estado', 'Acción']}>
          {users.map((user) => (
            <tr key={user.id}>
              <td>{user.name}</td>
              <td>{user.username}</td>
              <td>{user.email}</td>
              <td>{user.role}</td>
              <td>
                <StatusBadge label={user.isActive ? 'Activo' : 'Deshabilitado'} tone={user.isActive ? 'success' : 'muted'} />
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

      <section className="panel-card">
        <PageHeader
          title={editingUser ? 'Editar usuario' : 'Crear usuario'}
          description="Validación básica en frontend y validación real en backend."
        />
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
              onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))}
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
            Rol
            <select
              value={form.role}
              onChange={(event) => setForm((current) => ({ ...current, role: event.target.value as UserRole }))}
            >
              <option value={UserRole.USER}>USER</option>
              <option value={UserRole.ADMIN}>ADMIN</option>
            </select>
          </label>
          <label>
            Estado
            <select
              value={String(form.isActive)}
              onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.value === 'true' }))}
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
    </div>
  );
}

function AdminRoomsPage() {
  const { rooms, users, loading, error, refresh } = useCatalogData();
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [roomForm, setRoomForm] = useState({ name: '', isActive: true });
  const [selectedUserId, setSelectedUserId] = useState('');
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    if (selectedRoom) {
      setRoomForm({ name: selectedRoom.name, isActive: selectedRoom.isActive });
    }
  }, [selectedRoom]);

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
      setRoomForm({ name: '', isActive: true });
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
      setFeedback('Usuario añadido a la sala.');
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

  if (loading) {
    return <StateCard>Cargando salas...</StateCard>;
  }

  return (
    <div className="page-stack two-column">
      <section className="panel-card">
        <PageHeader title="Salas" description="Administración de salas y membresías disponibles en el backend actual." />
        {error ? <StateCard tone="error">{error}</StateCard> : null}
        {feedback ? <StateCard tone="success">{feedback}</StateCard> : null}
        <SectionTable headers={['Sala', 'Estado', 'Usuarios', 'Acción']}>
          {rooms.map((room) => (
            <tr key={room.id}>
              <td>{room.name}</td>
              <td>
                <StatusBadge label={room.isActive ? 'Activa' : 'Deshabilitada'} tone={room.isActive ? 'success' : 'muted'} />
              </td>
              <td>{room.roomUsers?.length ?? 0}</td>
              <td>
                <button className="table-button" type="button" onClick={() => setSelectedRoom(room)}>
                  Gestionar
                </button>
              </td>
            </tr>
          ))}
        </SectionTable>
      </section>

      <section className="panel-card">
        <PageHeader title={selectedRoom ? 'Gestionar sala' : 'Crear sala'} description="Incluye alta, edición y membresías." />
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
              onChange={(event) => setRoomForm((current) => ({ ...current, isActive: event.target.value === 'true' }))}
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
            <div className="inline-actions">
              <select value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value)}>
                <option value="">Selecciona usuario</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} (@{user.username})
                  </option>
                ))}
              </select>
              <button className="secondary-button" type="button" onClick={attachUser}>
                Añadir usuario
              </button>
            </div>
            <SectionTable headers={['Miembro', 'Rol', 'Acción']}>
              {(selectedRoom.roomUsers ?? []).map((membership) => (
                <tr key={membership.id}>
                  <td>{membership.user.name}</td>
                  <td>{membership.user.role}</td>
                  <td>
                    <button
                      className="table-button danger"
                      type="button"
                      onClick={() => detachUser(selectedRoom.id, membership.user.id)}
                    >
                      Quitar
                    </button>
                  </td>
                </tr>
              ))}
            </SectionTable>
          </>
        ) : null}
      </section>
    </div>
  );
}

function AdminMatchesPage() {
  const { rooms, matchesByRoom, loading, error, refresh } = useCatalogData();
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [editingMatch, setEditingMatch] = useState<Match | null>(null);
  const [feedback, setFeedback] = useState('');
  const [form, setForm] = useState<MatchPayload>({
    teamA: '',
    teamB: '',
    matchDate: '',
    teamAScore: null,
    teamBScore: null,
    status: MatchStatus.SCHEDULED,
    isActive: true,
  });

  useEffect(() => {
    if (editingMatch) {
      setSelectedRoomId(editingMatch.roomId);
      setForm({
        teamA: editingMatch.teamA,
        teamB: editingMatch.teamB,
        matchDate: toDateTimeLocalValue(editingMatch.matchDate),
        teamAScore: editingMatch.teamAScore,
        teamBScore: editingMatch.teamBScore,
        status: editingMatch.status,
        isActive: editingMatch.isActive,
      });
    }
  }, [editingMatch]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (form.teamA.trim().toLowerCase() === form.teamB.trim().toLowerCase()) {
      setFeedback('Los equipos no pueden ser iguales.');
      return;
    }

    try {
      const payload: MatchPayload = {
        ...form,
        matchDate: fromDateTimeLocalValue(form.matchDate),
      };

      if (editingMatch) {
        await matchesService.update(editingMatch.id, payload);
        setFeedback('Partido actualizado correctamente.');
      } else if (selectedRoomId) {
        await matchesService.create(selectedRoomId, payload);
        setFeedback('Partido creado correctamente.');
      } else {
        setFeedback('Selecciona una sala para registrar el partido.');
        return;
      }

      setEditingMatch(null);
      setForm({
        teamA: '',
        teamB: '',
        matchDate: '',
        teamAScore: null,
        teamBScore: null,
        status: MatchStatus.SCHEDULED,
        isActive: true,
      });
      await refresh();
    } catch (requestError) {
      setFeedback(extractErrorMessage(requestError));
    }
  }

  const allMatches = Object.values(matchesByRoom).flat();

  if (loading) {
    return <StateCard>Cargando partidos...</StateCard>;
  }

  return (
    <div className="page-stack two-column">
      <section className="panel-card">
        <PageHeader title="Partidos" description="Alta y mantenimiento por sala. El cierre real sigue dependiendo del backend." />
        {error ? <StateCard tone="error">{error}</StateCard> : null}
        {feedback ? <StateCard tone="success">{feedback}</StateCard> : null}
        <SectionTable headers={['Sala', 'Partido', 'Fecha Bolivia', 'Estado', 'Resultado', 'Acción']}>
          {allMatches.map((match) => {
            const room = rooms.find((item) => item.id === match.roomId);
            const statusLabel = getMatchVisualStatus(match.matchDate, match.status);
            return (
              <tr key={match.id}>
                <td>{room?.name ?? 'Sin sala'}</td>
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
      </section>

      <section className="panel-card">
        <PageHeader title={editingMatch ? 'Editar partido' : 'Crear partido'} description="Validación de goles, estado y fecha local." />
        <form className="form-grid" onSubmit={handleSubmit}>
          <label>
            Sala
            <select value={selectedRoomId} onChange={(event) => setSelectedRoomId(event.target.value)} required>
              <option value="">Selecciona sala</option>
              {rooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Equipo A
            <input required value={form.teamA} onChange={(event) => setForm((current) => ({ ...current, teamA: event.target.value }))} />
          </label>
          <label>
            Equipo B
            <input required value={form.teamB} onChange={(event) => setForm((current) => ({ ...current, teamB: event.target.value }))} />
          </label>
          <label>
            Fecha y hora
            <input
              type="datetime-local"
              required
              value={form.matchDate}
              onChange={(event) => setForm((current) => ({ ...current, matchDate: event.target.value }))}
            />
          </label>
          <label>
            Goles A
            <input
              type="number"
              min={0}
              value={form.teamAScore ?? ''}
              onChange={(event) =>
                setForm((current) => ({
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
              value={form.teamBScore ?? ''}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  teamBScore: event.target.value === '' ? null : Number(event.target.value),
                }))
              }
            />
          </label>
          <label>
            Estado
            <select
              value={form.status}
              onChange={(event) => setForm((current) => ({ ...current, status: event.target.value as MatchStatus }))}
            >
              <option value={MatchStatus.SCHEDULED}>SCHEDULED</option>
              <option value={MatchStatus.CLOSED}>CLOSED</option>
              <option value={MatchStatus.FINISHED}>FINISHED</option>
            </select>
          </label>
          <label>
            Activo
            <select
              value={String(form.isActive)}
              onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.value === 'true' }))}
            >
              <option value="true">Sí</option>
              <option value="false">No</option>
            </select>
          </label>
          <button className="primary-button" type="submit">
            {editingMatch ? 'Guardar partido' : 'Crear partido'}
          </button>
        </form>
      </section>
    </div>
  );
}

function LeaderboardTable({ items }: { items: LeaderboardItem[] }) {
  if (items.length === 0) {
    return <StateCard>No hay datos suficientes para construir la tabla todavía.</StateCard>;
  }

  return (
    <SectionTable headers={['Usuario', 'Puntos', 'Pronósticos', 'Exactos', 'Ganador/empate']}>
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

function AdminLeaderboardPage() {
  const { rooms, matchesByRoom, predictionsByMatch, loading, error } = useCatalogData();
  const [roomId, setRoomId] = useState('');

  const room = rooms.find((item) => item.id === roomId) ?? rooms[0];
  const matches = room ? matchesByRoom[room.id] ?? [] : [];
  const leaderboard = room
    ? buildLeaderboard(getRoomMembers(room), getCurrentRoomPredictions(room.id, matches, predictionsByMatch), matches)
    : [];

  useEffect(() => {
    if (!roomId && rooms[0]) {
      setRoomId(rooms[0].id);
    }
  }, [roomId, rooms]);

  if (loading) {
    return <StateCard>Cargando tabla...</StateCard>;
  }

  return (
    <div className="page-stack">
      <PageHeader title="Tabla de posiciones" description="Tabla derivada en frontend porque el backend aún no expone leaderboard." />
      {error ? <StateCard tone="error">{error}</StateCard> : null}
      <div className="inline-actions">
        <select value={roomId} onChange={(event) => setRoomId(event.target.value)}>
          {rooms.map((currentRoom) => (
            <option key={currentRoom.id} value={currentRoom.id}>
              {currentRoom.name}
            </option>
          ))}
        </select>
      </div>
      <StateCard tone="warning">
        Puntos oficiales y orden final dependen de un futuro endpoint de cálculo/leaderboard. Aquí se muestran los datos
        guardados actualmente.
      </StateCard>
      <LeaderboardTable items={leaderboard} />
    </div>
  );
}

function UserDashboardPage() {
  const { currentUser } = useAuth();
  const { rooms, matchesByRoom, loading, error } = useCatalogData();
  const myRooms = rooms.filter((room) => room.roomUsers?.some((membership) => membership.userId === currentUser?.id));
  const upcomingMatches = myRooms.flatMap((room) => matchesByRoom[room.id] ?? []).filter((match) => !isPredictionLocked(match.matchDate, match.status));

  if (loading) {
    return <StateCard>Cargando panel de usuario...</StateCard>;
  }

  return (
    <div className="page-stack">
      <PageHeader title="Dashboard Usuario" description={`Bienvenido, ${currentUser?.name ?? ''}.`} />
      {error ? <StateCard tone="error">{error}</StateCard> : null}
      <div className="stats-grid">
        <StatTile label="Mis salas" value={myRooms.length} />
        <StatTile label="Partidos pronosticables" value={upcomingMatches.length} />
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
      setFeedback('Perfil actualizado. Si cambió el rol en backend, el próximo login refrescará la sesión.');
    } catch (requestError) {
      setFeedback(extractErrorMessage(requestError));
    }
  }

  return (
    <div className="page-stack">
      <PageHeader title="Perfil" description="Edición básica de tus datos. El rol no se expone para cambios de usuario." />
      {feedback ? <StateCard tone="success">{feedback}</StateCard> : null}
      <form className="form-grid panel-card" onSubmit={handleSubmit}>
        <label>
          Nombre
          <input required value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
        </label>
        <label>
          Username
          <input required value={form.username} onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))} />
        </label>
        <label>
          Email
          <input type="email" required value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
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
  const { rooms, matchesByRoom, loading, error } = useCatalogData();
  const [roomId, setRoomId] = useState('');
  const myRooms = rooms.filter((room) => room.roomUsers?.some((membership) => membership.userId === currentUser?.id));

  useEffect(() => {
    if (!roomId && myRooms[0]) {
      setRoomId(myRooms[0].id);
    }
  }, [myRooms, roomId]);

  const selectedRoom = myRooms.find((room) => room.id === roomId) ?? myRooms[0];

  if (loading) {
    return <StateCard>Cargando tus salas...</StateCard>;
  }

  return (
    <div className="page-stack">
      <PageHeader title="Mis salas" description="Consulta tus salas y los partidos asociados." />
      {error ? <StateCard tone="error">{error}</StateCard> : null}
      {myRooms.length === 0 ? (
        <StateCard>No hay salas registradas para tu usuario.</StateCard>
      ) : (
        <>
          <div className="inline-actions">
            <select value={selectedRoom?.id ?? ''} onChange={(event) => setRoomId(event.target.value)}>
              {myRooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
            </select>
          </div>
          <SectionTable headers={['Partido', 'Fecha Bolivia', 'Estado', 'Resultado']}>
            {(selectedRoom ? matchesByRoom[selectedRoom.id] ?? [] : []).map((match) => {
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
        </>
      )}
    </div>
  );
}

function UserPredictionsPage() {
  const { currentUser } = useAuth();
  const { rooms, matchesByRoom, predictionsByMatch, loading, error, refresh } = useCatalogData();
  const [feedback, setFeedback] = useState('');

  const myRooms = rooms.filter((room) => room.roomUsers?.some((membership) => membership.userId === currentUser?.id));
  const matches = myRooms.flatMap((room) => matchesByRoom[room.id] ?? []);

  async function submitPrediction(match: Match, formData: FormData) {
    if (!currentUser) {
      return;
    }

    const predictedTeamAScore = Number(formData.get(`teamA-${match.id}`));
    const predictedTeamBScore = Number(formData.get(`teamB-${match.id}`));

    if (predictedTeamAScore < 0 || predictedTeamBScore < 0) {
      setFeedback('Los goles no pueden ser negativos.');
      return;
    }

    const existingPrediction = (predictionsByMatch[match.id] ?? []).find((item) => item.userId === currentUser.id);

    try {
      if (existingPrediction) {
        await predictionsService.update(existingPrediction.id, {
          predictedTeamAScore,
          predictedTeamBScore,
        });
        setFeedback('Pronóstico actualizado.');
      } else {
        await predictionsService.create(match.id, {
          userId: currentUser.id,
          predictedTeamAScore,
          predictedTeamBScore,
        });
        setFeedback('Pronóstico guardado.');
      }
      await refresh();
    } catch (requestError) {
      setFeedback(extractErrorMessage(requestError));
    }
  }

  if (loading) {
    return <StateCard>Cargando pronósticos...</StateCard>;
  }

  return (
    <div className="page-stack">
      <PageHeader title="Pronósticos" description="Edición disponible mientras el partido no esté cerrado por tiempo o estado." />
      {error ? <StateCard tone="error">{error}</StateCard> : null}
      {feedback ? <StateCard tone="success">{feedback}</StateCard> : null}
      {matches.length === 0 ? (
        <StateCard>Todavía no realizaste pronósticos ni tienes partidos disponibles en tus salas.</StateCard>
      ) : (
        matches.map((match) => {
          const myPrediction = (predictionsByMatch[match.id] ?? []).find((item) => item.userId === currentUser?.id);
          const locked = isPredictionLocked(match.matchDate, match.status);
          const statusLabel = getMatchVisualStatus(match.matchDate, match.status);

          return (
            <section key={match.id} className="panel-card">
              <div className="match-row">
                <div>
                  <h3>
                    {match.teamA} vs {match.teamB}
                  </h3>
                  <p className="page-description">{formatDateTime(match.matchDate)}</p>
                </div>
                <StatusBadge label={statusLabel} tone={toneForMatchStatus(statusLabel)} />
              </div>
              <form
                className="prediction-form"
                onSubmit={async (event) => {
                  event.preventDefault();
                  await submitPrediction(match, new FormData(event.currentTarget));
                }}
              >
                <label>
                  {match.teamA}
                  <input
                    name={`teamA-${match.id}`}
                    type="number"
                    min={0}
                    defaultValue={myPrediction?.predictedTeamAScore ?? ''}
                    disabled={locked}
                    required
                  />
                </label>
                <label>
                  {match.teamB}
                  <input
                    name={`teamB-${match.id}`}
                    type="number"
                    min={0}
                    defaultValue={myPrediction?.predictedTeamBScore ?? ''}
                    disabled={locked}
                    required
                  />
                </label>
                <button className="primary-button" type="submit" disabled={locked}>
                  {myPrediction ? 'Actualizar pronóstico' : 'Guardar pronóstico'}
                </button>
              </form>
              {myPrediction ? (
                <StateCard>
                  Tu registro actual: {myPrediction.predictedTeamAScore} - {myPrediction.predictedTeamBScore}
                  {' · '}
                  {myPrediction.points ?? 0} puntos.
                </StateCard>
              ) : null}
              {locked ? (
                <StateCard tone="warning">
                  Las predicciones dejan de mostrarse como editables 5 minutos antes del inicio, pero la validación final
                  depende del backend.
                </StateCard>
              ) : null}
            </section>
          );
        })
      )}
    </div>
  );
}

function UserLeaderboardPage() {
  const { currentUser } = useAuth();
  const { rooms, matchesByRoom, predictionsByMatch, loading, error } = useCatalogData();
  const myRooms = rooms.filter((room) => room.roomUsers?.some((membership) => membership.userId === currentUser?.id));
  const [roomId, setRoomId] = useState('');

  useEffect(() => {
    if (!roomId && myRooms[0]) {
      setRoomId(myRooms[0].id);
    }
  }, [myRooms, roomId]);

  const room = myRooms.find((item) => item.id === roomId) ?? myRooms[0];
  const matches = room ? matchesByRoom[room.id] ?? [] : [];
  const leaderboard = room
    ? buildLeaderboard(getRoomMembers(room), getCurrentRoomPredictions(room.id, matches, predictionsByMatch), matches)
    : [];

  if (loading) {
    return <StateCard>Cargando tabla del usuario...</StateCard>;
  }

  return (
    <div className="page-stack">
      <PageHeader title="Tabla" description="Clasificación de tu sala usando los datos disponibles hoy." />
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
        <StateCard>No perteneces a ninguna sala todavía.</StateCard>
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
          <Route element={<ProtectedRoute allowedRoles={[UserRole.ADMIN]} />}>
            <Route path="/admin" element={<AdminDashboardPage />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/admin/rooms" element={<AdminRoomsPage />} />
            <Route path="/admin/matches" element={<AdminMatchesPage />} />
            <Route path="/admin/leaderboard" element={<AdminLeaderboardPage />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={[UserRole.USER]} />}>
            <Route path="/user" element={<UserDashboardPage />} />
            <Route path="/user/profile" element={<UserProfilePage />} />
            <Route path="/user/rooms" element={<UserRoomsPage />} />
            <Route path="/user/predictions" element={<UserPredictionsPage />} />
            <Route path="/user/leaderboard" element={<UserLeaderboardPage />} />
          </Route>
        </Route>
      </Route>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
