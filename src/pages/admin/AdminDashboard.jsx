import { useState } from 'react'
import Layout from '../../components/Layout'
import TabAnalise from './TabAnalise'
import TabAtendimentos from './TabAtendimentos'
import TabParceiros from './TabParceiros'
import TabPingentesAdmin from './TabPingentesAdmin'
import TabUnidades from './TabUnidades'
import TabEquipe from './TabEquipe'
import TabConfigGlobais from './TabConfigGlobais'
import TabAuditoria from './TabAuditoria'

const TABS = [
  { key: 'analise', label: 'Dashboard' },
  { key: 'atendimentos', label: 'Atendimentos' },
  { key: 'parceiros', label: 'Parceiros' },
  { key: 'unidades', label: 'Unidades' },
  { key: 'equipe', label: 'Acessos' },
  { key: 'pingentes', label: 'Estoque' },
  { key: 'config', label: 'Configurações' },
  { key: 'auditoria', label: 'Auditoria' },
]

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('analise')

  return (
    <Layout tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'analise' && <TabAnalise />}
      {activeTab === 'atendimentos' && <TabAtendimentos />}
      {activeTab === 'parceiros' && <TabParceiros />}
      {activeTab === 'pingentes' && <TabPingentesAdmin />}
      {activeTab === 'unidades' && <TabUnidades />}
      {activeTab === 'equipe' && <TabEquipe />}
      {activeTab === 'config' && <TabConfigGlobais />}
      {activeTab === 'auditoria' && <TabAuditoria />}
    </Layout>
  )
}
