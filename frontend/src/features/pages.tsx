import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Link, Navigate, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { AppShell } from '../layout/AppShell';
import { useAuth } from '../context/AuthContext';
import { ProtectedRoute } from '../routes/ProtectedRoute';
import { matchesService, type MatchPayload } from '../services/matchesService';
import { predictionsService } from '../services/predictionsService';
import { roomsService } from '../services/roomsService';
import { extractErrorMessage } from '../services/api';
import { usersService, type UserPayload } from '../services/usersService';
import { ThemeToggle } from '../components/ThemeToggle';
import { InternalMatchScoreCard } from '../components/InternalMatchScoreCard';
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

type RoomDetailTab = 'matches' | 'pending-predictions' | 'predictions' | 'room-predictions';
type UserRoomSection = 'overview' | 'leaderboard' | 'explore';
type AdminRoomMainSection = 'overview' | 'settings' | 'leaderboard' | 'manage';
type AdminRoomSection = 'overview' | 'members' | 'matches';
type AdminRoomDetailTab = 'members' | 'matches' | 'room-predictions';
type MatchDayOption = {
  value: string;
  label: string;
  dayNumber: string;
  monthLabel: string;
};

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

function formatMatchDayNumber(matchDate: string) {
  return new Intl.DateTimeFormat('es-BO', {
    day: '2-digit',
    timeZone: 'America/La_Paz',
  }).format(new Date(matchDate));
}

function formatMatchDayMonth(matchDate: string) {
  return new Intl.DateTimeFormat('es-BO', {
    month: 'short',
    timeZone: 'America/La_Paz',
  }).format(new Date(matchDate));
}

function getLatestMatchDayValue(options: MatchDayOption[]) {
  return options.length > 0 ? options[options.length - 1].value : 'all';
}

