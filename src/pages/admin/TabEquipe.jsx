import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'

export default function TabEquipe() {
  const [usuarios, setUsuarios] = useState([])
  const [unidades, setUnidades] = useState([])
  const [showCreate, setShowCreate] = useState(false)
  const [showList, setShowList] = useState(true)

  // Create form
  const [nome, setNome] = useState('')
  const [username, setUsername] = useState('')
  const [senha, setSenha] = useState('')
  const [role, setRole] = useState('pdv')
  const [unidadeId, setUnidadeId] = useState('')
  const [loading, setLoading] = useState(false)
  const [erroForm, setErroForm] = useState('')
  const [erroDelete, setErroDelete] = useState('')

  const loadData = useCallback(async () => {
    const [profRes, unRes] = await Promise.all([
      supabase.from('profiles').select('*, unidade:unidades(nome)').order('nome'),
      supabase.from('unidades').select('*').eq('ativa', true).order('nome'),
    ])
    setUsuarios(profRes.data || [])
    setUnidades(unRes.data || [])
  }, [])

  useEffect(() => { loadData() }, [loadData])

  async function handleCreate(e) {
    e.preventDefault()
    setLoading(true)
    const email = `${username.trim().toLowerCase()}@acium.local`
    const { error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: {
        data: {
          nome: nome || username,
          role,
          unidade_id: role === 'pdv' ? unidadeId : null,
          username: username.trim().toLowerCase(),
        },
      },
    })
    if (error) {
      setErroForm('Erro: ' + error.message)
    } else {
      setErroForm('')
      setNome('')
      setUsername('')
      setSenha('')
      setRole('pdv')
      setUnidadeId('')
      setShowCreate(false)
      setTimeout(loadData, 1000)
    }
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow">
        <button
          onClick={() => setShowCreate((o) => !o)}
          className="w-full px-6 py-4 flex items-center justify-between cursor-pointer text-left border-b border-gray-100"
        >
          <h2 className="text-base font-semibold text-gray-800">Novo Usuário</h2>
          <svg className={`w-5 h-5 text-gray-400 transition-transform ${showCreate ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

      {showCreate && (
        <form onSubmit={handleCreate} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
              <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Usuário (login)</label>
              <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} required
                pattern="[a-zA-Z0-9._-]+"
                title="Apenas letras, números, pontos, hífens e underscores"
                placeholder="ex: pdv.shopping"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
              <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required minLength={6}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Perfil</label>
              <select value={role} onChange={(e) => setRole(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none">
                <option value="pdv">PDV</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            {role === 'pdv' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unidade</label>
                <select value={unidadeId} onChange={(e) => setUnidadeId(e.target.value)} required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none">
                  <option value="">Selecione...</option>
                  {unidades.map((u) => <option key={u.id} value={u.id}>{u.nome}</option>)}
                </select>
              </div>
            )}
          </div>
          {erroForm && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{erroForm}</p>}
          <button type="submit" disabled={loading}
            className="bg-amber-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-amber-700 disabled:opacity-50 cursor-pointer">
            {loading ? 'Criando...' : 'Criar Usuário'}
          </button>
        </form>
      )}
      </div>

      <div className="bg-white rounded-xl shadow">
        <button
          onClick={() => setShowList((o) => !o)}
          className="w-full px-6 py-4 flex items-center justify-between cursor-pointer text-left border-b border-gray-100"
        >
          <div>
            <h2 className="text-base font-semibold text-gray-800">Usuários Cadastrados</h2>
            <p className="text-xs text-gray-400 mt-0.5">{usuarios.length} usuário{usuarios.length !== 1 ? 's' : ''}</p>
          </div>
          <svg className={`w-5 h-5 text-gray-400 transition-transform ${showList ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {erroDelete && <p className="mx-6 mt-3 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{erroDelete}</p>}
        {showList && (usuarios.length === 0 ? (
          <p className="px-6 py-8 text-sm text-gray-400 text-center">Nenhum usuário cadastrado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b border-gray-100">
                  <th className="px-6 py-3 font-medium">Nome</th>
                  <th className="px-6 py-3 font-medium">Usuário</th>
                  <th className="px-6 py-3 font-medium">Perfil</th>
                  <th className="px-6 py-3 font-medium">Unidade</th>
                  <th className="px-6 py-3 font-medium">Ações</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u) => (
                  <tr key={u.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium text-gray-800">{u.nome}</td>
                    <td className="px-6 py-3 text-gray-600">{u.username || '—'}</td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {u.role.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-gray-600">{u.unidade?.nome || '—'}</td>
                    <td className="px-6 py-3 flex items-center gap-3">
                      <button
                        onClick={async () => {
                          if (!confirm(`Excluir o usuário "${u.nome}"? Essa ação não pode ser desfeita.`)) return
                          const { error } = await supabase.rpc('delete_user', { p_user_id: u.id })
                          if (error) setErroDelete('Erro ao excluir: ' + error.message)
                          else { setErroDelete(''); loadData() }
                        }}
                        className="text-sm text-red-600 hover:text-red-700 font-medium cursor-pointer"
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  )
}
