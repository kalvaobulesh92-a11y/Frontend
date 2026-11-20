import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import { AuthProvider } from './context/AuthContext.jsx'
import { useAuth } from './context/useAuth'
import { ToastProvider } from './context/ToastContext.jsx'
import { hasRequiredRole } from './utils/authRouting.js'
import SiteLayout from './components/SiteLayout'
import HomePage from './pages/HomePage'

const SearchPage = lazy(() => import('./pages/SearchPage'))
const WorkerDetailPage = lazy(() => import('./pages/WorkerDetailPage'))
const LoginPage = lazy(() => import('./pages/AuthPages').then((module) => ({ default: module.LoginPage })))
const RegisterPage = lazy(() => import('./pages/AuthPages').then((module) => ({ default: module.RegisterPage })))
const AboutPage = lazy(() => import('./pages/InfoPages').then((module) => ({ default: module.AboutPage })))
const FaqPage = lazy(() => import('./pages/InfoPages').then((module) => ({ default: module.FaqPage })))
const HowItWorksPage = lazy(() => import('./pages/InfoPages').then((module) => ({ default: module.HowItWorksPage })))
const BecomeWorkerPage = lazy(() => import('./pages/DashboardPages').then((module) => ({ default: module.BecomeWorkerPage })))
const CustomerDashboard = lazy(() => import('./pages/DashboardPages').then((module) => ({ default: module.CustomerDashboard })))
const WorkerDashboard = lazy(() => import('./pages/DashboardPages').then((module) => ({ default: module.WorkerDashboard })))
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'))
const CustomerQuotationsPage = lazy(() => import('./pages/QuotationWorkspace').then((module) => ({ default: module.CustomerQuotationsPage })))
const WorkerQuotationsPage = lazy(() => import('./pages/QuotationWorkspace').then((module) => ({ default: module.WorkerQuotationsPage })))
const ProjectWorkspace = lazy(() => import('./pages/ProjectWorkspace'))

function RoleBasedRoute({ children, role }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <div className="page-loading"><span className="spinner-border" aria-label="Loading account" /></div>
  }
  if (!user) return <Navigate to="/login" replace />
  if (!hasRequiredRole(user, role)) {
    if (role === 'admin') return <Navigate to="/" replace />
    if (role === 'worker') return <Navigate to="/become-a-worker" replace />
    if (role === 'customer') return <Navigate to="/search" replace />
    return <Navigate to="/" replace />
  }
  return children
}

function DashboardLanding() {
  const { user } = useAuth()
  if (user?.is_admin || (user?.is_worker && !user?.is_customer)) {
    return <Navigate to={user.is_admin ? '/admin/dashboard' : '/worker/dashboard'} replace />
  }
  return <CustomerDashboard />
}

function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/admin/dashboard"
        element={<RoleBasedRoute role="admin"><AdminDashboard /></RoleBasedRoute>}
      />
      <Route element={<SiteLayout />}>
        <Route index element={<HomePage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="workers/:id" element={<WorkerDetailPage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="how-it-works" element={<HowItWorksPage />} />
        <Route path="faq" element={<FaqPage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="become-a-worker" element={<BecomeWorkerPage />} />
        <Route
          path="dashboard"
          element={<RoleBasedRoute><DashboardLanding /></RoleBasedRoute>}
        />
        <Route
          path="customer/dashboard"
          element={<RoleBasedRoute role="customer"><CustomerDashboard /></RoleBasedRoute>}
        />
        <Route
          path="worker/dashboard"
          element={<RoleBasedRoute role="worker"><WorkerDashboard /></RoleBasedRoute>}
        />
        <Route
          path="customer/quotations"
          element={<RoleBasedRoute role="customer"><CustomerQuotationsPage /></RoleBasedRoute>}
        />
        <Route
          path="worker/quotations"
          element={<RoleBasedRoute role="worker"><WorkerQuotationsPage /></RoleBasedRoute>}
        />
        <Route
          path="customer/projects"
          element={<RoleBasedRoute role="customer"><ProjectWorkspace role="customer" /></RoleBasedRoute>}
        />
        <Route
          path="worker/projects"
          element={<RoleBasedRoute role="worker"><ProjectWorkspace role="worker" /></RoleBasedRoute>}
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Suspense fallback={<div className="page-loading"><span className="spinner-border" aria-label="Loading page" /></div>}>
            <AppRoutes />
          </Suspense>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}
