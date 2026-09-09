import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { formatDateTime } from '../../lib/format'

export default function TabAuditoria() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('audit_logs').select('id, criado_em, entidade, acao, entidade_id, unidade:unidades(nome), usuario:profiles!audit_logs_usuario_id_fkey(nome)').order('criado_em', { ascending: false }).limit(200)
      .then(({ data }) => { setLogs(data || []); setLoading(false) })
  }, [])

  return (
    <div className="space-y-5">
      <div className="page-intro"><div><p className="eyebrow">Rastreabilidade</p><h2>Auditoria</h2><p>Alterações de atendimentos e acessos, preservadas para conferência.</p></div></div>
      <section className="surface overflow-hidden">
        <div className="section-heading"><div><h3>Atividade recente</h3><p>Últimos 200 eventos administrativos.</p></div></div>
        {loading ? <p className="empty-state">Carregando…</p> : logs.length === 0 ? <p className="empty-state">Nenhuma alteração registrada.</p> : <div className="overflow-x-auto"><table className="data-table"><thead><tr><th>Data</th><th>Ação</th><th>Entidade</th><th>Unidade</th><th>Responsável</th></tr></thead><tbody>{logs.map((log) => <tr key={log.id}><td className="whitespace-nowrap">{formatDateTime(log.criado_em)}</td><td className="font-semibold text-stone-800">{log.acao.replaceAll('_', ' ')}</td><td>{log.entidade}</td><td>{log.unidade?.nome || '—'}</td><td>{log.usuario?.nome || 'Sistema'}</td></tr>)}</tbody></table></div>}
      </section>
    </div>
  )
}
