/**
 * Progresso na nuvem: o aparelho continua sendo a copia de trabalho, e a
 * conta e onde as copias de todos os aparelhos se encontram.
 *
 *   ao abrir       busca o da conta, junta com o daqui, devolve o resultado
 *   ao mudar algo  espera 1,2 s (varias mudancas viram um envio so) e envia
 *   sem internet   marca como pendente e tenta de novo quando a rede voltar
 *   ao sair do app tenta enviar o que estiver pendente
 *
 * Nunca trava o treino: se a nuvem falhar, o app segue com o que esta no
 * aparelho, que e exatamente como ele funcionava antes da conta existir.
 *
 * A sessao interrompida (activeSession) NAO sobe: "continuar de onde parou"
 * so faz sentido no aparelho em que o treino parou.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { mergeProgress, sameProgress, sanitizeProgress, type SyncedProgress } from '../../api/_merge'
import { fetchAccount, pushProgress } from './auth'
import type { Account } from './session'
import type { Progress } from './storage'

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'pending'

/** O que sobe para a conta: so o que faz sentido entre aparelhos. */
export function toSynced(p: Progress): SyncedProgress {
  return sanitizeProgress({
    epoch: p.epoch,
    completedWorkouts: p.completedWorkouts,
    dayCompletedAt: p.dayCompletedAt,
    introRead: p.introRead,
    // Ajustes nunca mexidos nao sobem: senao o padrao deste aparelho novo
    // apagaria os ajustes que a pessoa escolheu no aparelho antigo.
    settings: p.settingsUpdatedAt > 0 ? p.settings : null,
    settingsUpdatedAt: p.settingsUpdatedAt,
  })
}

/** Aplica o resultado juntado sobre o progresso local, sem tocar no que e so daqui. */
export function applySynced(p: Progress, s: SyncedProgress): Progress {
  return {
    ...p,
    epoch: s.epoch,
    completedWorkouts: s.completedWorkouts,
    dayCompletedAt: s.dayCompletedAt,
    introRead: s.introRead,
    settings: s.settings ? { ...p.settings, ...s.settings } : p.settings,
    settingsUpdatedAt: s.settingsUpdatedAt,
    // Recomecou em outro aparelho: o treino pela metade daqui deixa de existir.
    activeSession: s.epoch === p.epoch ? p.activeSession : null,
  }
}

interface Options {
  enabled: boolean
  progress: Progress
  replace: (next: Progress) => void
  onUser: (user: Account) => void
  onSignedOut: () => void
}

export function useCloudSync({ enabled, progress, replace, onUser, onSignedOut }: Options) {
  const [status, setStatus] = useState<SyncStatus>('idle')

  const current = useRef(progress)
  current.current = progress
  const handlers = useRef({ replace, onUser, onSignedOut })
  handlers.current = { replace, onUser, onSignedOut }

  /** O ultimo estado que sabemos estar na conta, em texto, para comparar barato. */
  const lastKnown = useRef('')
  /** A primeira busca deu certo. Antes dela, nada sobe: sobrescreveria a conta. */
  const ready = useRef(false)
  const pulling = useRef(false)
  const pushing = useRef(false)
  const again = useRef(false)

  const push = useCallback(async () => {
    if (!ready.current) return
    if (pushing.current) {
      again.current = true
      return
    }
    pushing.current = true
    try {
      do {
        again.current = false
        const local = toSynced(current.current)
        if (JSON.stringify(local) === lastKnown.current) {
          setStatus('synced')
          continue
        }
        setStatus('syncing')
        const r = await pushProgress(local)
        if (!r.ok) {
          if (r.signedOut) handlers.current.onSignedOut()
          setStatus('pending')
          return
        }
        lastKnown.current = JSON.stringify(r.progress)
        // O que voltou ja e a uniao com outros aparelhos. Junta de novo com o
        // local porque algo pode ter mudado aqui enquanto a resposta vinha.
        const merged = mergeProgress(toSynced(current.current), r.progress)
        handlers.current.replace(applySynced(current.current, merged))
        if (!sameProgress(merged, r.progress)) again.current = true
        else setStatus('synced')
      } while (again.current)
    } finally {
      pushing.current = false
    }
  }, [])

  const pull = useCallback(async () => {
    if (pulling.current || ready.current) return
    pulling.current = true
    setStatus('syncing')
    try {
      const r = await fetchAccount()
      if (!r.ok) {
        if (r.signedOut) handlers.current.onSignedOut()
        setStatus('pending')
        return
      }
      handlers.current.onUser(r.user)
      const local = toSynced(current.current)
      // Primeira vez nesta conta: o progresso que ja estava no aparelho, de
      // antes do login, sobe inteiro. Ninguem perde o que ja treinou.
      const merged = r.progress ? mergeProgress(local, r.progress) : local
      lastKnown.current = r.progress ? JSON.stringify(r.progress) : ''
      handlers.current.replace(applySynced(current.current, merged))
      ready.current = true
      if (!r.progress || !sameProgress(merged, r.progress)) await push()
      else setStatus('synced')
    } finally {
      pulling.current = false
    }
  }, [push])

  // Abertura.
  useEffect(() => {
    if (enabled) void pull()
  }, [enabled, pull])

  // Mudancas: varias seguidas (concluir treino, ajustar som...) viram um envio.
  const fingerprint = enabled ? JSON.stringify(toSynced(progress)) : ''
  useEffect(() => {
    if (!enabled || !ready.current || fingerprint === lastKnown.current) return
    setStatus('pending')
    const t = window.setTimeout(() => void push(), 1200)
    return () => window.clearTimeout(t)
  }, [enabled, fingerprint, push])

  // Rede de volta, ou app saindo da tela: tenta de novo o que ficou pendente.
  useEffect(() => {
    if (!enabled) return
    const retry = () => (ready.current ? void push() : void pull())
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') void push()
      else retry()
    }
    window.addEventListener('online', retry)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('online', retry)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [enabled, pull, push])

  return { status }
}
