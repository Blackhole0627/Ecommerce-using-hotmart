/**
 * O estado da licenca, para o App decidir o que mostrar.
 *
 * Toda a politica esta aqui, num lugar so, porque ela e curta e vale ser lida
 * inteira de uma vez:
 *
 *   sem bilhete            -> pede o codigo
 *   assinatura invalida    -> descarta e pede o codigo
 *   relogio para tras      -> exige internet agora
 *   vencido                -> tenta renovar; sem rede, bloqueia
 *   valido                 -> abre, e renova sozinho se estiver perto do fim
 *   servidor diz revogado  -> apaga e bloqueia na hora
 *
 * O unico caminho que mantem o app aberto sem falar com o servidor e o bilhete
 * dentro do prazo. Ficar offline nao e uma brecha, e um cronometro.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  activate,
  cleanLink,
  clearLicence,
  clockWentBack,
  codeFromLink,
  formatId,
  isExpired,
  LICENSE_REQUIRED,
  loadLicence,
  needsRenew,
  renew,
  saveLicence,
  touch,
  verify,
  type ActivateError,
  type Answer,
  type BlockReason,
} from './license'

export type LicenceState =
  | { status: 'checking' }
  | { status: 'locked' }
  | { status: 'blocked'; reason: BlockReason }
  | { status: 'ok'; code: string; expiresAt: number }

/** Intervalo minimo entre duas conferencias com o servidor, com o app aberto. */
const RECHECK_EVERY_MS = 60 * 60 * 1000

/** Uma recusa do servidor que nao adianta repetir: o acesso acabou. */
const definitive = (error?: ActivateError): boolean =>
  error === 'revoked' || error === 'unknown_code' || error === 'not_activated'

export function useLicense() {
  const [state, setState] = useState<LicenceState>({ status: 'checking' })
  const [code, setCode] = useState('')
  const [error, setError] = useState<ActivateError | null>(null)
  const [busy, setBusy] = useState(false)
  /** Se ja houve um "tentar de novo": muda o texto de "sem conexao". */
  const [retried, setRetried] = useState(false)

  /** O codigo em uso, para as renovacoes em segundo plano. */
  const activeCode = useRef('')
  const started = useRef(false)
  /** Ultima conversa com o servidor, para nao repetir a cada troca de app. */
  const lastCheck = useRef(0)

  const accept = useCallback((answer: Answer) => {
    if (!answer.ok || !answer.licence) return false
    saveLicence(answer.licence)
    activeCode.current = answer.licence.code
    setState({ status: 'ok', code: answer.licence.code, expiresAt: answer.licence.expiresAt })
    return true
  }, [])

  /** Tenta renovar. Sem rede, deixa como esta; revogado, bloqueia na hora. */
  const tryRenew = useCallback(
    async (which: string, whenOfflineBlock: boolean): Promise<void> => {
      const answer = await renew(which)
      if (accept(answer)) return
      if (answer.offline) {
        if (whenOfflineBlock) {
          setError('offline')
          setState({ status: 'blocked', reason: 'expired' })
        }
        return
      }
      if (definitive(answer.error)) {
        clearLicence()
        setState({ status: 'blocked', reason: 'revoked' })
        return
      }
      // Erro passageiro do servidor: nao e motivo para tirar o app de quem tem
      // um bilhete valido na mao.
      if (whenOfflineBlock) setState({ status: 'blocked', reason: 'expired' })
    },
    [accept],
  )

  const check = useCallback(async () => {
    // Porta desligada: o app abre direto, e nenhuma requisicao de licenca sai
    // daqui. Ver LICENSE_REQUIRED, em license.ts.
    if (!LICENSE_REQUIRED) {
      setState({ status: 'ok', code: '', expiresAt: 0 })
      return
    }

    const licence = loadLicence()
    if (!licence) {
      setState({ status: 'locked' })
      return
    }

    const claims = await verify(licence.token)
    if (!claims) {
      // Bilhete adulterado, de outro aparelho, ou assinado por uma chave antiga.
      clearLicence()
      setState({ status: 'locked' })
      return
    }

    activeCode.current = licence.code || claims.c

    if (clockWentBack(licence) || isExpired(licence)) {
      setState({ status: 'checking' })
      await tryRenew(activeCode.current, true)
      return
    }

    const fresh = touch(licence)
    setState({ status: 'ok', code: activeCode.current, expiresAt: fresh.expiresAt })

    // Confere com o servidor em TODA abertura, nao so quando o prazo esta
    // acabando. E o que faz um reembolso valer ja no proximo acesso a internet,
    // em vez de daqui a alguns dias, e custa uma requisicao minuscula. O app ja
    // esta na tela quando isto roda: se falhar por falta de rede nao acontece
    // nada, porque o bilhete no aparelho continua dentro do prazo.
    lastCheck.current = Date.now()
    void tryRenew(activeCode.current, false)
  }, [tryRenew])

  useEffect(() => {
    // O StrictMode roda o efeito duas vezes em desenvolvimento; sem isto seriam
    // duas chamadas de rede iguais na abertura.
    if (started.current) return
    started.current = true

    const fromLink = codeFromLink()
    if (fromLink) setCode(formatId(fromLink))

    void check().then(() => {
      // Um codigo no link so vale enquanto o app ainda esta trancado: quem ja
      // tem licenca nao deve ser trocado de codigo por um link recebido.
      if (fromLink) cleanLink()
    })
  }, [check])

  /**
   * Volta a conferir quando o app reaparece na tela — um PWA instalado fica
   * aberto por dias, e sem isto so a primeira abertura seria conferida.
   *
   * Com intervalo minimo: quem alterna entre o app e o WhatsApp dez vezes num
   * treino nao pode gerar dez requisicoes.
   */
  useEffect(() => {
    if (!LICENSE_REQUIRED) return
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      const licence = loadLicence()
      if (!licence) return
      if (isExpired(licence) || clockWentBack(licence)) {
        void check()
        return
      }
      if (Date.now() - lastCheck.current < RECHECK_EVERY_MS && !needsRenew(licence)) return
      lastCheck.current = Date.now()
      void tryRenew(licence.code, false)
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [check, tryRenew])

  /** Envio do formulario do codigo. */
  const submit = useCallback(async () => {
    if (busy) return
    setBusy(true)
    setError(null)
    const answer = await activate(code)
    setBusy(false)
    if (accept(answer)) {
      cleanLink()
      return
    }
    setError(answer.offline ? 'offline' : (answer.error ?? 'server_error'))
  }, [accept, busy, code])

  /** Sai da tela de bloqueio para digitar outro codigo. */
  const useAnother = useCallback(() => {
    clearLicence()
    setCode('')
    setError(null)
    setRetried(false)
    setState({ status: 'locked' })
  }, [])

  /** "Tentar de novo" da tela de bloqueio. */
  const retry = useCallback(async () => {
    if (busy) return
    setBusy(true)
    setError(null)
    await check()
    setRetried(true)
    setBusy(false)
  }, [busy, check])

  const onCodeChange = useCallback((value: string) => {
    setCode(formatId(value))
    setError(null)
  }, [])

  return {
    state,
    code,
    onCodeChange,
    error,
    busy,
    stillOffline: retried && error === 'offline',
    submit,
    retry,
    useAnother,
  }
}
