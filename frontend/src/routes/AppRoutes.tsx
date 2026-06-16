import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { AppLayout } from '../layouts/AppLayout'
import { AuthLayout } from '../layouts/AuthLayout'
import { AdminPage } from '../pages/AdminPage'
import { DashboardPage } from '../pages/DashboardPage'
import { LeaderboardPage } from '../pages/LeaderboardPage'
import { LoginPage } from '../pages/LoginPage'
import { MatchesPage } from '../pages/MatchesPage'
import { getSession } from '../types/session'

function RequireAuth() {
  const location = useLocation()
  const session = getSession()

  if (!session) {
    return <Navigate replace state={{ from: location }} to="/login" />
  }

  return <Outlet />
}

function RequireAdmin() {
  const session = getSession()

  if (!session?.roles.includes('admin')) {
    return <Navigate replace to="/" />
  }

  return <Outlet />
}

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>

      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="/matches" element={<MatchesPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route element={<RequireAdmin />}>
            <Route path="/admin" element={<AdminPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate replace to="/" />} />
    </Routes>
  )
}