function MatchDayCarousel({
  value,
  options,
  onChange,
}: {
  value: string;
  options: MatchDayOption[];
  onChange: (value: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const activeChip = scrollRef.current?.querySelector<HTMLButtonElement>('[data-active="true"]');
    activeChip?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [value]);

  function scrollChips(direction: 'left' | 'right') {
    const container = scrollRef.current;

    if (!container) {
      return;
    }

    const amount = Math.max(container.clientWidth * 0.75, 180);
    container.scrollBy({
      left: direction === 'left' ? -amount : amount,
      behavior: 'smooth',
    });
  }

  return (
    <div className="matchday-carousel">
      <button
        className="matchday-arrow"
        type="button"
        aria-label="Desplazar fechas a la izquierda"
        onClick={() => scrollChips('left')}
      >
        ‹
      </button>
      <div ref={scrollRef} className="matchday-scroll" role="tablist" aria-label="Fechas con partidos">
        {options.map((option) => (
          <button
            key={option.value}
            className={`matchday-chip ${value === option.value ? 'active' : ''}`}
            data-active={value === option.value}
            type="button"
            title={option.label}
            onClick={() => onChange(option.value)}
          >
            <strong>{option.dayNumber}</strong>
            <span>{option.monthLabel}</span>
          </button>
        ))}
      </div>
      <button
        className="matchday-arrow"
        type="button"
        aria-label="Desplazar fechas a la derecha"
        onClick={() => scrollChips('right')}
      >
        ›
      </button>
    </div>
  );
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
              <th key={header} className={header === 'Puntos' ? 'points-column' : undefined}>
                {header}
              </th>
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
        <div className="auth-theme-toggle">
          <ThemeToggle />
        </div>

        <div className="auth-brand">
          <img src="/ball.png" alt="Balon oficial" />
          <img className="auth-logo" src="/pronostidamus.png" alt="Pronostidamus" />
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
  const [isUserFormOpen, setIsUserFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const [form, setForm] = useState<UserPayload>({
    name: '',
    username: '',
    email: '',
    password: '',
    role: UserRole.USER,
    isActive: true,
  });

  function resetUserForm() {
    setForm({
      name: '',
      username: '',
      email: '',
      password: '',
      role: UserRole.USER,
      isActive: true,
    });
  }

  function openCreateUserForm() {
    setEditingUser(null);
    resetUserForm();
    setFeedback(null);
    setIsUserFormOpen(true);
  }

  function openEditUserForm(user: User) {
    setEditingUser(user);
    setFeedback(null);
    setIsUserFormOpen(true);
  }

  function closeUserForm() {
    setIsUserFormOpen(false);
    setEditingUser(null);
    resetUserForm();
  }

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
      setFeedback(null);
      const payload: UserPayload = {
        ...form,
        ...(form.password?.trim() ? { password: form.password } : {}),
      };

      if (editingUser) {
        await usersService.update(editingUser.id, payload);
        setFeedback({ tone: 'success', message: 'Usuario actualizado correctamente.' });
      } else {
        await usersService.create(payload);
        setFeedback({ tone: 'success', message: 'Usuario creado correctamente.' });
      }

      closeUserForm();
      await refresh();
    } catch (requestError) {
      setFeedback({ tone: 'error', message: extractErrorMessage(requestError) });
    }
  }

  const totalAdmins = users.filter((user) => user.role === UserRole.ADMIN).length;
  const activeUsers = users.filter((user) => user.isActive).length;
  const inactiveUsers = users.length - activeUsers;
  const normalizedSearchTerm = searchTerm.trim().toLowerCase();
  const filteredUsers = normalizedSearchTerm
    ? users.filter((user) =>
        [user.name, user.username, user.email, user.role]
          .join(' ')
          .toLowerCase()
          .includes(normalizedSearchTerm),
      )
    : users;

  if (loading) {
    return <AppLoadingScreen message="Cargando usuarios..." />;
  }

  return (
    <div className="page-stack">
      <section className="panel-card">
        <PageHeader
          title="Gestion de usuarios"
          description="Administra accesos desde una lista clara. Crea o edita usuarios en un unico panel contextual."
          actions={
            <button className="primary-button" type="button" onClick={openCreateUserForm}>
              Nuevo usuario
            </button>
          }
        />
        {error ? <StateCard tone="error">{error}</StateCard> : null}
        {feedback ? <StateCard tone={feedback.tone}>{feedback.message}</StateCard> : null}
        <div className="stats-grid compact-stats-grid admin-user-stats">
          <StatTile label="Registrados" value={users.length} />
          <StatTile label="Administradores" value={totalAdmins} />
          <StatTile label="Activos" value={activeUsers} />
          <StatTile label="Deshabilitados" value={inactiveUsers} />
        </div>
      </section>

      <section className="panel-card">
        <div className="users-toolbar">
          <div>
            <h3>Usuarios del sistema</h3>
            <p className="page-description">
              {filteredUsers.length} de {users.length} usuarios visibles
            </p>
          </div>
          <label className="search-field">
            Buscar usuario
            <input
              value={searchTerm}
              placeholder="Nombre, username, email o rol"
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </label>
        </div>
        {filteredUsers.length === 0 ? (
          <StateCard>No encontramos usuarios con ese criterio.</StateCard>
        ) : (
          <SectionTable headers={['Usuario', 'Contacto', 'Rol', 'Salas', 'Estado', 'Accion']}>
            {filteredUsers.map((user) => (
              <tr key={user.id}>
                <td>
                  <strong>{user.name}</strong>
                  <div className="muted-text">@{user.username}</div>
                </td>
                <td>{user.email}</td>
                <td>{user.role}</td>
                <td>{getUserRoomCount(rooms, user.id)}</td>
                <td>
                  <StatusBadge
                    label={user.isActive ? 'Activo' : 'Deshabilitado'}
                    tone={user.isActive ? 'success' : 'muted'}
                  />
                </td>
                <td>
                  <button className="table-button" type="button" onClick={() => openEditUserForm(user)}>
                    Editar
                  </button>
                </td>
              </tr>
            ))}
          </SectionTable>
        )}
      </section>

      {isUserFormOpen ? (
        <div className="modal-backdrop" role="presentation">
          <section
            className="modal-card user-form-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="user-form-title"
          >
            <div className="modal-header">
              <div>
                <h3 id="user-form-title">{editingUser ? 'Editar usuario' : 'Crear usuario'}</h3>
                <p className="page-description">
                  {editingUser
                    ? 'Actualiza los datos de acceso. La contrasena solo cambia si escribes una nueva.'
                    : 'Registra los datos basicos para habilitar un nuevo acceso.'}
                </p>
              </div>
              <button className="table-button" type="button" onClick={closeUserForm}>
                Cerrar
              </button>
            </div>
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
            <form className="form-grid form-grid-balanced" onSubmit={handleSubmit}>
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
              <button className="primary-button form-submit" type="submit">
                {editingUser ? 'Guardar cambios' : 'Crear usuario'}
              </button>
            </form>
          </section>
        </div>
      ) : null}
    </div>
  );
}

