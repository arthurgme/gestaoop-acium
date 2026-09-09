import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const allowedOrigins = new Set([
  'https://gestaoop.gmmidia.shop',
  'https://acium-voucher.vercel.app',
  'http://localhost:5173',
])

function corsHeaders(origin: string | null) {
  const safeOrigin = origin && allowedOrigins.has(origin) ? origin : 'https://gestaoop.gmmidia.shop'
  return {
    'Access-Control-Allow-Origin': safeOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  }
}

function json(body: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8' },
  })
}

function validPassword(password: unknown) {
  return typeof password === 'string'
    && password.length >= 8
    && /[a-z]/.test(password)
    && /[A-Z]/.test(password)
    && /\d/.test(password)
}

Deno.serve(async (request) => {
  const headers = corsHeaders(request.headers.get('Origin'))
  if (request.method === 'OPTIONS') return new Response('ok', { headers })
  if (request.method !== 'POST') return json({ error: 'Método não permitido.' }, 405, headers)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const authorization = request.headers.get('Authorization')
  if (!supabaseUrl || !serviceRoleKey || !authorization) {
    return json({ error: 'Acesso não autorizado.' }, 401, headers)
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const token = authorization.replace(/^Bearer\s+/i, '')
  const { data: authData, error: authError } = await admin.auth.getUser(token)
  if (authError || !authData.user) return json({ error: 'Sessão inválida.' }, 401, headers)

  const { data: caller } = await admin
    .from('profiles')
    .select('id, role, ativo')
    .eq('id', authData.user.id)
    .single()
  if (!caller || caller.role !== 'admin' || caller.ativo !== true) {
    return json({ error: 'Apenas administradores ativos podem gerenciar acessos.' }, 403, headers)
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return json({ error: 'Dados inválidos.' }, 400, headers)
  }

  const action = body.action

  if (action === 'create') {
    const nome = String(body.nome || '').trim()
    const username = String(body.username || '').trim().toLowerCase()
    const password = body.password
    const role = body.role === 'admin' ? 'admin' : 'pdv'
    const unidadeId = role === 'pdv' ? String(body.unidade_id || '') : null

    if (!nome || !/^[a-z0-9._-]{3,40}$/.test(username)) {
      return json({ error: 'Informe um nome e um usuário válido com 3 a 40 caracteres.' }, 400, headers)
    }
    if (!validPassword(password)) {
      return json({ error: 'A senha precisa ter 8 caracteres, letra maiúscula, minúscula e número.' }, 400, headers)
    }
    if (role === 'pdv') {
      const { data: unidade } = await admin.from('unidades').select('id').eq('id', unidadeId).eq('ativa', true).maybeSingle()
      if (!unidade) return json({ error: 'Selecione uma unidade ativa.' }, 400, headers)
    }

    const { data, error } = await admin.auth.admin.createUser({
      email: `${username}@acium.local`,
      password: String(password),
      email_confirm: true,
      user_metadata: { nome, username },
      app_metadata: {
        role,
        unidade_id: unidadeId,
        provisioned_by_admin: true,
      },
    })
    if (error) return json({ error: error.message }, 400, headers)

    await admin.from('audit_logs').insert({
      usuario_id: caller.id,
      unidade_id: unidadeId,
      entidade: 'profiles',
      entidade_id: data.user.id,
      acao: 'criar_acesso',
      dados_novos: { nome, username, role, unidade_id: unidadeId },
    })
    return json({ ok: true, user_id: data.user.id }, 201, headers)
  }

  const userId = String(body.user_id || '')
  if (!userId) return json({ error: 'Usuário não informado.' }, 400, headers)
  if (userId === caller.id && action === 'deactivate') {
    return json({ error: 'Você não pode desativar o próprio acesso.' }, 400, headers)
  }

  const { data: target } = await admin
    .from('profiles')
    .select('id, role, unidade_id, ativo')
    .eq('id', userId)
    .maybeSingle()
  if (!target) return json({ error: 'Usuário não encontrado.' }, 404, headers)

  if (action === 'reset_password') {
    if (!validPassword(body.password)) {
      return json({ error: 'A senha precisa ter 8 caracteres, letra maiúscula, minúscula e número.' }, 400, headers)
    }
    const { error } = await admin.auth.admin.updateUserById(userId, { password: String(body.password) })
    if (error) return json({ error: error.message }, 400, headers)
  } else if (action === 'deactivate') {
    if (target.role === 'admin') {
      const { count } = await admin.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'admin').eq('ativo', true)
      if ((count || 0) <= 1) return json({ error: 'Não é possível desativar o último administrador.' }, 400, headers)
    }
    const { error } = await admin.auth.admin.updateUserById(userId, { ban_duration: '876000h' })
    if (error) return json({ error: error.message }, 400, headers)
    await admin.from('profiles').update({ ativo: false }).eq('id', userId)
  } else if (action === 'reactivate') {
    const { error } = await admin.auth.admin.updateUserById(userId, { ban_duration: 'none' })
    if (error) return json({ error: error.message }, 400, headers)
    await admin.from('profiles').update({ ativo: true }).eq('id', userId)
  } else {
    return json({ error: 'Ação inválida.' }, 400, headers)
  }

  await admin.from('audit_logs').insert({
    usuario_id: caller.id,
    unidade_id: target.unidade_id,
    entidade: 'profiles',
    entidade_id: target.id,
    acao: String(action),
    dados_anteriores: { ativo: target.ativo },
  })
  return json({ ok: true }, 200, headers)
})
