import { useState } from 'react'
import Layout from '../../components/Layout'
import TabLancamento from './TabLancamento'
import TabAtendimentos from './TabAtendimentos'
import TabResultados from './TabResultados'
import TabPingentes from './TabPingentes'
import TabConfiguracoes from './TabConfiguracoes'

const TABS = [
  { key: 'lancamento', label: 'Lançamento' },
  { key: 'atendimentos', label: 'Atendimentos' },
  { key: 'resultados', label: 'Resultados' },
  { key: 'pingentes', label: 'Pingentes' },
  { key: 'configuracoes', label: 'Configurações' },
]

export default function PdvDashboard() {
  const [activeTab, setActiveTab] = useState('lancamento')

  return (
    <Layout tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'lancamento' && <TabLancamento />}
      {activeTab === 'atendimentos' && <TabAtendimentos />}
      {activeTab === 'resultados' && <TabResultados />}
      {activeTab === 'pingentes' && <TabPingentes />}
      {activeTab === 'configuracoes' && <TabConfiguracoes />}
    </Layout>
  )
}
