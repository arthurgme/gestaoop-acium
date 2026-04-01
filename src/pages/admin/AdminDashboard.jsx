import { useState } from 'react'
import Layout from '../../components/Layout'
import TabAnalise from './TabAnalise'
import TabPingentesAdmin from './TabPingentesAdmin'
import TabUnidades from './TabUnidades'
import TabEquipe from './TabEquipe'
import TabConfigGlobais from './TabConfigGlobais'

const TABS = [
  { key: 'analise', label: 'Análise' },
  { key: 'pingentes', label: 'Pingentes' },
  { key: 'unidades', label: 'Unidades' },
  { key: 'equipe', label: 'Equipe' },
  { key: 'config', label: 'Config. Globais' },
]

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('analise')

  return (
    <Layout tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'analise' && <TabAnalise />}
      {activeTab === 'pingentes' && <TabPingentesAdmin />}
      {activeTab === 'unidades' && <TabUnidades />}
      {activeTab === 'equipe' && <TabEquipe />}
      {activeTab === 'config' && <TabConfigGlobais />}
    </Layout>
  )
}
