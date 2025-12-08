// Updated: Latest version with all features
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { SocketProvider } from './contexts/SocketContext'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Parents from './pages/Parents'
import CollectFee from './pages/CollectFee'
import MonthSetup from './pages/MonthSetup'
import Reports from './pages/Reports'
import Users from './pages/Users'
import FeeHistory from './pages/FeeHistory'
import ParentProfile from './pages/ParentProfile'
import Layout from './components/Layout'

function PrivateRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return user ? children : <Navigate to="/login" />
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="parents" element={<Parents />} />
        <Route path="parents/:id/profile" element={<ParentProfile />} />
        <Route path="parents/:id/history" element={<FeeHistory />} />
        <Route path="collect-fee" element={<CollectFee />} />
        <Route path="month-setup" element={<MonthSetup />} />
        <Route path="reports" element={<Reports />} />
        <Route path="users" element={<Users />} />
      </Route>
    </Routes>
  )
}

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Router>
          <AppRoutes />
          <Toaster position="top-right" />
        </Router>
      </SocketProvider>
    </AuthProvider>
  )
}

export default App

