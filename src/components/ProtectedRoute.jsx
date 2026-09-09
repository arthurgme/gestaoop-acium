import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function ProtectedRoute({ children, allowedRoles }) {
  const { session, profile, loading, authError, signOut } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600" />
      </div>
    )
  }

  if (!session) return <Navigate to="/login" replace />

  if (authError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f7f3eb] px-4">
        <div className="surface p-6 max-w-md text-center">
          <h1 className="text-lg font-bold text-stone-800">Acesso indisponível</h1>
          <p className="text-sm text-stone-600 mt-2">{authError}</p>
          <button onClick={signOut} className="mt-4 text-sm font-semibold text-[#765718] cursor-pointer">Voltar ao login</button>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600" />
      </div>
    )
  }
  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    return <Navigate to={profile.role === 'admin' ? '/admin' : '/pdv'} replace />
  }

  return children
}
