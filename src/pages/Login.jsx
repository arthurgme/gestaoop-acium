import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const { signIn, session, profile, loading, authError } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600" />
      </div>
    )
  }

  if (session && profile) {
    return <Navigate to={profile.role === 'admin' ? '/admin' : '/pdv'} replace />
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    const email = `${username.trim().toLowerCase()}@acium.local`
    const { error } = await signIn(email, password)
    if (error) setError('Usuário ou senha inválidos.')
    setSubmitting(false)
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.15fr_.85fr] bg-[#f7f3eb]">
      <div className="hidden lg:flex relative overflow-hidden bg-[#29251f] text-white p-14 flex-col justify-between">
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 15% 20%, #d6ad58 0, transparent 32%), radial-gradient(circle at 80% 75%, #8c691f 0, transparent 30%)' }} />
        <div className="relative"><div className="w-10 h-10 rounded-xl bg-[#c19132] grid place-items-center text-xl font-bold">A</div></div>
        <div className="relative max-w-xl"><p className="text-[#dfc17e] text-xs uppercase tracking-[.2em] font-bold">Gestão de parcerias</p><h1 className="mt-4 text-5xl font-bold tracking-[-.045em] leading-[1.04]">Cada indicação visível.<br />Cada unidade no controle.</h1><p className="mt-5 max-w-lg text-stone-300">Acompanhe lojas parceiras, vendedoras, atendimentos e vendas em uma visão operacional única.</p></div>
        <p className="relative text-xs text-stone-500">Acium · ambiente interno</p>
      </div>
      <div className="flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="surface p-7 sm:p-8">
          <div className="text-center mb-8">
            <div className="lg:hidden mx-auto mb-4 w-10 h-10 rounded-xl bg-[#ad7b1c] text-white grid place-items-center text-lg font-bold">A</div>
            <p className="eyebrow">Ambiente interno</p>
            <h1 className="text-2xl font-bold tracking-tight text-stone-800 mt-1">Entrar na operação</h1>
            <p className="text-sm text-stone-500 mt-1">Use o acesso da sua unidade.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Usuário</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="field-control"
                placeholder="seu.usuario"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="field-control"
                placeholder="••••••••"
              />
            </div>

            {(error || authError) && (
              <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error || authError}</p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-[#ad7b1c] text-white py-2.5 rounded-lg font-semibold hover:bg-[#926514] disabled:opacity-50 transition-colors cursor-pointer"
            >
              {submitting ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>
      </div>
      </div>
    </div>
  )
}
