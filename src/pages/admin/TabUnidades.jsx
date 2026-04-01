import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'

export default function TabUnidades() {
  const [unidades, setUnidades] = useState([])
  const [showCreate, setShowCreate] = useState(false)
  const [showList, setShowList] = useState(true)
  const [editId, setEditId] = useState(null)

  // Create form
  const [nome, setNome] = useState('')
  const [criarPdv, setCriarPdv] = useState(false)
  const [pdvNome, setPdvNome] = useState('')
  const [pdvUsername, setPdvUsername] = useState('')
  const [pdvSenha, setPdvSenha] = useState('')
  const [loading, setLoading] = useState(false)
  const [erroForm, setErroForm] = useState('')
  const [erroDelete, setErroDelete] = useState('')

  // Edit form
  const [editNome, setEditNome] = useState('')

  const loadUnidades = useCallback(async () => {
    const [unRes, profRes] = await Promise.all([
      supabase.from('unidades').select('*').order('nome'),
      supabase.from('profiles').select('id, nome, username, role, unidade_id').eq('role', 'pdv').order('nome'),
    ])
    const profiles = profRes.data || []
    const unidades = (unRes.data || []).map((u) => ({
      ...u,
      vendedoras: profiles.filter((p) => p.unidade_id === u.id),
    }))
    setUnidades(unidades)
  }, [])

  useEffect(() => { loadUnidades() }, [loadUnidades])

  async function handleCreate(e) {
    e.preventDefault()
    setLoading(true)

    const { data: unidade, error } = await supabase
      .from('unidades')
      .insert({ nome })
      .select()
      .single()

    if (error) {
      setErroForm('Erro ao criar unidade: ' + error.message)
      setLoading(false)
      return
    }

    if (criarPdv && pdvUsername && pdvSenha) {
      const email = `${pdvUsername.trim().toLowerCase()}@acium.local`
      const { error: authErr } = await supabase.auth.signUp({
        email,
        password: pdvSenha,
        options: {
          data: {
            nome: pdvNome || pdvUsername,
            role: 'pdv',
            unidade_id: unidade.id,
            username: pdvUsername.trim().toLowerCase(),
          },
        },
      })
      if (authErr) { setErroForm('Unidade criada, mas erro ao criar usuário PDV: ' + authErr.message) }
    }

    setErroForm('')
    setNome('')
    setCriarPdv(false)
    setPdvNome('')
    setPdvUsername('')
    setPdvSenha('')
    setShowCreate(false)
    loadUnidades()
    setLoading(false)
  }

  async function handleEdit(e) {
    e.preventDefault()
    await supabase.from('unidades').update({ nome: editNome }).eq('id', editId)
    setEditId(null)
    loadUnidades()
  }

  async function toggleAtiva(id, ativa) {
    await supabase.from('unidades').update({ ativa }).eq('id', id)
    loadUnidades()
  }

  async function handleDeleteVendedora(id, nome) {
    if (!confirm(`Excluir a vendedora "${nome}"? Essa ação não pode ser desfeita.`)) return
    const { error } = await supabase.rpc('delete_user', { p_user_id: id })
    if (error) setErroDelete('Erro ao excluir: ' + error.message)
    else { setErroDelete(''); loadUnidades() }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-800">Unidades</h2>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="bg-amber-600 text-white px-5 py-2 rounded-lg font-medium hover:bg-amber-700 transition-colors cursor-pointer"
        >
          {showCreate ? 'Cancelar' : '+ Nova Unidade'}
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl shadow p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome da unidade</label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
            />
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-gray-700">Criar usuário PDV?</label>
            <button
              type="button"
              onClick={() => setCriarPdv(!criarPdv)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                criarPdv ? 'bg-amber-600' : 'bg-gray-300'
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                criarPdv ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>

          {criarPdv && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome</label>
                <input type="text" value={pdvNome} onChange={(e) => setPdvNome(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Usuário (login)</label>
                <input type="text" value={pdvUsername} onChange={(e) => setPdvUsername(e.target.value)} required
                  pattern="[a-zA-Z0-9._-]+"
                  placeholder="ex: pdv.shopping"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
                <input type="password" value={pdvSenha} onChange={(e) => setPdvSenha(e.target.value)} required minLength={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none" />
              </div>
            </div>
          )}

          {erroForm && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{erroForm}</p>}
          <button type="submit" disabled={loading}
            className="bg-amber-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-amber-700 disabled:opacity-50 cursor-pointer">
            {loading ? 'Criando...' : 'Criar Unidade'}
          </button>
        </form>
      )}

      <div className="bg-white rounded-xl shadow">
        <button
          onClick={() => setShowList((o) => !o)}
          className="w-full px-6 py-4 flex items-center justify-between cursor-pointer text-left border-b border-gray-100"
        >
          <div>
            <h2 className="text-base font-semibold text-gray-800">Unidades Cadastradas</h2>
            <p className="text-xs text-gray-400 mt-0.5">{unidades.length} unidade{unidades.length !== 1 ? 's' : ''}</p>
          </div>
          <svg className={`w-5 h-5 text-gray-400 transition-transform ${showList ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {erroDelete && <p className="mx-6 mt-3 text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{erroDelete}</p>}
        {showList && (unidades.length === 0 ? (
          <p className="px-6 py-8 text-sm text-gray-400 text-center">Nenhuma unidade cadastrada.</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {unidades.map((u) => (
              <li key={u.id} className="px-6 py-4 flex items-center justify-between">
                {editId === u.id ? (
                  <form onSubmit={handleEdit} className="flex items-center gap-3 flex-1">
                    <input type="text" value={editNome} onChange={(e) => setEditNome(e.target.value)} required
                      className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-sm" />
                    <button type="submit" className="text-sm text-amber-600 font-medium cursor-pointer">Salvar</button>
                    <button type="button" onClick={() => setEditId(null)} className="text-sm text-gray-400 cursor-pointer">Cancelar</button>
                  </form>
                ) : (
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className={`font-medium ${u.ativa ? 'text-gray-800' : 'text-gray-400 line-through'}`}>
                          {u.nome}
                        </span>
                        <span className="ml-3 text-xs text-gray-400">Pingentes: {u.saldo_pingentes}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => { setEditId(u.id); setEditNome(u.nome) }}
                          className="text-sm text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => toggleAtiva(u.id, !u.ativa)}
                          className={`text-xs font-medium px-3 py-1 rounded-full cursor-pointer ${
                            u.ativa ? 'text-red-600 bg-red-50 hover:bg-red-100' : 'text-green-600 bg-green-50 hover:bg-green-100'
                          }`}
                        >
                          {u.ativa ? 'Desativar' : 'Ativar'}
                        </button>
                      </div>
                    </div>
                    {u.vendedoras && u.vendedoras.length > 0 && (
                      <ul className="mt-3 space-y-1">
                        {u.vendedoras.map((v) => (
                          <li key={v.id} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-1.5">
                            <span className="text-sm text-gray-700">{v.nome}</span>
                            <button
                              onClick={() => handleDeleteVendedora(v.id, v.nome)}
                              className="text-xs text-red-600 hover:text-red-700 font-medium cursor-pointer"
                            >
                              Excluir
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        ))}
      </div>
    </div>
  )
}
