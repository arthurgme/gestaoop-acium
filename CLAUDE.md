# Acium Voucher

Sistema interno de controle de atendimentos via voucher físico para as unidades da Acium Joias.

## Fluxo do negócio

Cliente chega na unidade com voucher físico recebido de uma vendedora parceira → retira brinde (pingente) → vendedora interna se identifica numa tela de seleção e registra o atendimento → se houver venda, registra os dados da venda. Cada atendimento consome 1 pingente do estoque da unidade automaticamente.

## Stack

- React + Vite
- Supabase (banco, auth, API) — sem backend próprio
- Tailwind CSS (via `@tailwindcss/vite`)
- React Router
- Deploy target: Vercel

## Variáveis de ambiente

```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

## Estrutura do projeto

```
src/
├── lib/supabase.js          # Cliente Supabase
├── lib/format.js            # Helpers: formatCurrency, formatDate, todayRange, monthRange
├── contexts/AuthContext.jsx  # Auth provider com session + profile + role
├── components/
│   ├── ProtectedRoute.jsx   # Rota protegida por role (admin/pdv)
│   └── Layout.jsx           # Layout com header, tabs, logout
├── pages/
│   ├── Login.jsx
│   ├── pdv/                 # Dashboard PDV (4 abas)
│   │   ├── PdvDashboard.jsx
│   │   ├── TabLancamento.jsx      # Novo atendimento + lista do dia
│   │   ├── TabResultados.jsx      # Métricas do mês atual
│   │   ├── TabPingentes.jsx       # Saldo + registrar entrada + histórico
│   │   └── TabConfiguracoes.jsx   # CRUD vendedoras internas, lojas e vendedoras parceiras
│   └── admin/               # Dashboard Admin (5 abas)
│       ├── AdminDashboard.jsx
│       ├── TabAnalise.jsx         # Filtros + métricas + tabela de atendimentos
│       ├── TabPingentesAdmin.jsx  # Saldos por unidade + ajuste manual
│       ├── TabUnidades.jsx        # CRUD unidades + criar usuário PDV junto
│       ├── TabEquipe.jsx          # CRUD usuários + reset senha
│       └── TabConfigGlobais.jsx   # Visão consolidada lojas/vendedoras por unidade
supabase/
└── migration.sql            # Schema completo, triggers, RLS, funções RPC
```

## Perfis de usuário

- **admin**: acesso total, sem restrição de unidade
- **pdv**: 1 por unidade, acessa apenas dados da própria unidade

Vendedoras internas não têm login — se identificam por seleção na tela de lançamento.

## Schema do banco (Supabase)

Tabelas: `unidades`, `profiles` (extensão auth.users), `vendedoras_internas`, `lojas_parceiras`, `vendedoras_parceiras`, `atendimentos`, `movimentacoes_pingentes`.

### Lógica de pingentes

- Atendimento inserido → trigger `deduct_pingente_on_atendimento` decrementa saldo e registra saída
- Entrada de pingentes → RPC `registrar_entrada_pingentes` incrementa saldo
- Ajuste manual (admin) → RPC `ajuste_manual_pingentes` define saldo e registra com observação obrigatória

### RLS

- PDV: lê/insere apenas onde `unidade_id` = sua unidade
- PDV: insere movimentações apenas tipo "entrada"
- Admin: acesso total em todas as tabelas
- Helpers: `current_user_role()` e `current_user_unidade_id()`

## Comandos

```bash
npm run dev      # Dev server
npm run build    # Build para produção
npm run preview  # Preview do build
```

## Deploy

- **GitHub:** https://github.com/arthurgme/gestaoop-acium
- **Vercel:** https://acium-voucher.vercel.app
- Deploy automático a cada `git push origin main`
- Variáveis de ambiente configuradas na Vercel: `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`

Para novo deploy manual:
```bash
git add .
git commit -m "..."
git push
```

## Erros inline (padrão)

Nenhum `alert()` no codebase. Todos os erros são exibidos como banners vermelhos inline, próximos ao elemento que gerou o erro:

```jsx
const [erro, setErro] = useState('')

// No handler:
if (error) setErro('Mensagem: ' + error.message)

// No JSX:
{erro && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{erro}</p>}
```

## Setup inicial

1. Criar projeto no Supabase
2. Criar `.env` com URL e anon key (ver `.env.example`)
3. Executar `supabase/migration.sql` no SQL Editor do Supabase
4. Executar migrações adicionais na ordem (002 a 005)
5. Criar primeiro usuário admin manualmente no Supabase Auth + inserir profile com role "admin"

---

## Padrões de UI/UX

### Seções colapsáveis

Todo card com lista ou tabela tem header clicável que expande/recolhe o conteúdo. Aberto por padrão. Padrão:

```jsx
const [open, setOpen] = useState(true)

