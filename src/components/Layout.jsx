import { useAuth } from '../contexts/AuthContext'

export default function Layout({ children, tabs, activeTab, onTabChange }) {
  const { profile, signOut } = useAuth()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-amber-700">Acium Voucher</h1>
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium uppercase">
              {profile?.role}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {profile?.nome}
              {profile?.unidade && ` — ${profile.unidade.nome}`}
            </span>
            <button
              onClick={signOut}
              className="text-sm text-gray-500 hover:text-red-600 transition-colors cursor-pointer"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      {tabs && (
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <nav className="flex gap-1 -mb-px overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => onTabChange(tab.key)}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                    activeTab === tab.key
                      ? 'border-amber-600 text-amber-700'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">{children}</main>
    </div>
  )
}
