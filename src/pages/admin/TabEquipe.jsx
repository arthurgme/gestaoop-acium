import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const initialForm = { nome: '', username: '', password: '', role: 'pdv', unidade_id: '' }

async function manageAccess(body) {
  const { data, error } = await supabase.functions.invoke('manage-access', { body })
  if (error) throw new Error(data?.error || error.message)
  if (data?.error) throw new Error(data.error)
  return data
}

export default function TabEquipe() {
  const [usuarios, setUsuarios] = useState([])
  const [unidades, setUnidades] = useState([])
  const [form, setForm] = useState(initialForm)
  const [showCreate, setShowCreate] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })

  const loadData = useCallback(async () => {
    const [profiles, units] = await Promise.all([
      supabase.from('profiles').select('id, nome, username, role, unidade_id, ativo, unidade:unidades(nome)').order('nome'),
      supabase.from('unidades').select('id, nome').eq('ativa', true).order('nome'),
    ])
    setUsuarios(profiles.data || [])
    setUnidades(units.data || [])
  }, [])

  useEffect(() => { loadData() }, [loadData])

  function updateForm(key, value) {
    setForm((current) => ({ ...current, [key]: value, ...(key === 'role' && value === 'admin' ? { unidade_id: '' } : {}) }))
  }

  async function handleCreate(event) {
    event.preventDefault()
    setLoading(true)
    setMessage({ type: '', text: '' })
    try {
      await manageAccess({ action: 'create', ...form })
      setForm(initialForm)
      setShowCreate(false)
      setMessage({ type: 'success', text: 'Acesso criado. O novo usuário já pode entrar sem afetar sua sessão.' })
      await loadData()
    } catch (error) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setLoading(false)
    }
  }

  async function handleAction(user, action) {
    let payload = { action, user_id: user.id }
    if (action === 'reset_password') {
      const password = window.prompt(`Digite a nova senha para ${user.nome}:\nMínimo 8 caracteres, com maiúscula, minúscula e número.`)
      if (!password) return
      payload = { ...payload, password }
    } else {
      const verb = action === 'deactivate' ? 'desativar' : 'reativar'
      if (!window.confirm(`Deseja ${verb} o acesso de “${user.nome}”? Os dados históricos serão preservados.`)) return
    }
    setLoading(true)
    setMessage({ type: '', text: '' })
    try {
      await manageAccess(payload)
      setMessage({ type: 'success', text: action === 'reset_password' ? 'Senha redefinida.' : 'Status do acesso atualizado.' })
      await loadData()
    } catch (error) {
      setMessage({ type: 'error', text: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <div className="page-intro">
        <div><p className="eyebrow">Segurança e operação</p><h2>Acessos</h2><p>Um login por unidade, com histórico preservado e gestão exclusiva do administrador.</p></div>
        <button onClick={() => setShowCreate((value) => !value)} className="bg-[#ad7b1c] text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-[#926514] cursor-pointer">
          {showCreate ? 'Cancelar' : '+ Novo acesso'}
        </button>
      </div>

      {message.text && <div className={message.type === 'error' ? 'alert-error' : 'alert-success'}>{message.text}</div>}

      {showCreate && (
        <form onSubmit={handleCreate} className="surface p-5 space-y-4">
          <div className="section-heading !p-0 !pb-4"><div><h3>Criar acesso</h3><p>A senha não será exibida novamente.</p></div></div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <label className="field-label">Nome do acesso<input className="field-control mt-1" value={form.nome} onChange={(event) => updateForm('nome', event.target.value)} required placeholder="Outlet Premium" /></label>
            <label className="field-label">Usuário<input className="field-control mt-1" value={form.username} onChange={(event) => updateForm('username', event.target.value)} required minLength={3} pattern="[a-zA-Z0-9._-]+" placeholder="outlet" /></label>
            <label className="field-label">Senha inicial<input className="field-control mt-1" type="password" value={form.password} onChange={(event) => updateForm('password', event.target.value)} required minLength={8} placeholder="8+ caracteres" /></label>
            <label className="field-label">Perfil<select className="field-control mt-1" value={form.role} onChange={(event) => updateForm('role', event.target.value)}><option value="pdv">Unidade</option><option value="admin">Administrador</option></select></label>
            {form.role === 'pdv' && <label className="field-label sm:col-span-2">Unidade vinculada<select className="field-control mt-1" value={form.unidade_id} onChange={(event) => updateForm('unidade_id', event.target.value)} required><option value="">Selecione a unidade</option>{unidades.map((unit) => <option key={unit.id} value={unit.id}>{unit.nome}</option>)}</select></label>}
          </div>
          <p className="text-xs text-stone-500">A senha deve ter ao menos uma letra maiúscula, uma minúscula e um número.</p>
          <button disabled={loading} className="bg-[#ad7b1c] text-white px-5 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50 cursor-pointer">{loading ? 'Criando…' : 'Criar acesso'}</button>
        </form>
      )}

      <section className="surface overflow-hidden">
        <div className="section-heading"><div><h3>Acessos cadastrados</h3><p>{usuarios.length} acesso{usuarios.length === 1 ? '' : 's'} · desativar não apaga o histórico</p></div></div>
        {usuarios.length === 0 ? <p className="empty-state">Nenhum acesso cadastrado.</p> : (
          <div className="overflow-x-auto"><table className="data-table"><thead><tr><th>Nome</th><th>Usuário</th><th>Perfil</th><th>Unidade</th><th>Status</th><th>Ações</th></tr></thead><tbody>
            {usuarios.map((user) => <tr key={user.id}>
              <td className="font-semibold text-stone-800">{user.nome}</td><td>{user.username || '—'}</td><td>{user.role === 'admin' ? 'Administrador' : 'Unidade'}</td><td>{user.unidade?.nome || '—'}</td>
              <td><span className={`px-2 py-1 rounded-full text-xs font-semibold ${user.ativo === false ? 'bg-stone-100 text-stone-500' : 'bg-emerald-50 text-emerald-700'}`}>{user.ativo === false ? 'Inativo' : 'Ativo'}</span></td>
              <td><div className="flex gap-3 whitespace-nowrap"><button disabled={loading} onClick={() => handleAction(user, 'reset_password')} className="text-[#765718] font-semibold cursor-pointer">Nova senha</button><button disabled={loading} onClick={() => handleAction(user, user.ativo === false ? 'reactivate' : 'deactivate')} className={user.ativo === false ? 'text-emerald-700 font-semibold cursor-pointer' : 'text-red-700 font-semibold cursor-pointer'}>{user.ativo === false ? 'Reativar' : 'Desativar'}</button></div></td>
            </tr>)}
          </tbody></table></div>
        )}
      </section>
    </div>
  )
}
