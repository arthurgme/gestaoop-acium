# Gestão de Parcerias Acium

Sistema interno para registrar e analisar indicações entre unidades Acium, lojas parceiras e vendedoras.

## Perfis

- **Administrador:** visão consolidada, cadastro de unidades, gestão de acessos, parceiros, estoque e auditoria.
- **Unidade:** lançamento e consulta apenas dos dados da própria unidade, além dos cadastros operacionais permitidos.

## Desenvolvimento

```bash
npm install
cp .env.example .env
npm run dev
```

Validações:

```bash
npm run lint
npm test
npm run build
```

## Banco de dados

As migrações estão em `supabase/`. A migração atual do core é `migration_008_core_parceria.sql` e deve ser aplicada somente depois de backup e homologação.

Leia o [roteiro de implantação](docs/implantacao-core-parceria.md) antes de alterar produção.

## Segurança

- O frontend usa somente a chave pública (`VITE_SUPABASE_ANON_KEY`).
- Criação, redefinição de senha e reativação de usuários passam pela Edge Function `manage-access`.
- Nunca inclua a service role em arquivos `.env` usados pelo Vite.
- Cadastro público por e-mail deve permanecer desabilitado no Supabase Auth.
