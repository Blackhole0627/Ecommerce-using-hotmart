/**
 * Quem esta logada neste aparelho.
 *
 * Sair e excluir terminam com a pagina recarregada de proposito: limpa de uma
 * vez sessao, licenca, progresso local e todo estado em memoria, sem o risco
 * de alguma tela ainda mostrar o treino da conta anterior.
 */
import { useCallback, useState } from 'react'
import { deleteRemoteAccount } from './auth'
import { clearLicence } from './license'
import { clearSession, loadSession, LOGIN_ENABLED, saveSession, type Account, type Session } from './session'
import { reset as resetProgress } from './storage'

function wipeAndReload(): void {
  clearSession()
  clearLicence()
  // O progresso esta na conta; tirar daqui e o que torna o celular
  // compartilhado seguro. Voltando a entrar, ele desce de novo.
  resetProgress()
  location.reload()
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(() => (LOGIN_ENABLED ? loadSession() : null))

  const signedIn = useCallback((s: Session) => setSession(s), [])

  const updateUser = useCallback((user: Account) => {
    setSession((prev) => {
      if (!prev) return prev
      if (JSON.stringify(prev.user) === JSON.stringify(user)) return prev
      const next = { ...prev, user }
      saveSession(next)
      return next
    })
  }, [])

  const signOut = useCallback(() => wipeAndReload(), [])

  /** Apaga a conta no servidor e sai. Falhou: fica logada e a tela avisa. */
  const deleteAccount = useCallback(async (): Promise<boolean> => {
    const ok = await deleteRemoteAccount()
    if (ok) wipeAndReload()
    return ok
  }, [])

  return { session, signedIn, updateUser, signOut, deleteAccount }
}
