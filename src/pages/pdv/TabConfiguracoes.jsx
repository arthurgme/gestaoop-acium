import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

// ── Vendedoras Internas ─────────────────────────────────────────────────────

function VendedorasInternas({ unidadeId }) {
  const [items, setItems] = useState([])
  const [open, setOpen] = useState(false)
  const [busca, setBusca] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [novoNome, setNovoNome] = useState('')
  const [editId, setEditId] = useState(null)
  const [editNome, setEditNome] = useState('')
  const [saving, setSaving] = useState(false)
  const [verArquivadas, setVerArquivadas] = useState(false)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('vendedoras_internas')
      .select('*')
      .eq('unidade_id', unidadeId)
      .order('nome')
    setItems(data || [])
  }, [unidadeId])

  useEffect(() => { load() }, [load])

  async function handleAdd(e) {
    e.preventDefault()
    if (!novoNome.trim()) return
    setSaving(true)
    await supabase.from('vendedoras_internas').insert({ nome: novoNome.trim(), unidade_id: unidadeId })
    setNovoNome('')
    setShowAdd(false)
    await load()
    setSaving(false)
  }

  async function handleEdit(e, id) {
    e.preventDefault()
    if (!editNome.trim()) return
    await supabase.from('vendedoras_internas').update({ nome: editNome.trim() }).eq('id', id)
    setEditId(null)
    load()
  }

  async function handleToggle(id, ativa) {
    await supabase.from('vendedoras_internas').update({ ativa }).eq('id', id)
    load()
  }

  const ativas = items.filter((i) => i.ativa)
  const inativas = items.filter((i) => !i.ativa)
  const ativasFiltradas = ativas.filter((i) => i.nome.toLowerCase().includes(busca.toLowerCase()))

  return (
    <div className="bg-white rounded-xl shadow">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full px-6 py-4 border-b border-gray-100 flex items-center justify-between cursor-pointer text-left"
      >
        <div>
          <h3 className="font-semibold text-gray-800">Vendedoras Internas</h3>
          <p className="text-xs text-gray-400 mt-0.5">{ativas.length} ativa{ativas.length !== 1 ? 's' : ''}</p>
        </div>
        <svg className={`w-5 h-5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <>
          {/* Barra de busca + botão adicionar */}
          <div className="px-6 py-3 border-b border-gray-100 flex items-center gap-2">
            <div className="flex-1 flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus-within:bg-white focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-100 transition-all">
              <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
              </svg>
              <input
                type="text"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar vendedora..."
                className="flex-1 outline-none text-sm bg-transparent text-gray-800 placeholder-gray-400"
              />
            </div>
            <button
              onClick={() => { setShowAdd((v) => !v); setNovoNome('') }}
              title="Adicionar vendedora"
              className={`w-9 h-9 flex items-center justify-center rounded-lg border transition-colors cursor-pointer flex-shrink-0 ${
                showAdd
                  ? 'bg-amber-600 border-amber-600 text-white'
                  : 'border-gray-200 text-gray-500 hover:border-amber-500 hover:text-amber-600'
              }`}
            >
              <svg className={`w-4 h-4 transition-transform ${showAdd ? 'rotate-45' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>

          {/* Formulário de adição (visível ao clicar em +) */}
          {showAdd && (
            <form onSubmit={handleAdd} className="px-6 py-3 border-b border-gray-100 flex gap-2 bg-amber-50">
              <input
                type="text"
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
                placeholder="Nome da nova vendedora..."
                autoFocus
                className="flex-1 px-3 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm bg-white"
              />
              <button
                type="submit"
                disabled={saving || !novoNome.trim()}
                className="bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                Salvar
              </button>
              <button
                type="button"
                onClick={() => { setShowAdd(false); setNovoNome('') }}
                className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 cursor-pointer"
              >
                Cancelar
              </button>
            </form>
          )}

          {items.length === 0 ? (
            <p className="px-6 py-8 text-sm text-gray-400 text-center">Nenhuma vendedora cadastrada.</p>
          ) : (
            <>
              <ul className="divide-y divide-gray-50">
                {ativasFiltradas.map((item) => (
                  <li key={item.id} className="px-6 py-3 flex items-center gap-3">
                    {editId === item.id ? (
                      <form onSubmit={(e) => handleEdit(e, item.id)} className="flex-1 flex gap-2">
                        <input
                          type="text"
                          value={editNome}
                          onChange={(e) => setEditNome(e.target.value)}
                          autoFocus
                          className="flex-1 px-3 py-1.5 border border-amber-400 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                        />
                        <button type="submit" className="text-sm text-amber-600 font-medium cursor-pointer">Salvar</button>
                        <button type="button" onClick={() => setEditId(null)} className="text-sm text-gray-400 cursor-pointer">Cancelar</button>
                      </form>
                    ) : (
                      <>
                        <span className="flex-1 text-sm text-gray-800">{item.nome}</span>
                        <button
                          onClick={() => { setEditId(item.id); setEditNome(item.nome) }}
                          className="text-xs text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleToggle(item.id, false)}
                          className="text-xs text-red-600 bg-red-50 hover:bg-red-100 font-medium px-3 py-1 rounded-full cursor-pointer"
                        >
                          Arquivar
                        </button>
                      </>
                    )}
                  </li>
                ))}
                {busca && ativasFiltradas.length === 0 && (
                  <li className="px-6 py-6 text-sm text-gray-400 text-center">Nenhuma vendedora encontrada.</li>
                )}
              </ul>

              {inativas.length > 0 && (
                <div className="border-t border-gray-100">
                  <button
                    onClick={() => setVerArquivadas((v) => !v)}
                    className="w-full px-6 py-3 flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700 cursor-pointer transition-colors"
                  >
                    <svg className={`w-4 h-4 transition-transform ${verArquivadas ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    {verArquivadas ? 'Ocultar arquivadas' : `Ver arquivadas (${inativas.length})`}
                  </button>
                  {verArquivadas && (
                    <ul className="divide-y divide-gray-50 border-t border-gray-50">
                      {inativas.map((item) => (
                        <li key={item.id} className="px-6 py-3 flex items-center gap-3">
                          <span className="flex-1 text-sm text-gray-400 line-through">{item.nome}</span>
                          <button
                            onClick={() => handleToggle(item.id, true)}
                            className="text-xs text-green-600 bg-green-50 hover:bg-green-100 font-medium px-3 py-1 rounded-full cursor-pointer"
                          >
                            Ativar
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}

// ── Modal de Vendedoras da Loja ─────────────────────────────────────────────

function LojaModal({ loja, onClose, onVendadorasChange }) {
  const [vendedoras, setVendedoras] = useState([])
  const [busca, setBusca] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [novoNome, setNovoNome] = useState('')
  const [editId, setEditId] = useState(null)
  const [editNome, setEditNome] = useState('')
  const [saving, setSaving] = useState(false)
  const [verArquivadas, setVerArquivadas] = useState(false)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('vendedoras_parceiras')
      .select('*')
      .eq('loja_parceira_id', loja.id)
      .order('nome')
    setVendedoras(data || [])
  }, [loja.id])

  useEffect(() => { load() }, [load])

  async function handleAdd(e) {
    e.preventDefault()
    if (!novoNome.trim()) return
    setSaving(true)
    await supabase.from('vendedoras_parceiras').insert({ nome: novoNome.trim(), loja_parceira_id: loja.id })
    setNovoNome('')
    setShowAdd(false)
    await load()
    onVendadorasChange(loja.id)
    setSaving(false)
  }

  async function handleEdit(e, id) {
    e.preventDefault()
    if (!editNome.trim()) return
    await supabase.from('vendedoras_parceiras').update({ nome: editNome.trim() }).eq('id', id)
    setEditId(null)
    load()
  }

  async function handleToggle(id, ativa) {
    await supabase.from('vendedoras_parceiras').update({ ativa }).eq('id', id)
    await load()
    onVendadorasChange(loja.id)
  }

  const ativas = vendedoras.filter((v) => v.ativa)
  const inativas = vendedoras.filter((v) => !v.ativa)
  const ativasFiltradas = ativas.filter((v) => v.nome.toLowerCase().includes(busca.toLowerCase()))

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-md flex flex-col"
        style={{ maxHeight: '80vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <div>
            <h3 className="font-semibold text-gray-800">{loja.nome}</h3>
            <p className="text-xs text-gray-400 mt-0.5">{ativas.length} vendedora{ativas.length !== 1 ? 's' : ''} ativa{ativas.length !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Barra de busca + botão adicionar */}
        <div className="px-6 py-3 border-b border-gray-100 flex items-center gap-2 flex-shrink-0">
          <div className="flex-1 flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus-within:bg-white focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-100 transition-all">
            <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
            </svg>
            <input
              type="text"
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar vendedora..."
              className="flex-1 outline-none text-sm bg-transparent text-gray-800 placeholder-gray-400"
            />
          </div>
          <button
            onClick={() => { setShowAdd((v) => !v); setNovoNome('') }}
            title="Adicionar vendedora"
            className={`w-9 h-9 flex items-center justify-center rounded-lg border transition-colors cursor-pointer flex-shrink-0 ${
              showAdd
                ? 'bg-amber-600 border-amber-600 text-white'
                : 'border-gray-200 text-gray-500 hover:border-amber-500 hover:text-amber-600'
            }`}
          >
            <svg className={`w-4 h-4 transition-transform ${showAdd ? 'rotate-45' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        {/* Formulário de adição */}
        {showAdd && (
          <form onSubmit={handleAdd} className="px-6 py-3 border-b border-gray-100 flex gap-2 bg-amber-50 flex-shrink-0">
            <input
              type="text"
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              placeholder="Nome da nova vendedora..."
              autoFocus
              className="flex-1 px-3 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm bg-white"
            />
            <button
              type="submit"
              disabled={saving || !novoNome.trim()}
              className="bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              Salvar
            </button>
            <button
              type="button"
              onClick={() => { setShowAdd(false); setNovoNome('') }}
              className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 cursor-pointer"
            >
              Cancelar
            </button>
          </form>
        )}

        {/* Lista de vendedoras ativas */}
        <div className="overflow-y-auto flex-1">
          {vendedoras.length === 0 ? (
            <p className="px-6 py-8 text-sm text-gray-400 text-center">Nenhuma vendedora cadastrada.</p>
          ) : ativasFiltradas.length === 0 && !busca ? (
            <p className="px-6 py-6 text-sm text-gray-400 text-center">Nenhuma vendedora ativa.</p>
          ) : (
            <ul className="divide-y divide-gray-50">
              {ativasFiltradas.map((v) => (
                <li key={v.id} className="px-6 py-3 flex items-center gap-3">
                  {editId === v.id ? (
                    <form onSubmit={(e) => handleEdit(e, v.id)} className="flex-1 flex gap-2">
                      <input
                        type="text"
                        value={editNome}
                        onChange={(e) => setEditNome(e.target.value)}
                        autoFocus
                        className="flex-1 px-3 py-1.5 border border-amber-400 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none text-sm"
                      />
                      <button type="submit" className="text-sm text-amber-600 font-medium cursor-pointer">Salvar</button>
                      <button type="button" onClick={() => setEditId(null)} className="text-sm text-gray-400 cursor-pointer">Cancelar</button>
                    </form>
                  ) : (
                    <>
                      <span className="flex-1 text-sm text-gray-800">{v.nome}</span>
                      <button
                        onClick={() => { setEditId(v.id); setEditNome(v.nome) }}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium cursor-pointer"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleToggle(v.id, false)}
                        className="text-xs text-red-600 bg-red-50 hover:bg-red-100 font-medium px-3 py-1 rounded-full cursor-pointer"
                      >
                        Arquivar
                      </button>
                    </>
                  )}
                </li>
              ))}
              {busca && ativasFiltradas.length === 0 && (
                <li className="px-6 py-6 text-sm text-gray-400 text-center">Nenhuma vendedora encontrada.</li>
              )}
            </ul>
          )}

          {/* Seção de arquivadas */}
          {inativas.length > 0 && (
            <div className="border-t border-gray-100">
              <button
                onClick={() => setVerArquivadas((v) => !v)}
                className="w-full px-6 py-3 flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700 cursor-pointer transition-colors"
              >
                <svg className={`w-4 h-4 transition-transform ${verArquivadas ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
                {verArquivadas ? 'Ocultar arquivadas' : `Ver arquivadas (${inativas.length})`}
              </button>
              {verArquivadas && (
                <ul className="divide-y divide-gray-50 border-t border-gray-50">
                  {inativas.map((v) => (
                    <li key={v.id} className="px-6 py-3 flex items-center gap-3">
                      <span className="flex-1 text-sm text-gray-400 line-through">{v.nome}</span>
                      <button
                        onClick={() => handleToggle(v.id, true)}
                        className="text-xs text-green-600 bg-green-50 hover:bg-green-100 font-medium px-3 py-1 rounded-full cursor-pointer"
                      >
                        Ativar
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Lojas Parceiras ─────────────────────────────────────────────────────────

function LojasParceiras({ unidadeId }) {
  const [lojas, setLojas] = useState([])
  const [open, setOpen] = useState(false)
  const [busca, setBusca] = useState('')
  const [showAdd, setShowAdd] = useState(false)
  const [novoNome, setNovoNome] = useState('')
  const [saving, setSaving] = useState(false)
  const [lojaAberta, setLojaAberta] = useState(null)
  const [contagemVendedoras, setContagemVendedoras] = useState({})
  const [verArquivadas, setVerArquivadas] = useState(false)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('lojas_parceiras')
      .select('*')
      .eq('unidade_id', unidadeId)
      .order('nome')
    setLojas(data || [])
  }, [unidadeId])

  const loadContagens = useCallback(async () => {
    const { data } = await supabase
      .from('vendedoras_parceiras')
      .select('loja_parceira_id')
      .eq('ativa', true)
    if (data) {
      const mapa = {}
      data.forEach(({ loja_parceira_id }) => {
        mapa[loja_parceira_id] = (mapa[loja_parceira_id] || 0) + 1
      })
      setContagemVendedoras(mapa)
    }
  }, [])

  useEffect(() => {
    load()
    loadContagens()
  }, [load, loadContagens])

  async function handleAdd(e) {
    e.preventDefault()
    if (!novoNome.trim()) return
    setSaving(true)
    await supabase.from('lojas_parceiras').insert({ nome: novoNome.trim(), unidade_id: unidadeId })
    setNovoNome('')
    setShowAdd(false)
    await load()
    setSaving(false)
  }

  async function handleToggleLoja(id, ativa) {
    await supabase.from('lojas_parceiras').update({ ativa }).eq('id', id)
    load()
  }

  function handleVendadorasChange() {
    loadContagens()
  }

  const ativas = lojas.filter((l) => l.ativa)
  const inativas = lojas.filter((l) => !l.ativa)
  const ativasFiltradas = ativas.filter((l) => l.nome.toLowerCase().includes(busca.toLowerCase()))

  return (
    <>
      <div className="bg-white rounded-xl shadow">
        <button
          onClick={() => setOpen((o) => !o)}
          className="w-full px-6 py-4 border-b border-gray-100 flex items-center justify-between cursor-pointer text-left"
        >
          <div>
            <h3 className="font-semibold text-gray-800">Lojas Parceiras</h3>
            <p className="text-xs text-gray-400 mt-0.5">{ativas.length} ativa{ativas.length !== 1 ? 's' : ''} — clique na loja para gerenciar vendedoras</p>
          </div>
          <svg className={`w-5 h-5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {open && (
          <>
            {/* Barra de busca + botão adicionar */}
            <div className="px-6 py-3 border-b border-gray-100 flex items-center gap-2">
              <div className="flex-1 flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 focus-within:bg-white focus-within:border-amber-400 focus-within:ring-2 focus-within:ring-amber-100 transition-all">
                <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                </svg>
                <input
                  type="text"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar loja parceira..."
                  className="flex-1 outline-none text-sm bg-transparent text-gray-800 placeholder-gray-400"
                />
              </div>
              <button
                onClick={() => { setShowAdd((v) => !v); setNovoNome('') }}
                title="Adicionar loja parceira"
                className={`w-9 h-9 flex items-center justify-center rounded-lg border transition-colors cursor-pointer flex-shrink-0 ${
                  showAdd
                    ? 'bg-amber-600 border-amber-600 text-white'
                    : 'border-gray-200 text-gray-500 hover:border-amber-500 hover:text-amber-600'
                }`}
              >
                <svg className={`w-4 h-4 transition-transform ${showAdd ? 'rotate-45' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>

            {/* Formulário de adição */}
            {showAdd && (
              <form onSubmit={handleAdd} className="px-6 py-3 border-b border-gray-100 flex gap-2 bg-amber-50">
                <input
                  type="text"
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                  placeholder="Nome da nova loja parceira..."
                  autoFocus
                  className="flex-1 px-3 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none text-sm bg-white"
                />
                <button
                  type="submit"
                  disabled={saving || !novoNome.trim()}
                  className="bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                >
                  Salvar
                </button>
                <button
                  type="button"
                  onClick={() => { setShowAdd(false); setNovoNome('') }}
                  className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700 cursor-pointer"
                >
                  Cancelar
                </button>
              </form>
            )}

            {lojas.length === 0 ? (
              <p className="px-6 py-8 text-sm text-gray-400 text-center">Nenhuma loja cadastrada.</p>
            ) : (
              <>
                <ul className="divide-y divide-gray-50">
                  {ativasFiltradas.map((loja) => {
                    const qtd = contagemVendedoras[loja.id] || 0
                    return (
                      <li key={loja.id} className="px-6 py-3 flex items-center gap-3">
                        <button
                          onClick={() => setLojaAberta(loja)}
                          className="flex-1 flex items-center gap-2 text-left cursor-pointer group"
                        >
                          <span className="text-sm font-medium text-gray-800 group-hover:text-amber-700 transition-colors">{loja.nome}</span>
                          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                            {qtd} vendedora{qtd !== 1 ? 's' : ''}
                          </span>
                          <svg className="w-4 h-4 text-gray-300 group-hover:text-amber-500 transition-colors ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleToggleLoja(loja.id, false)}
                          className="text-xs text-red-600 bg-red-50 hover:bg-red-100 font-medium px-3 py-1 rounded-full cursor-pointer"
                        >
                          Desativar
                        </button>
                      </li>
                    )
                  })}
                  {busca && ativasFiltradas.length === 0 && (
                    <li className="px-6 py-6 text-sm text-gray-400 text-center">Nenhuma loja encontrada.</li>
                  )}
                </ul>

                {inativas.length > 0 && (
                  <div className="border-t border-gray-100">
                    <button
                      onClick={() => setVerArquivadas((v) => !v)}
                      className="w-full px-6 py-3 flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700 cursor-pointer transition-colors"
                    >
                      <svg className={`w-4 h-4 transition-transform ${verArquivadas ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                      {verArquivadas ? 'Ocultar arquivadas' : `Ver arquivadas (${inativas.length})`}
                    </button>
                    {verArquivadas && (
                      <ul className="divide-y divide-gray-50 border-t border-gray-50">
                        {inativas.map((loja) => (
                          <li key={loja.id} className="px-6 py-3 flex items-center gap-3">
                            <span className="flex-1 text-sm text-gray-400 line-through">{loja.nome}</span>
                            <button
                              onClick={() => handleToggleLoja(loja.id, true)}
                              className="text-xs text-green-600 bg-green-50 hover:bg-green-100 font-medium px-3 py-1 rounded-full cursor-pointer"
                            >
                              Ativar
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {lojaAberta && (
        <LojaModal
          loja={lojaAberta}
          onClose={() => setLojaAberta(null)}
          onVendadorasChange={handleVendadorasChange}
        />
      )}
    </>
  )
}

// ── Tab principal ───────────────────────────────────────────────────────────

export default function TabConfiguracoes() {
  const { profile } = useAuth()
  const unidadeId = profile?.unidade_id

  if (!unidadeId) return null

  return (
    <div className="space-y-6">
      <VendedorasInternas unidadeId={unidadeId} />
      <LojasParceiras unidadeId={unidadeId} />
    </div>
  )
}
