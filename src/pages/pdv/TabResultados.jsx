import AnalyticsDashboard from '../../components/AnalyticsDashboard'
import { useAuth } from '../../contexts/AuthContext'

export default function TabResultados() {
  const { profile } = useAuth()
  if (!profile?.unidade_id) return <div className="alert-error">Este acesso ainda não está vinculado a uma unidade.</div>
  return <AnalyticsDashboard fixedUnidadeId={profile.unidade_id} unidadeNome={profile.unidade?.nome} />
}
