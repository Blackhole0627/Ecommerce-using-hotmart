import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { App } from './App'
import './styles/theme.css'

/**
 * Service worker com atualização automática.
 *
 * Sem loja no caminho, uma correção publicada chega no próximo carregamento —
 * que é justamente o motivo de o app ser um PWA. `autoUpdate` aplica a versão
 * nova sem perguntar nada à usuária.
 */
registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
