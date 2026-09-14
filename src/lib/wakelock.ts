/**
 * Manter a tela acesa durante o treino.
 *
 * Por que isso importa: o dia 6 tem serie de 7x20 com 45s de descanso. Isso
 * passa de sete minutos. Se a tela apagar no meio de uma serie, a usuaria perde
 * a contagem e o produto perde a razao de existir.
 *
 * Dois caminhos:
 *
 * - Screen Wake Lock API: Chrome/Android e Safari 16.4+. Caminho limpo.
 * - Video mudo em loop: sobra para os iOS mais antigos, onde a API nao existe.
 *   Um video tocando impede o auto-lock. Precisa ser muted + playsinline +
 *   loop, e o play() precisa nascer de um gesto do usuario.
 *
 * O lock cai sozinho quando a aba vai para segundo plano, entao ha um listener
 * de visibilitychange para readquirir na volta.
 */

interface SentinelLike {
  released: boolean
  release: () => Promise<void>
  addEventListener: (type: 'release', listener: () => void) => void
}

interface WakeLockNavigator {
  wakeLock?: { request: (type: 'screen') => Promise<SentinelLike> }
}

const nativeSupported = (): boolean =>
  typeof navigator !== 'undefined' && 'wakeLock' in navigator

let sentinel: SentinelLike | null = null
let fallbackVideo: HTMLVideoElement | null = null
let wanted = false

function createFallbackVideo(): HTMLVideoElement {
  const video = document.createElement('video')
  video.setAttribute('playsinline', '')
  video.setAttribute('webkit-playsinline', '')
  video.muted = true
  video.loop = true
  video.autoplay = true
  video.src = `${import.meta.env.BASE_URL}silence.mp4`
  // Fora da tela mas ainda "renderizado": display:none faz o iOS pausar.
  video.style.cssText =
    'position:fixed;width:1px;height:1px;opacity:0.01;pointer-events:none;top:0;left:0;'
  document.body.appendChild(video)
  return video
}

async function acquire(): Promise<void> {
  if (!wanted) return

  if (nativeSupported()) {
    try {
      const nav = navigator as Navigator & WakeLockNavigator
      sentinel = (await nav.wakeLock!.request('screen')) as SentinelLike
      sentinel.addEventListener('release', () => {
        sentinel = null
      })
      return
    } catch {
      // Negado (bateria fraca, aba oculta). Cai para o video.
    }
  }

  if (!fallbackVideo) fallbackVideo = createFallbackVideo()
  try {
    await fallbackVideo.play()
  } catch {
    // Sem gesto do usuario o play e recusado. Nao ha o que fazer alem de
    // deixar a tela apagar; o aviso na UI cobre esse caso.
  }
}

function onVisibilityChange() {
  if (document.visibilityState === 'visible' && wanted && !sentinel) {
    void acquire()
  }
}

export const wakeLock = {
  get nativeSupported() {
    return nativeSupported()
  },

  /** Chamar dentro do gesto do usuario, para o fallback de video funcionar. */
  async enable() {
    if (wanted) return
    wanted = true
    document.addEventListener('visibilitychange', onVisibilityChange)
    await acquire()
  },

  async disable() {
    wanted = false
    document.removeEventListener('visibilitychange', onVisibilityChange)

    if (sentinel && !sentinel.released) {
      try {
        await sentinel.release()
      } catch {
        /* ja liberado */
      }
    }
    sentinel = null

    if (fallbackVideo) {
      fallbackVideo.pause()
      fallbackVideo.remove()
      fallbackVideo = null
    }
  },
}
