/**
 * A sessao da conta, guardada no aparelho.
 *
 * Modulo separado e pequeno de proposito: license.ts (para mandar a sessao ao
 * ativar) e auth.ts (para entrar e sair) precisam dela, e um importando o
 * outro viraria dependencia circular.
 *
 * Chave propria, como a licenca: "recomecar o programa" apaga o progresso e
 * nao pode deslogar ninguem.
 */
const SESSION_KEY = 'kegel-pelvic:session'

/** O login esta ligado neste build? Decidido ao compilar, como a porta de acesso. */
export const LOGIN_ENABLED = import.meta.env.VITE_LOGIN === 'true'

export interface Account {
  email: string
  name: string
  photo: string
}

export interface Session {
  token: string
  user: Account
}

export function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const s = JSON.parse(raw) as Partial<Session>
    if (typeof s.token !== 'string' || !s.user || typeof s.user.email !== 'string') return null
    return {
      token: s.token,
      user: {
        email: s.user.email,
        name: typeof s.user.name === 'string' ? s.user.name : '',
        photo: typeof s.user.photo === 'string' ? s.user.photo : '',
      },
    }
  } catch {
    return null
  }
}

export function saveSession(session: Session): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  } catch {
    /* storage bloqueado: a sessao vale ate fechar o app */
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY)
  } catch {
    /* idem */
  }
}

/** Cabecalho de autorizacao, quando ha sessao. */
export const authHeader = (): Record<string, string> => {
  const s = loadSession()
  return s ? { Authorization: `Bearer ${s.token}` } : {}
}