<div className="bg-white rounded-xl shadow">
  <button
    onClick={() => setOpen((o) => !o)}
    className="w-full px-6 py-4 flex items-center justify-between cursor-pointer text-left border-b border-gray-100"
  >
    <div>
      <h3 className="font-semibold text-gray-800">Título</h3>
      <p className="text-xs text-gray-400 mt-0.5">{items.length} item(s)</p>
    </div>
    <svg className={`w-5 h-5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  </button>
  {open && ( ... conteúdo ... )}
</div>
```

### Acordeão (loja → vendedoras)

Lojas Parceiras usam acordeão: clicar na loja expande as vendedoras daquela loja inline. Chevron lateral (`→`) indica profundidade. Padrão aplicado em `TabConfiguracoes` e `TabConfigGlobais`.

### Formulários de adição

- Campos de adição ficam **sempre visíveis** no topo da seção (não escondidos atrás de botão)
- Botão desabilitado enquanto campo vazio ou salvando
- Botão desabilitado tem `disabled:opacity-40`

```jsx
<form onSubmit={handleAdd} className="px-6 py-3 border-b border-gray-100 flex gap-2">
  <input ... placeholder="Nome..." className="flex-1 ..." />
  <button type="submit" disabled={saving || !nome.trim()}
    className="bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-40 cursor-pointer transition-colors">
    Adicionar
  </button>
</form>
```

### Edição inline

Nomes de itens são editáveis diretamente na lista. Clicar em "Editar" substitui o texto por um input com foco automático. Padrão:

```jsx
{editId === item.id ? (
  <form onSubmit={(e) => handleEdit(e, item.id)} className="flex-1 flex gap-2">
    <input type="text" value={editNome} onChange={(e) => setEditNome(e.target.value)} autoFocus
      className="flex-1 px-3 py-1 border border-amber-400 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-500" />
    <button type="submit" className="text-xs text-amber-600 font-medium cursor-pointer">Salvar</button>
    <button type="button" onClick={() => setEditId(null)} className="text-xs text-gray-400 cursor-pointer">Cancelar</button>
  </form>
) : (
  <>
    <span className="flex-1 text-sm text-gray-800">{item.nome}</span>
    <button onClick={() => { setEditId(item.id); setEditNome(item.nome) }}
      className="text-xs text-blue-600 hover:text-blue-700 font-medium cursor-pointer">Editar</button>
    ...
  </>
)}
```

### Ativar / Desativar

Itens inativos aparecem **no final da lista** com texto riscado (`line-through`) e botão "Ativar". Itens ativos têm botão "Desativar" em vermelho.

```jsx
// Ativo
<button className="text-xs text-red-600 bg-red-50 hover:bg-red-100 font-medium px-3 py-1 rounded-full cursor-pointer">
  Desativar
</button>
// Inativo
<button className="text-xs text-green-600 bg-green-50 hover:bg-green-100 font-medium px-3 py-1 rounded-full cursor-pointer">
  Ativar
</button>
```

### Cores e estilo

- Cor primária: `amber-600` (botões, foco, destaque)
- Cards: `bg-white rounded-xl shadow`
- Separadores internos: `border-b border-gray-100` ou `divide-y divide-gray-50`
- Texto principal: `text-gray-800`, secundário: `text-gray-600`, placeholder: `text-gray-400`
- Badges de role: admin → `bg-purple-100 text-purple-700`, pdv → `bg-blue-100 text-blue-700`
- Badges de status: sucesso → `bg-green-100 text-green-700`, erro → `bg-red-100 text-red-700`

### AuthContext

- `loading` = true apenas enquanto sessão é desconhecida (localStorage, instantâneo)
- `loading` se torna false antes de `fetchProfile` completar — profile carrega em background
- `ProtectedRoute` mostra spinner secundário enquanto session existe mas profile ainda é null

---

## Migrações SQL

Arquivos em `supabase/`, numerados sequencialmente. Executar no SQL Editor do Supabase Dashboard.

| Arquivo | Descrição |
|---|---|
| `migration.sql` | Schema completo inicial |
| `migration_002_delete_user.sql` | RPC `delete_user` |
| `migration_003_username.sql` | Campo `username` em profiles |
| `migration_004_lojas_parceiras.sql` | Seed lojas parceiras por unidade |
| `migration_005_remove_vendedoras_grande_rio.sql` | Remove vendedoras internas Grande Rio |