function AdminRoomsPage() {
  const { rooms, users, matchesByRoom, predictionsByMatch, loading, error, refresh } = useCatalogData();
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [activeSection, setActiveSection] = useState<AdminRoomSection>('overview');
  const [roomForm, setRoomForm] = useState({ name: '', isActive: true });
  const [isRoomFormOpen, setIsRoomFormOpen] = useState(false);
  const [roomSearchTerm, setRoomSearchTerm] = useState('');
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

  function openCreateRoomForm() {
    setSelectedRoom(null);
    setRoomForm({ name: '', isActive: true });
    setIsRoomFormOpen(true);
  }

  function closeRoomForm() {
    setIsRoomFormOpen(false);
    setSelectedRoom(null);
    setRoomForm({ name: '', isActive: true });
  }

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

      closeRoomForm();
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
  const activeRooms = rooms.filter((room) => room.isActive).length;
  const totalMembers = rooms.reduce((total, room) => total + (room.roomUsers?.length ?? 0), 0);
  const totalMatches = Object.values(matchesByRoom).reduce((total, matches) => total + matches.length, 0);
  const normalizedRoomSearchTerm = roomSearchTerm.trim().toLowerCase();
  const filteredRooms = normalizedRoomSearchTerm
    ? rooms.filter((room) => room.name.toLowerCase().includes(normalizedRoomSearchTerm))
    : rooms;

  if (loading) {
    return <AppLoadingScreen message="Cargando salas..." />;
  }

  return (
    <div className="page-stack">
      <section className="panel-card">
        <PageHeader
          title="Gestion de salas"
          description="Administra las salas desde una lista clara. La creacion se abre solo cuando la necesitas."
          actions={
            <button className="primary-button" type="button" onClick={openCreateRoomForm}>
              Nueva sala
            </button>
          }
        />
        {error ? <StateCard tone="error">{error}</StateCard> : null}
        {feedback ? <StateCard tone="success">{feedback}</StateCard> : null}
        <div className="stats-grid compact-stats-grid admin-user-stats">
          <StatTile label="Salas creadas" value={rooms.length} />
          <StatTile label="Activas" value={activeRooms} />
          <StatTile label="Miembros" value={totalMembers} />
          <StatTile label="Partidos" value={totalMatches} />
        </div>
      </section>

      <section className="panel-card">
        <div className="users-toolbar">
          <div>
            <h3>Salas del sistema</h3>
            <p className="page-description">
              {filteredRooms.length} de {rooms.length} salas visibles
            </p>
          </div>
          <label className="search-field">
            Buscar sala
            <input
              value={roomSearchTerm}
              placeholder="Nombre de la sala"
              onChange={(event) => setRoomSearchTerm(event.target.value)}
            />
          </label>
        </div>
        {filteredRooms.length === 0 ? (
          <StateCard>No encontramos salas con ese criterio.</StateCard>
        ) : (
          <SectionTable headers={['Sala', 'Estado', 'Miembros', 'Actividad', 'Accion']}>
          {filteredRooms.map((room) => {
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
        )}
      </section>

      {isRoomFormOpen ? (
        <div className="modal-backdrop" role="presentation">
          <section
            className="modal-card user-form-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="room-form-title"
          >
            <div className="modal-header">
              <div>
                <h3 id="room-form-title">Crear sala</h3>
                <p className="page-description">
                  Crea el espacio y luego entra a gestionarlo para agregar miembros y partidos.
                </p>
              </div>
              <button className="table-button" type="button" onClick={closeRoomForm}>
                Cerrar
              </button>
            </div>
            <form className="form-grid form-grid-balanced" onSubmit={saveRoom}>
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
              <button className="primary-button form-submit" type="submit">
                Crear sala
              </button>
            </form>
          </section>
        </div>
      ) : null}
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

        <form className="form-grid form-grid-balanced" onSubmit={saveRoom}>
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
          <button className="primary-button form-submit" type="submit">
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
            <form className="form-grid form-grid-balanced" onSubmit={saveMatch}>
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
              <div className="modal-actions form-submit">
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
  const [activeSection, setActiveSection] = useState<AdminRoomMainSection>('overview');
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

  const roomMatches = room ? sortMatchesByDate(matchesByRoom[room.id] ?? []) : [];
  const finishedMatches = roomMatches.filter((match) => match.status === MatchStatus.FINISHED);
  const roomMemberIds = new Set((room?.roomUsers ?? []).map((membership) => membership.userId));
  const availableUsers = users.filter((user) => !roomMemberIds.has(user.id));
  const isEditingMatch = Boolean(editingMatch);
  const isMatchModalOpen = isEditingMatch || isAddMatchModalOpen;
  const leaderboard = buildLeaderboard(
    room ? getRoomMembers(room) : [],
    getCurrentRoomPredictions(roomMatches, predictionsByMatch),
    roomMatches,
  );
  const matchDayOptions = roomMatches.reduce<Array<MatchDayOption>>((options, match) => {
    const value = getMatchDayKey(match.matchDate);

    if (options.some((option) => option.value === value)) {
      return options;
    }

    return [
      ...options,
      {
        value,
        label: formatMatchDayLabel(match.matchDate),
        dayNumber: formatMatchDayNumber(match.matchDate),
        monthLabel: formatMatchDayMonth(match.matchDate),
      },
    ];
  }, []);
  const filteredPredictionMatches =
    matchDayFilter === 'all'
      ? roomMatches
      : roomMatches.filter((match) => getMatchDayKey(match.matchDate) === matchDayFilter);

  useEffect(() => {
    if (matchDayOptions.length === 0) {
      return;
    }

    const latestMatchDayValue = getLatestMatchDayValue(matchDayOptions);
    const currentExists = matchDayOptions.some((option) => option.value === matchDayFilter);

    if (matchDayFilter === 'all' || !currentExists) {
      setMatchDayFilter(latestMatchDayValue);
    }
  }, [matchDayFilter, matchDayOptions]);

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

  return (
    <div className="page-stack">
      <PageHeader title={room.name} actions={<Link className="secondary-button" to="/admin/rooms">Volver a salas</Link>} />
      {error ? <StateCard tone="error">{error}</StateCard> : null}
      {feedback ? <StateCard tone="success">{feedback}</StateCard> : null}

      <section className="panel-card">
        <div className="admin-room-section-nav">
          <button
            className={`room-section-button ${activeSection === 'overview' ? 'active' : ''}`}
            type="button"
            onClick={() => setActiveSection('overview')}
          >
            <span>Resumen</span>
          </button>
          <button
            className={`room-section-button ${activeSection === 'settings' ? 'active' : ''}`}
            type="button"
            onClick={() => setActiveSection('settings')}
          >
            <span>Configuracion</span>
          </button>
          <button
            className={`room-section-button ${activeSection === 'leaderboard' ? 'active' : ''}`}
            type="button"
            onClick={() => setActiveSection('leaderboard')}
          >
            <span>Tabla</span>
          </button>
          <button
            className={`room-section-button ${activeSection === 'manage' ? 'active' : ''}`}
            type="button"
            onClick={() => setActiveSection('manage')}
          >
            <span>Gestion</span>
          </button>
        </div>
      </section>

      {activeSection === 'overview' ? (
        <section className="panel-card">
          <div className="section-heading">
            <div>
              <h3>Resumen de la sala</h3>
            </div>
            <StatusBadge label={room.isActive ? 'Activa' : 'Deshabilitada'} tone={room.isActive ? 'success' : 'muted'} />
          </div>
          <div className="stats-grid room-summary-stats">
            <StatTile label="Miembros" value={room.roomUsers?.length ?? 0} />
            <StatTile label="Partidos" value={roomMatches.length} />
            <StatTile label="Finalizados" value={finishedMatches.length} />
            <StatTile
              label="Pronosticos"
              value={roomMatches.flatMap((match) => predictionsByMatch[match.id] ?? []).length}
            />
          </div>
          <div className="room-summary-grid">
            <article className="subsection-card compact-card">
              <div className="subsection-heading">
                <h3>Estado</h3>
              </div>
              <strong className="summary-highlight">
                {room.isActive ? 'Sala activa' : 'Sala deshabilitada'}
              </strong>
              <button className="secondary-button" type="button" onClick={() => setActiveSection('settings')}>
                Ir a configuracion
              </button>
            </article>
            <article className="subsection-card compact-card">
              <div className="subsection-heading">
                <h3>Competencia</h3>
              </div>
              <strong className="summary-highlight">
                {leaderboard.length > 0
                  ? `${leaderboard[0]?.name ?? 'Sin datos'} - ${leaderboard[0]?.points ?? 0} pts`
                  : 'Sin movimientos'}
              </strong>
              <button className="secondary-button" type="button" onClick={() => setActiveSection('leaderboard')}>
                Ver tabla
              </button>
            </article>
          </div>
        </section>
      ) : null}

      {activeSection === 'settings' ? (
        <section className="panel-card">
          <div className="section-heading">
            <div>
              <h3>Configuracion de la sala</h3>
            </div>
          </div>
          <form className="form-grid form-grid-balanced constrained-form" onSubmit={saveRoom}>
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
            <button className="primary-button form-submit" type="submit">
              Guardar sala
            </button>
          </form>
        </section>
      ) : null}

      {activeSection === 'leaderboard' ? (
        <section className="panel-card">
          <div className="section-heading">
            <div>
              <h3>Tabla de la sala</h3>
            </div>
          </div>
          <LeaderboardTable items={leaderboard} />
        </section>
      ) : null}

      {activeSection === 'manage' ? (
        <section className="panel-card">
        <div className="section-heading">
          <div>
            <h3>Gestion de la sala</h3>
          </div>
        </div>
        <div className="explore-toolbar">
        <div className="tab-switcher tab-switcher-scroll" role="tablist" aria-label="Secciones de gestion de la sala">
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
        {(activeTab === 'matches' || activeTab === 'room-predictions') && matchDayOptions.length > 0 ? (
          <MatchDayCarousel
            value={matchDayFilter}
            options={matchDayOptions}
            onChange={setMatchDayFilter}
          />
        ) : null}
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
              ) : filteredPredictionMatches.length === 0 ? (
                <StateCard>No hay partidos para la fecha seleccionada.</StateCard>
              ) : (
                <SectionTable headers={['Partido', 'Fecha Bolivia', 'Estado', 'Resultado', 'Accion']}>
                  {filteredPredictionMatches.map((match) => {
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
      ) : null}

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
            <form className="form-grid form-grid-balanced" onSubmit={saveMatch}>
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
              <div className="modal-actions form-submit">
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
          <td className="points-column">
            <span className="points-value">{item.points}</span>
          </td>
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
  const showExternalScoreOnly = isLocked;

  return (
    <section className={`panel-card prediction-card ${isSubmitting ? 'is-submitting' : ''}`}>
      <div className={`match-row prediction-card-header ${showExternalScoreOnly ? 'prediction-card-header--compact' : ''}`}>
        {!showExternalScoreOnly ? (
          <div>
            <h3>
              {match.teamA} vs {match.teamB}
            </h3>
            <p className="page-description">{formatDateTime(match.matchDate)}</p>
          </div>
        ) : (
          <div className="prediction-card-forecast">
            {prediction ? (
              <>
                <span className="muted-text">Mi pronostico</span>
                <strong>
                  {prediction.predictedTeamAScore} : {prediction.predictedTeamBScore}
                </strong>
              </>
            ) : null}
          </div>
        )}
        <div className="prediction-card-status">
          {prediction ? (
            <span className="prediction-points-chip">
              {prediction.points ?? 0} pt{prediction.points === 1 ? '' : 's'}
            </span>
          ) : null}
          <StatusBadge label={statusLabel} tone={toneForMatchStatus(statusLabel)} />
        </div>
      </div>
      {!showExternalScoreOnly ? (
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
      ) : null}
      {showExternalScoreOnly ? (
        <InternalMatchScoreCard match={match} />
      ) : null}
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
          <img className="app-loading-logo" src="/pronostidamus.png" alt="Pronostidamus" />
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
  const { rooms, matchesByRoom, predictionsByMatch, loading, error } = useCatalogData();
  const myRooms = getAccessibleRooms(rooms, currentUser);
  const roomPerformance = myRooms.map((room) => {
    const roomMatches = matchesByRoom[room.id] ?? [];
    const leaderboard = buildLeaderboard(
      getRoomMembers(room),
      getCurrentRoomPredictions(roomMatches, predictionsByMatch),
      roomMatches,
    );
    const myLeaderboardEntry = leaderboard.find((item) => item.userId === currentUser?.id);
    const evaluatedPredictions = roomMatches.filter((match) => {
      const hasResult = match.teamAScore !== null && match.teamBScore !== null;
      const prediction = (predictionsByMatch[match.id] ?? []).find(
        (item) => item.userId === currentUser?.id,
      );

      return hasResult && prediction;
    }).length;
    const totalHits = (myLeaderboardEntry?.exactHits ?? 0) + (myLeaderboardEntry?.outcomeHits ?? 0);
    const accuracy = evaluatedPredictions > 0 ? Math.round((totalHits / evaluatedPredictions) * 100) : 0;
    const pendingCount = roomMatches.filter((match) => {
      const hasPrediction = (predictionsByMatch[match.id] ?? []).some(
        (prediction) => prediction.userId === currentUser?.id,
      );

      return !isPredictionLocked(match.matchDate, match.status) && !hasPrediction;
    }).length;

    return {
      room,
      points: myLeaderboardEntry?.points ?? 0,
      exactHits: myLeaderboardEntry?.exactHits ?? 0,
      accuracy,
      evaluatedPredictions,
      pendingCount,
    };
  });

  if (loading) {
    return <AppLoadingScreen message="Cargando panel..." />;
  }

  return (
    <div className="page-stack user-dashboard-page">
      <header className="hero user-dashboard-hero">
        <h1>Bienvenido, {currentUser?.name ?? 'usuario'}</h1>
        <p className="page-description">
          Revisa tu rendimiento por sala y entra directo a donde quieras pronosticar o consultar resultados.
        </p>
      </header>
      {error ? <StateCard tone="error">{error}</StateCard> : null}

      <section className="dashboard-room-section">
        <div className="dashboard-room-headings">
          <h3>Mi rendimiento por sala</h3>
          <h3>Siguiente paso</h3>
        </div>
        {roomPerformance.length === 0 ? (
          <StateCard>Todavia no perteneces a ninguna sala.</StateCard>
        ) : (
          <div className="dashboard-room-rows">
            {roomPerformance.map(({ room, points, exactHits, accuracy, evaluatedPredictions, pendingCount }) => (
              <div key={room.id} className="dashboard-room-row">
                <article className="panel-card room-performance-card">
                  <div className="room-performance-card__header">
                    <div>
                      <span className="eyebrow">Sala</span>
                      <h3>{room.name}</h3>
                    </div>
                    <StatusBadge
                      label={room.isActive ? 'Activa' : 'Deshabilitada'}
                      tone={room.isActive ? 'success' : 'muted'}
                    />
                  </div>
                  <div className="room-performance-main">
                    <span className="muted-text">Puntos obtenidos</span>
                    <strong>{points} pts</strong>
                  </div>
                  <div className="room-performance-metrics">
                    <div>
                      <span className="muted-text">Exactos</span>
                      <strong>{exactHits}</strong>
                    </div>
                    <div>
                      <span className="muted-text">Acierto</span>
                      <strong>{accuracy}%</strong>
                    </div>
                    <div>
                      <span className="muted-text">Evaluados</span>
                      <strong>{evaluatedPredictions}</strong>
                    </div>
                  </div>
                  <Link className="secondary-button" to={`/user/rooms/${room.id}`}>
                    Ver sala
                  </Link>
                </article>
                <section className="panel-card compact-card room-pending-card">
                  <span className="eyebrow">{room.name}</span>
                  {pendingCount > 0 ? (
                    <>
                      <strong className="summary-highlight">
                        {pendingCount} pendiente{pendingCount === 1 ? '' : 's'}
                      </strong>
                      <p className="page-description">
                        Tienes pronosticos abiertos para completar antes de que cierren los partidos.
                      </p>
                    </>
                  ) : (
                    <>
                      <strong className="summary-highlight">Todo al dia</strong>
                      <p className="page-description">No tienes pronosticos pendientes en esta sala.</p>
                    </>
                  )}
                </section>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function UserProfilePage() {
  const { currentUser } = useAuth();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const [profile, setProfile] = useState({
    name: currentUser?.name ?? '',
    username: currentUser?.username ?? '',
    email: currentUser?.email ?? '',
  });
  const [form, setForm] = useState({
    name: currentUser?.name ?? '',
    username: currentUser?.username ?? '',
    email: currentUser?.email ?? '',
  });

  function startEditingProfile() {
    setForm(profile);
    setFeedback(null);
    setIsEditingProfile(true);
  }

  function cancelEditingProfile() {
    setForm(profile);
    setFeedback(null);
    setIsEditingProfile(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!currentUser) {
      return;
    }

    try {
      await usersService.update(currentUser.id, form);
      setProfile(form);
      setIsEditingProfile(false);
      setFeedback({ tone: 'success', message: 'Perfil actualizado correctamente.' });
    } catch (requestError) {
      setFeedback({ tone: 'error', message: extractErrorMessage(requestError) });
    }
  }

  return (
    <div className="page-stack">
      <PageHeader
        title="Perfil"
        description="Revisa tu informacion personal y edita solo cuando necesites cambiar algo."
      />
      {feedback ? <StateCard tone={feedback.tone}>{feedback.message}</StateCard> : null}
      <div className="profile-layout">
        <section className="panel-card profile-card">
          <div className="profile-card-header">
            <div className="profile-avatar" aria-hidden="true">
              {profile.name.trim().charAt(0).toUpperCase() || profile.username.trim().charAt(0).toUpperCase() || 'U'}
            </div>
            <div>
              <h3>{profile.name || 'Usuario'}</h3>
              <p className="page-description">@{profile.username || 'username'}</p>
            </div>
            {!isEditingProfile ? (
              <button className="primary-button" type="button" onClick={startEditingProfile}>
                Editar perfil
              </button>
            ) : null}
          </div>

          {!isEditingProfile ? (
            <div className="profile-read-grid">
              <div>
                <span className="muted-text">Nombre</span>
                <strong>{profile.name}</strong>
              </div>
              <div>
                <span className="muted-text">Username</span>
                <strong>@{profile.username}</strong>
              </div>
              <div>
                <span className="muted-text">Email</span>
                <strong>{profile.email}</strong>
              </div>
            </div>
          ) : (
            <form className="form-grid form-grid-balanced profile-edit-form" onSubmit={handleSubmit}>
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
              <label className="form-submit">
                Email
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                />
              </label>
              <div className="modal-actions form-submit">
                <button className="secondary-button" type="button" onClick={cancelEditingProfile}>
                  Cancelar
                </button>
                <button className="primary-button" type="submit">
                  Guardar cambios
                </button>
              </div>
            </form>
          )}
        </section>
        <aside className="panel-card profile-side-card">
          <h3>Cuenta</h3>
          <p className="page-description">
            Mantén tus datos actualizados para que tu nombre y contacto aparezcan correctamente en tus salas.
          </p>
          <div className="compact-metrics">
            <span>Perfil activo</span>
            <span>Datos editables</span>
          </div>
        </aside>
      </div>
    </div>
  );
}

function UserRoomsPage() {
  const { currentUser } = useAuth();
  const { rooms, matchesByRoom, predictionsByMatch, loading, error } = useCatalogData();
  const myRooms = getAccessibleRooms(rooms, currentUser);
  const activeRooms = myRooms.filter((room) => room.isActive).length;
  const totalMatches = myRooms.reduce(
    (total, room) => total + (matchesByRoom[room.id]?.length ?? 0),
    0,
  );
  const totalPredictions = myRooms.reduce((total, room) => {
    const roomMatches = matchesByRoom[room.id] ?? [];
    return total + roomMatches.flatMap((match) => predictionsByMatch[match.id] ?? []).length;
  }, 0);

  if (loading) {
    return <AppLoadingScreen message="Cargando salas..." />;
  }

  return (
    <div className="page-stack">
      <section className="panel-card user-rooms-hero">
        <div>
          <span className="eyebrow">Mis salas</span>
          <h2>Elige donde jugar</h2>
          <p className="page-description">
            Cada sala concentra sus partidos, pronosticos y tabla. Entra a una para continuar desde ahi.
          </p>
        </div>
        <div className="user-rooms-summary">
          <div>
            <span className="muted-text">Salas</span>
            <strong>{myRooms.length}</strong>
          </div>
          <div>
            <span className="muted-text">Activas</span>
            <strong>{activeRooms}</strong>
          </div>
          <div>
            <span className="muted-text">Partidos</span>
            <strong>{totalMatches}</strong>
          </div>
          <div>
            <span className="muted-text">Pronosticos</span>
            <strong>{totalPredictions}</strong>
          </div>
        </div>
      </section>
      {error ? <StateCard tone="error">{error}</StateCard> : null}
      {myRooms.length === 0 ? (
        <StateCard>No hay salas registradas para este usuario.</StateCard>
      ) : (
        <div className="user-room-card-grid">
          {myRooms.map((room) => {
            const roomMatches = matchesByRoom[room.id] ?? [];
            const roomPredictions = roomMatches.flatMap(
              (match) => predictionsByMatch[match.id] ?? [],
            );

            return (
              <article key={room.id} className="panel-card user-room-card">
                <div className="user-room-card__header">
                  <div>
                    <span className="eyebrow">Sala</span>
                    <strong>{room.name}</strong>
                  </div>
                  <StatusBadge
                    label={room.isActive ? 'Activa' : 'Deshabilitada'}
                    tone={room.isActive ? 'success' : 'muted'}
                  />
                </div>
                <div className="user-room-card__metrics">
                  <div>
                    <span className="muted-text">Miembros</span>
                    <strong>{room.roomUsers?.length ?? 0}</strong>
                  </div>
                  <div>
                    <span className="muted-text">Actividad</span>
                  {roomMatches.length} partido{roomMatches.length === 1 ? '' : 's'} ·{' '}
                  {roomPredictions.length} pronostico{roomPredictions.length === 1 ? '' : 's'}
                </div>
                </div>
                <div className="user-room-card__footer">
                  <Link className="secondary-button" to={`/user/rooms/${room.id}`}>
                    Entrar
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

function UserRoomDetailPage() {
  const { currentUser } = useAuth();
  const { roomId = '' } = useParams();
  const { rooms, matchesByRoom, predictionsByMatch, loading, error, refresh } = useCatalogData();
  const [feedback, setFeedback] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);
  const [activeSection, setActiveSection] = useState<UserRoomSection>('overview');
  const [activeTab, setActiveTab] = useState<RoomDetailTab>('pending-predictions');
  const [matchDayFilter, setMatchDayFilter] = useState('all');
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

  const matches = room ? sortMatchesByDate(matchesByRoom[room.id] ?? []) : [];
  const finishedMatches = matches.filter((match) => match.status === MatchStatus.FINISHED);
  const openMatches = matches.filter((match) => !isPredictionLocked(match.matchDate, match.status));
  const pendingPredictionMatches = matches.filter(
    (match) => !isPredictionLocked(match.matchDate, match.status),
  );
  const myPredictedMatches = matches.filter((match) =>
    (predictionsByMatch[match.id] ?? []).some((item) => item.userId === currentUser?.id),
  );
  const matchDayOptions = matches.reduce<Array<MatchDayOption>>(
    (options, match) => {
      const value = getMatchDayKey(match.matchDate);

      if (options.some((option) => option.value === value)) {
        return options;
      }

      return [
        ...options,
        {
          value,
          label: formatMatchDayLabel(match.matchDate),
          dayNumber: formatMatchDayNumber(match.matchDate),
          monthLabel: formatMatchDayMonth(match.matchDate),
        },
      ];
    },
    [],
  );
  const pendingMatchDayOptions = pendingPredictionMatches.reduce<Array<MatchDayOption>>(
    (options, match) => {
      const value = getMatchDayKey(match.matchDate);

      if (options.some((option) => option.value === value)) {
        return options;
      }

      return [
        ...options,
        {
          value,
          label: formatMatchDayLabel(match.matchDate),
          dayNumber: formatMatchDayNumber(match.matchDate),
          monthLabel: formatMatchDayMonth(match.matchDate),
        },
      ];
    },
    [],
  );
  const visibleMatchDayOptions =
    activeTab === 'pending-predictions' ? pendingMatchDayOptions : matchDayOptions;
  const shouldShowMatchDayFilter = visibleMatchDayOptions.length > 0;
  const filteredMatches =
    matchDayFilter === 'all'
      ? matches
      : matches.filter((match) => getMatchDayKey(match.matchDate) === matchDayFilter);
  const filteredPendingPredictionMatches =
    matchDayFilter === 'all'
      ? pendingPredictionMatches
      : pendingPredictionMatches.filter((match) => getMatchDayKey(match.matchDate) === matchDayFilter);
  const filteredMyPredictedMatches =
    matchDayFilter === 'all'
      ? myPredictedMatches
      : myPredictedMatches.filter((match) => getMatchDayKey(match.matchDate) === matchDayFilter);
  const filteredFinishedMatches =
    matchDayFilter === 'all'
      ? finishedMatches
      : finishedMatches.filter((match) => getMatchDayKey(match.matchDate) === matchDayFilter);
  const leaderboard = buildLeaderboard(
    room ? getRoomMembers(room) : [],
    getCurrentRoomPredictions(matches, predictionsByMatch),
    matches,
  );
  const myLeaderboardEntry = leaderboard.find((item) => item.userId === currentUser?.id);

  useEffect(() => {
    if (visibleMatchDayOptions.length === 0) {
      return;
    }

    const latestMatchDayValue = getLatestMatchDayValue(visibleMatchDayOptions);
    const currentExists = visibleMatchDayOptions.some((option) => option.value === matchDayFilter);

    if (matchDayFilter === 'all' || !currentExists) {
      setMatchDayFilter(latestMatchDayValue);
    }
  }, [matchDayFilter, visibleMatchDayOptions]);

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

  return (
    <div className={`page-stack page-with-overlay ${submittingMatchId ? 'is-loading' : ''}`}>
      <PredictionLoadingOverlay visible={Boolean(submittingMatchId)} />
      <PageHeader title={room.name} />
      {error ? <StateCard tone="error">{error}</StateCard> : null}
      {feedback ? <StateCard tone={feedback.tone}>{feedback.message}</StateCard> : null}

      <section className="panel-card">
        <div className="room-section-nav">
          <button
            className={`room-section-button ${activeSection === 'overview' ? 'active' : ''}`}
            type="button"
            onClick={() => setActiveSection('overview')}
          >
            <span>Resumen</span>
          </button>
          <button
            className={`room-section-button ${activeSection === 'leaderboard' ? 'active' : ''}`}
            type="button"
            onClick={() => setActiveSection('leaderboard')}
          >
            <span>Tabla</span>
          </button>
          <button
            className={`room-section-button ${activeSection === 'explore' ? 'active' : ''}`}
            type="button"
            onClick={() => setActiveSection('explore')}
          >
            <span>Explorar</span>
          </button>
        </div>
      </section>

      {activeSection === 'overview' ? (
        <section className="panel-card">
          <div className="section-heading">
            <div>
              <h3>Resumen de la sala</h3>
            </div>
          </div>
          <div className="stats-grid room-summary-stats">
            <StatTile label="Miembros" value={room.roomUsers?.length ?? 0} />
            <StatTile label="Partidos" value={matches.length} />
            <StatTile label="Pendientes" value={openMatches.length} />
            <StatTile label="Finalizados" value={finishedMatches.length} />
          </div>
          <div className="room-summary-grid">
            <article className="subsection-card compact-card">
              <div className="subsection-heading">
                <h3>Tu siguiente paso</h3>
              </div>
              <strong className="summary-highlight">
                {openMatches.length > 0
                  ? `${openMatches.length} pendiente${openMatches.length === 1 ? '' : 's'}`
                  : 'Sin pendientes'}
              </strong>
              <button className="secondary-button" type="button" onClick={() => setActiveSection('explore')}>
                Ir a explorar
              </button>
            </article>
            <article className="subsection-card compact-card">
              <div className="subsection-heading">
                <h3>Mis puntos</h3>
              </div>
              <strong className="summary-highlight">
                {myLeaderboardEntry ? `${myLeaderboardEntry.points} pts` : '0 pts'}
              </strong>
              <button className="secondary-button" type="button" onClick={() => setActiveSection('leaderboard')}>
                Ver tabla
              </button>
            </article>
          </div>
        </section>
      ) : null}

      {activeSection === 'leaderboard' ? (
        <section className="panel-card">
          <div className="section-heading">
            <div>
              <h3>Tabla de la sala</h3>
            </div>
          </div>
          <LeaderboardTable items={leaderboard} />
        </section>
      ) : null}

      {activeSection === 'explore' ? (
        <section className="panel-card">
          <div className="section-heading">
            <div>
              <h3>Explorar la sala</h3>
            </div>
          </div>
          <div className="explore-toolbar">
            <div className="tab-switcher tab-switcher-scroll" role="tablist" aria-label="Secciones de la sala">
              <button
                className={`tab-button ${activeTab === 'matches' ? 'active' : ''}`}
                type="button"
                onClick={() => setActiveTab('matches')}
              >
                Partidos
              </button>
              <button
                className={`tab-button ${activeTab === 'pending-predictions' ? 'active' : ''}`}
                type="button"
                onClick={() => setActiveTab('pending-predictions')}
              >
                Pronosticos pendientes
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
            {shouldShowMatchDayFilter ? (
              <MatchDayCarousel value={matchDayFilter} options={visibleMatchDayOptions} onChange={setMatchDayFilter} />
            ) : null}
          </div>

          {activeTab === 'matches' ? (
          <div className="tab-panel">
            {matches.length === 0 ? (
              <StateCard>No hay partidos cargados en esta sala.</StateCard>
            ) : filteredMatches.length === 0 ? (
              <StateCard>No hay partidos para la fecha seleccionada.</StateCard>
            ) : (
              <SectionTable headers={['Partido', 'Fecha Bolivia', 'Estado', 'Resultado']}>
                {filteredMatches.map((match) => {
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

          {activeTab === 'pending-predictions' ? (
          <div className="tab-panel">
            {filteredPendingPredictionMatches.length === 0 ? (
              <StateCard>No hay partidos habilitados para pronosticar o actualizar en esta sala.</StateCard>
            ) : (
              <div className="prediction-cards-grid">
                {filteredPendingPredictionMatches.map((match) => {
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
          </div>
          ) : null}

          {activeTab === 'predictions' ? (
          <div className="tab-panel">
            {filteredMyPredictedMatches.length === 0 ? (
              <StateCard>No tienes pronosticos registrados para la fecha seleccionada.</StateCard>
            ) : (
              <div className="prediction-cards-grid">
                {filteredMyPredictedMatches.map((match) => {
                  const myPrediction = (predictionsByMatch[match.id] ?? []).find(
                    (item) => item.userId === currentUser?.id,
                  );

                  return (
                    <PredictionMatchCard
                    key={match.id}
                    match={match}
                    prediction={myPrediction}
                    isLocked={isPredictionLocked(match.matchDate, match.status)}
                    isSubmitting={submittingMatchId === match.id}
                    onSubmit={submitPrediction}
                  />
                );
                })}
              </div>
            )}
          </div>
          ) : null}

          {activeTab === 'room-predictions' ? (
          <div className="tab-panel">
            <div className="section-heading">
              <div>
                <h3>Pronosticos de la sala</h3>
              </div>
            </div>
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
      ) : null}
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


