/**
 * O botao "Continuar com o Google" (Google Identity Services).
 *
 * O script do Google so e carregado quando a tela de login aparece e quando
 * existe um Client ID configurado: quem ja esta logada nunca baixa nada daqui,
 * e o app instalado continua abrindo sem internet.
 *
 * O botao entrega um "credential" (um token assinado pelo Google). Ele vai
 * para o servidor, que confere a assinatura; nada aqui decide sozinho quem
 * entrou.
 *
 * Se o script nao carregar (sem rede, bloqueador, navegador antigo), o botao
 * simplesmente nao aparece e o login por codigo no e-mail continua ali.
 */
export const GOOGLE_CLIENT_ID: string = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ''

interface GoogleId {
  initialize: (options: {
    client_id: string
    callback: (response: { credential?: string }) => void
    ux_mode?: 'popup' | 'redirect'
    auto_select?: boolean
    itp_support?: boolean
  }) => void
  renderButton: (
    el: HTMLElement,
    options: {
      type: 'standard'
      theme: 'outline'
      size: 'large'
      text: 'continue_with'
      shape: 'pill'
      width?: number
      locale?: string
    },
  ) => void
}

declare global {
  interface Window {
    google?: { accounts?: { id?: GoogleId } }
  }
}

let loading: Promise<GoogleId | null> | null = null

function load(): Promise<GoogleId | null> {
  loading ??= new Promise((resolve) => {
    if (window.google?.accounts?.id) return resolve(window.google.accounts.id)
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.onload = () => resolve(window.google?.accounts?.id ?? null)
    script.onerror = () => {
      // Falhou agora; uma proxima abertura da tela pode tentar de novo.
      loading = null
      resolve(null)
    }
    document.head.appendChild(script)
  })
  return loading
}

/**
 * Desenha o botao dentro de `el`. Devolve false se nao deu (sem Client ID ou
 * sem o script), para a tela esconder o espaco reservado a ele.
 */
export async function renderGoogleButton(
  el: HTMLElement,
  locale: string,
  onCredential: (credential: string) => void,
): Promise<boolean> {
  if (!GOOGLE_CLIENT_ID) return false
  const id = await load()
  if (!id || !el.isConnected) return false
  id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: (response) => {
      if (response.credential) onCredential(response.credential)
    },
    ux_mode: 'popup',
    auto_select: false,
    itp_support: true,
  })
  id.renderButton(el, {
    type: 'standard',
    theme: 'outline',
    size: 'large',
    text: 'continue_with',
    shape: 'pill',
    width: Math.min(400, Math.max(240, Math.round(el.clientWidth))),
    locale,
  })
  return true
}
