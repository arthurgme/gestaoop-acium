import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mantém os testes independentes das credenciais locais e dos segredos do CI.
vi.stubEnv('VITE_SUPABASE_URL', 'http://127.0.0.1:54321')
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key')
