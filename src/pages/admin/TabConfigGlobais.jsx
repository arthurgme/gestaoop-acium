import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'

function ChevronIcon({ open }) {
  return (
    <svg className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  )
}

function LojaRow({ loja, onToggle }) {
  const [open, setOpen] = useState(false)
  const [vendedoras, setVendedoras] = useState([])
  const [novoNome, setNovoNome] = useState('')
  const [editId, setEditId] = useState(null)
  const [editNome, setEditNome] = useState('')
  const [saving, setSaving] = useState(false)

  const loadVendedoras = useCallback(async () => {
    const { data } = await supabase
      .from('vendedoras_parceiras')
      .select('*')
      .eq('loja_parceira_id', loja.id)
      .order('nome')
    setVendedoras(data || [])
  }, [loja.id])

  useEffect(() => { if (open) loadVendedoras() }, [open, loadVendedoras])

  async function handleAdd(e) {
    e.preventDefault()
    if (!novoNome.trim()) return
    setSaving(true)
    await supabase.from('vendedoras_parceiras').insert({ nome: novoNome.trim(), loja_parceira_id: loja.id })
    setNovoNome('')
    await loadVendedoras()
    setSaving(false)
  }

  async function handleEdit(e, id) {
    e.preventDefault()
    if (!editNome.trim()) return
    await supabase.from('vendedoras_parceiras').update({ nome: editNome.trim() }).eq('id', id)
    setEditId(null)
    loadVendedoras()
  }

  async function handleToggleVendedora(id, ativa) {
    await supabase.from('vendedoras_parceiras').update({ ativa }).eq('id', id)
    loadVendedoras()
  }

  const ativas = vendedoras.filter((v) => v.ativa)
  const inativas = vendedoras.filter((v) => !v.ativa)

  return (
    <li className={`border-b border-gray-100 last:border-0 ${!loja.ativa ? 'opacity-60' : ''}`}>
      <div className="px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => { if (loja.ativa) setOpen((o) => !o) }}
          className={`flex items-center gap-2 flex-1 text-left ${loja.ativa ? 'cursor-pointer' : 'cursor-default'}`}
        >
          {loja.ativa && <ChevronIcon open={open} />}
          <span className={`text-sm font-medium ${loja.ativa ? 'text-gray-800' : 'text-gray-400 line-through'}`}>
            {loja.nome}
          </span>
          {loja.ativa && open && (
            <span className="text-xs text-gray-400 font-normal">{ativas.length} vendedora{ativas.length !== 1 ? 's' : ''}</span>
          )}
        </button>
        <button
          onClick={() => onToggle(loja.id, !loja.ativa)}
          className={`text-xs font-medium px-2 py-1 rounded-full cursor-pointer shrink-0 ${
            loja.ativa ? 'text-red-600 bg-red-50 hover:bg-red-100' : 'text-green-600 bg-green-50 hover:bg-green-100'
          }`}
        >
          {loja.ativa ? 'Desativar' : 'Ativar'}
        </button>
      </div>

      {open && loja.ativa && (
        <div className="bg-gray-50 border-t border-gray-100">
          <form onSubmit={handleAdd} className="px-6 py-2 flex gap-2 border-b border-gray-100">
            <input
              type="text"
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              placeholder="Nova vendedora..."
              className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm bg-white"
            />
            <button
              type="submit"
              disabled={saving || !novoNome.trim()}
              className="bg-amber-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-amber-700 disabled:opacity-40 cursor-pointer transition-colors"
            >
              Adicionar
            </button>
          </form>
          {vendedoras.length === 0 ? (
            <p className="px-6 py-4 text-xs text-gray-400">Nenhuma vendedora cadastrada.</p>
          ) : (
            <ul>
              {ativas.map((v) => (
                <li key={v.id} className="px-6 py-2 flex items-center gap-3">
                  {editId === v.id ? (
                    <form onSubmit={(e) => handleEdit(e, v.id)} className="flex-1 flex gap-2">
                      <input type="text" value={editNome} onChange={(e) => setEditNome(e.target.value)} autoFocus
                        className="flex-1 px-3 py-1 border border-amber-400 rounded-lg text-sm bg-white outline-none focus:ring-2 focus:ring-amber-500" />
                      <button type="submit" className="text-xs text-amber-600 font-medium cursor-pointer">Salvar</button>
                      <button type="button" onClick={() => setEditId(null)} className="text-xs text-gray-400 cursor-pointer">Cancelar</button>
                    </form>
                  ) : (
                    <>
                      <span className="flex-1 text-sm text-gray-700">{v.nome}</span>
                      <button onClick={() => { setEditId(v.id); setEditNome(v.nome) }} className="text-xs text-blue-600 hover:text-blue-700 font-medium cursor-pointer">Editar</button>
                      <button onClick={() => handleToggleVendedora(v.id, false)} className="text-xs text-red-600 bg-red-50 hover:bg-red-100 font-medium px-2 py-0.5 rounded-full cursor-pointer">Desativar</button>
                    </>
                  )}
                </li>
              ))}
              {inativas.map((v) => (
                <li key={v.id} className="px-6 py-2 flex items-center gap-3">
                  <span className="flex-1 text-sm text-gray-400 line-through">{v.nome}</span>
                  <button onClick={() => handleToggleVendedora(v.id, true)} className="text-xs text-green-600 bg-green-50 hover:bg-green-100 font-medium px-2 py-0.5 rounded-full cursor-pointer">Ativar</button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  )
}

function UnidadeCard({ unidade }) {
  const [open, setOpen] = useState(true)

  // Vendedoras Internas
  const [viOpen, setViOpen] = useState(true)
  const [vendedorasInternas, setVendedorasInternas] = useState([])
  const [viNovo, setViNovo] = useState('')
  const [viEditId, setViEditId] = useState(null)
  const [viEditNome, setViEditNome] = useState('')
  const [viSaving, setViSaving] = useState(false)

  // Lojas Parceiras
  const [lpOpen, setLpOpen] = useState(true)
  const [lojas, setLojas] = useState([])
  const [lpNovo, setLpNovo] = useState('')
  const [lpSaving, setLpSaving] = useState(false)

  const loadVI = useCallback(async () => {
    const { data } = await supabase.from('vendedoras_internas').select('*').eq('unidade_id', unidade.id).order('nome')
    setVendedorasInternas(data || [])
  }, [unidade.id])

  const loadLP = useCallback(async () => {
    const { data } = await supabase.from('lojas_parceiras').select('*').eq('unidade_id', unidade.id).order('nome')
    setLojas(data || [])
  }, [unidade.id])

  useEffect(() => { loadVI(); loadLP() }, [loadVI, loadLP])

  async function handleAddVI(e) {
    e.preventDefault()
    if (!viNovo.trim()) return
    setViSaving(true)
    await supabase.from('vendedoras_internas').insert({ nome: viNovo.trim(), unidade_id: unidade.id })
    setViNovo('')
    await loadVI()
    setViSaving(false)
  }

  async function handleEditVI(e, id) {
    e.preventDefault()
    if (!viEditNome.trim()) return
    await supabase.from('vendedoras_internas').update({ nome: viEditNome.trim() }).eq('id', id)
    setViEditId(null)
    loadVI()
  }

  async function handleToggleVI(id, ativa) {
    await supabase.from('vendedoras_internas').update({ ativa }).eq('id', id)
    loadVI()
  }

  async function handleAddLP(e) {
    e.preventDefault()
    if (!lpNovo.trim()) return
    setLpSaving(true)
    await supabase.from('lojas_parceiras').insert({ nome: lpNovo.trim(), unidade_id: unidade.id })
    setLpNovo('')
    await loadLP()
    setLpSaving(false)
  }

  async function handleToggleLP(id, ativa) {
    await supabase.from('lojas_parceiras').update({ ativa }).eq('id', id)
    loadLP()
  }

  const viAtivas = vendedorasInternas.filter((v) => v.ativa)
  const lpAtivas = lojas.filter((l) => l.ativa)

  return (
    <div className="bg-white rounded-xl shadow">
      {/* Header da unidade */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full px-6 py-4 flex items-center justify-between cursor-pointer text-left border-b border-gray-100"
      >
        <h3 className="font-semibold text-amber-700">{unidade.nome}</h3>
        <svg className={`w-5 h-5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <>
          {/* Vendedoras Internas */}
          <div className="border-b border-gray-100">
            <button
              onClick={() => setViOpen((o) => !o)}
              className="w-full px-6 py-3 flex items-center justify-between cursor-pointer text-left"
            >
              <div className="flex items-center gap-2">
                <ChevronIcon open={viOpen} />
                <span className="text-sm font-medium text-gray-700">Vendedoras Internas</span>
                <span className="text-xs text-gray-400">{viAtivas.length} ativa{viAtivas.length !== 1 ? 's' : ''}</span>
              </div>
            </button>

            {viOpen && (
              <>
                <form onSubmit={handleAddVI} className="px-6 py-2 flex gap-2 border-t border-gray-50">
                  <input
                    type="text" value={viNovo} onChange={(e) => setViNovo(e.target.value)}
                    placeholder="Nome da vendedora..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm"
                  />
                  <button type="submit" disabled={viSaving || !viNovo.trim()}
                    className="bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-40 cursor-pointer transition-colors">
                    Adicionar
                  </button>
                </form>
                {vendedorasInternas.length === 0 ? (
                  <p className="px-6 py-4 text-sm text-gray-400">Nenhuma vendedora cadastrada.</p>
                ) : (
                  <ul className="divide-y divide-gray-50">
                    {viAtivas.map((v) => (
                      <li key={v.id} className="px-6 py-2.5 flex items-center gap-3">
                        {viEditId === v.id ? (
                          <form onSubmit={(e) => handleEditVI(e, v.id)} className="flex-1 flex gap-2">
                            <input type="text" value={viEditNome} onChange={(e) => setViEditNome(e.target.value)} autoFocus
                              className="flex-1 px-3 py-1 border border-amber-400 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-500" />
                            <button type="submit" className="text-xs text-amber-600 font-medium cursor-pointer">Salvar</button>
                            <button type="button" onClick={() => setViEditId(null)} className="text-xs text-gray-400 cursor-pointer">Cancelar</button>
                          </form>
                        ) : (
                          <>
                            <span className="flex-1 text-sm text-gray-800">{v.nome}</span>
                            <button onClick={() => { setViEditId(v.id); setViEditNome(v.nome) }} className="text-xs text-blue-600 hover:text-blue-700 font-medium cursor-pointer">Editar</button>
                            <button onClick={() => handleToggleVI(v.id, false)} className="text-xs text-red-600 bg-red-50 hover:bg-red-100 font-medium px-2 py-0.5 rounded-full cursor-pointer">Desativar</button>
                          </>
                        )}
                      </li>
                    ))}
                    {vendedorasInternas.filter((v) => !v.ativa).map((v) => (
                      <li key={v.id} className="px-6 py-2.5 flex items-center gap-3">
                        <span className="flex-1 text-sm text-gray-400 line-through">{v.nome}</span>
                        <button onClick={() => handleToggleVI(v.id, true)} className="text-xs text-green-600 bg-green-50 hover:bg-green-100 font-medium px-2 py-0.5 rounded-full cursor-pointer">Ativar</button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>

          {/* Lojas Parceiras */}
          <div>
            <button
              onClick={() => setLpOpen((o) => !o)}
              className="w-full px-6 py-3 flex items-center justify-between cursor-pointer text-left"
            >
              <div className="flex items-center gap-2">
                <ChevronIcon open={lpOpen} />
                <span className="text-sm font-medium text-gray-700">Lojas Parceiras</span>
                <span className="text-xs text-gray-400">{lpAtivas.length} ativa{lpAtivas.length !== 1 ? 's' : ''} — clique na loja para ver as vendedoras</span>
              </div>
            </button>

            {lpOpen && (
              <>
                <form onSubmit={handleAddLP} className="px-6 py-2 flex gap-2 border-t border-gray-50">
                  <input
                    type="text" value={lpNovo} onChange={(e) => setLpNovo(e.target.value)}
                    placeholder="Nome da loja parceira..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm"
                  />
                  <button type="submit" disabled={lpSaving || !lpNovo.trim()}
                    className="bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-40 cursor-pointer transition-colors">
                    Adicionar
                  </button>
                </form>
                {lojas.length === 0 ? (
                  <p className="px-6 py-4 text-sm text-gray-400">Nenhuma loja cadastrada.</p>
                ) : (
                  <ul>
                    {lojas.map((loja) => (
                      <LojaRow key={loja.id} loja={loja} onToggle={handleToggleLP} />
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default function TabConfigGlobais() {
  const [unidades, setUnidades] = useState([])

  useEffect(() => {
    supabase.from('unidades').select('*').eq('ativa', true).order('nome')
      .then(({ data }) => setUnidades(data || []))
  }, [])

  return (
    <div className="space-y-6">
      {unidades.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">Nenhuma unidade ativa.</p>
      ) : (
        unidades.map((u) => <UnidadeCard key={u.id} unidade={u} />)
      )}
    </div>
  )
}
