import { useAuth } from '../contexts/AuthContext'

export default function Layout({ children, tabs, activeTab, onTabChange }) {
  const { profile, signOut } = useAuth()

  return (
    <div className="app-shell">
      <header className="bg-[#fffdfa] border-b border-[#e7e0d3]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#ad7b1c] text-white grid place-items-center font-bold">A</div>
            <div>
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-stone-800">Gestão de Parcerias</h1>
              <p className="hidden sm:block text-[11px] text-stone-500">Acium · operação e relacionamento</p>
            </div>
            <span className="text-[10px] bg-[#f3e5c2] text-[#765718] px-2 py-1 rounded-full font-bold uppercase tracking-wide">
              {profile?.role === 'admin' ? 'Admin' : 'Unidade'}
            </span>
          </div>
          <div className="flex items-center gap-3 sm:gap-4">
            <span className="hidden md:block text-sm text-stone-600 text-right">
              {profile?.nome}
              {profile?.unidade && <small className="block text-stone-400">{profile.unidade.nome}</small>}
            </span>
            <button
              onClick={signOut}
              className="text-sm text-stone-500 hover:text-red-700 transition-colors cursor-pointer"
            >
              Sair
            </button>
          </div>
        </div>
      </header>

      {tabs && (
        <div className="bg-[#fffdfa] border-b border-[#e7e0d3]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <nav className="flex gap-1 -mb-px overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => onTabChange(tab.key)}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                    activeTab === tab.key
                      ? 'border-[#ad7b1c] text-[#765718]'
                      : 'border-transparent text-stone-500 hover:text-stone-800 hover:border-stone-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-5 sm:py-7">{children}</main>
    </div>
  )
}
