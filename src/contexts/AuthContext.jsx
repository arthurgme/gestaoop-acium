import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState('')

  async function fetchProfile(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*, unidade:unidades(id, nome)')
      .eq('id', userId)
      .single()
    if (error || !data) {
      setProfile(null)
      setAuthError('Este usuário ainda não possui um acesso configurado.')
      return
    }
    if (data.ativo === false) {
      await supabase.auth.signOut()
      setProfile(null)
      setSession(null)
      setAuthError('Este acesso está desativado. Fale com o administrador.')
      return
    }
    setAuthError('')
    setProfile(data)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
      if (session?.user) fetchProfile(session.user.id)
    }).catch(() => setLoading(false))

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setLoading(false)
      if (session?.user) {
        fetchProfile(session.user.id).catch(console.error)
      } else {
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signIn(email, password) {
    setAuthError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error }
  }

  async function signOut() {
    await supabase.auth.signOut()
    setSession(null)
    setProfile(null)
  }

  return (
    <AuthContext.Provider value={{ session, profile, loading, authError, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
