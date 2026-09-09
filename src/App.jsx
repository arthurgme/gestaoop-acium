import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'

const PdvDashboard = lazy(() => import('./pages/pdv/PdvDashboard'))
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'))

function RouteLoader() {
  return <div className="min-h-screen grid place-items-center bg-[#f7f3eb]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ad7b1c]" /></div>
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<RouteLoader />}><Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/pdv"
            element={
              <ProtectedRoute allowedRoles={['pdv']}>
                <PdvDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes></Suspense>
      </AuthProvider>
      <Analytics />
    </BrowserRouter>
  )
}
