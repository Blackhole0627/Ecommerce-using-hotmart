/**
 * Deteccao de plataforma, so para o que muda de verdade no comportamento.
 */

const ua = typeof navigator !== 'undefined' ? navigator.userAgent : ''

/** iPad moderno se anuncia como Mac; o toque e o que o denuncia. */
export const isIOS =
  /iPad|iPhone|iPod/.test(ua) ||
  (/Macintosh/.test(ua) && typeof document !== 'undefined' && 'ontouchend' in document)

export const isAndroid = /Android/.test(ua)

/** Ja esta rodando instalado, fora do navegador. */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

/**
 * O iOS nao tem beforeinstallprompt e nao oferece nenhum convite de instalacao.
 * Sem uma dica visual dentro do app, boa parte das usuarias nunca instala e
 * acaba usando pela aba do navegador — perdendo icone, tela cheia e o motivo
 * de o app ser um PWA. Por isso a dica de "Adicionar a Tela de Inicio" e uma
 * tela de verdade no app, e nao um detalhe.
 */
export const needsManualInstallHint = isIOS
