# Implantação segura do core de parcerias

Esta versão foi desenhada para preservar todos os dados existentes. A migração `migration_008_core_parceria.sql` é aditiva: cria índices, auditoria e funções; não apaga atendimentos, lojas, vendedoras ou unidades.

## Ordem obrigatória

1. Abrir uma janela de manutenção e avisar as unidades para interromper lançamentos.
2. No Supabase, gerar e baixar um backup completo do banco antes de qualquer alteração.
3. Registrar as contagens de conferência abaixo e salvar o resultado.
4. Aplicar a migração em um projeto de homologação restaurado a partir do backup.
5. Validar login admin, login de uma unidade, dashboard, filtros, lançamento e arquivamento.
6. Somente após a homologação, aplicar a migração em produção.
7. Publicar a Edge Function `manage-access` e depois publicar o frontend.
8. Desabilitar novos cadastros públicos em Authentication > Providers > Email (`Allow new users to sign up`).
9. Criar o acesso do Outlet pela aba **Acessos** e validar que ele enxerga apenas o Outlet.

## Conferência antes e depois

Execute e salve o resultado antes da migração e novamente após a implantação. As contagens devem permanecer iguais.

```sql
select 'unidades' tabela, count(*) total from public.unidades
union all select 'profiles', count(*) from public.profiles
union all select 'lojas_parceiras', count(*) from public.lojas_parceiras
union all select 'vendedoras_parceiras', count(*) from public.vendedoras_parceiras
union all select 'vendedoras_internas', count(*) from public.vendedoras_internas
union all select 'atendimentos', count(*) from public.atendimentos
union all select 'movimentacoes_pingentes', count(*) from public.movimentacoes_pingentes;
```

Também confira os totais financeiros:

```sql
select
  count(*) as atendimentos,
  count(*) filter (where houve_venda) as vendas,
  coalesce(sum(valor_venda) filter (where houve_venda), 0) as faturamento
from public.atendimentos;
```

## Comandos de implantação

Com o projeto Supabase correto já vinculado e as credenciais presentes apenas no ambiente local seguro:

```bash
npx supabase db push
npx supabase functions deploy manage-access
```

Não coloque `SUPABASE_SERVICE_ROLE_KEY` no Vite, no GitHub ou em qualquer variável prefixada com `VITE_`. A Edge Function recebe esse segredo automaticamente no ambiente Supabase.

## Critérios de aceite

- O admin vê todas as unidades e totais acima de 1.000.
- Cada unidade vê somente os próprios dados.
- Todos os atalhos de período e o intervalo personalizado incluem o último dia selecionado.
- Loja e vendedoras respeitam o filtro de unidade.
- Busca por cliente/boleta encontra registros antigos, não apenas a página atual.
- Criar um acesso não encerra nem troca a sessão do admin.
- Desativar acesso não apaga dados históricos e pode ser revertido.
- Alterações de atendimentos aparecem em Auditoria.

## Retorno em caso de falha

Não tente “corrigir no calor” se a conferência divergir. Interrompa a publicação, mantenha o frontend anterior e restaure o backup em um novo projeto para análise. Como a migração é transacional, falhas durante sua execução fazem rollback automático.
