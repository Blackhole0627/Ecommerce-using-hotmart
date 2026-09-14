import { useEffect, useState } from 'react'
import { APP } from '../brand'
import { IconPlus, IconShare } from './icons'
import { isAndroid, isIOS, isStandalone } from '../lib/platform'
import { useT } from '../i18n'
import './InstallHint.css'

/**
 * Convite para instalar na tela inicial.
 *
 * O Android dispara beforeinstallprompt e o navegador cuida do resto. O iOS
 * não tem nada equivalente: se o app não explicar o caminho, a usuária fica
 * usando pela aba do Safari e perde ícone, tela cheia e o funcionamento
 * offline — ou seja, perde exatamente o que faz disto um app.
 *
 * São duas peças, e as duas existem por relato da cliente:
 *
 * - a FOLHA, com o passo a passo desenhado, que abre sozinha na primeira vez;
 * - a BARRA, que fica no topo da tela inicial enquanto o app estiver rodando
 *   pelo navegador. A folha some ao ser dispensada, e sem a barra a cliente
 *   ficou sem saber se devia instalar o app ("é pra instalar no celular?") e
 *   continuou usando pela aba. A barra desaparece sozinha depois de instalado.
 */

const DISMISSED_KEY = 'kegel-pelvic:install-dismissed'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

/**
 * Passo a passo do iPhone.
 *
 * Vive fora da folha porque a mesma lista aparece em Ajustes.
 */
export function InstallSteps() {
  const t = useT()
  return (
    <ol className="install__steps">
      <li>
        <span className="install__step-icon">
          <IconShare width={19} height={19} />
        </span>
        {t.install.stepShare}
      </li>
      <li>
        <span className="install__step-icon">
          <IconPlus width={19} height={19} />
        </span>
        {t.install.stepAdd} <strong>{t.install.stepAddStrong}</strong>.
      </li>
      <li>
        <span className="install__step-icon" aria-hidden="true">
          ✓
        </span>
        {t.install.stepConfirm} <strong>{t.install.stepConfirmStrong}</strong>
        {t.install.stepConfirmTail}
      </li>
    </ol>
  )
}

export function InstallHint() {
  const t = useT()
  const [aplicavel, setAplicavel] = useState(false)
  const [folhaAberta, setFolhaAberta] = useState(false)
  const [androidPrompt, setAndroidPrompt] = useState<BeforeInstallPromptEvent | null>(null)

  useEffect(() => {
    // Já instalado: não há nada a oferecer, e insistir seria ruído.
    if (isStandalone()) return
    if (!isIOS && !isAndroid) return
    setAplicavel(true)

    let dispensado = false
    try {
      dispensado = localStorage.getItem(DISMISSED_KEY) === '1'
    } catch {
      /* aba privada: trata como não dispensado */
    }

    if (isAndroid) {
      const onPrompt = (event: Event) => {
        event.preventDefault()
        setAndroidPrompt(event as BeforeInstallPromptEvent)
        if (!dispensado) setFolhaAberta(true)
      }
      window.addEventListener('beforeinstallprompt', onPrompt)
      return () => window.removeEventListener('beforeinstallprompt', onPrompt)
    }

    if (!dispensado) {
      // Sem evento para esperar no iOS: abre depois de um instante, para não
      // cobrir a primeira impressão do app.
      const id = window.setTimeout(() => setFolhaAberta(true), 2200)
      return () => window.clearTimeout(id)
    }
  }, [])

  const fechar = () => {
    setFolhaAberta(false)
    try {
      localStorage.setItem(DISMISSED_KEY, '1')
    } catch {
      /* idem */
    }
  }

  if (!aplicavel) return null

  return (
    <>
      <div className="install-bar">
        <div className="install-bar__body">
          <span className="install-bar__eyebrow">{t.install.barTitle}</span>
          <span className="install-bar__text">{t.install.barBody}</span>
        </div>
        <button className="install-bar__cta" onClick={() => setFolhaAberta(true)}>
          {t.install.barCta}
        </button>
      </div>

      {folhaAberta && (
        <div className="install" role="dialog" aria-modal="true" aria-labelledby="install-title">
          <div className="install__sheet">
            <div className="install__handle" aria-hidden="true" />

            <h2 className="install__title" id="install-title">
              {t.install.title(APP.shortName)}
            </h2>
            <p className="install__text">{t.install.body}</p>

            {isIOS ? (
              <InstallSteps />
            ) : (
              <button
                className="btn btn--primary install__cta"
                onClick={async () => {
                  if (!androidPrompt) return fechar()
                  await androidPrompt.prompt()
                  await androidPrompt.userChoice
                  fechar()
                }}
              >
                {t.install.cta}
              </button>
            )}

            <button className="btn btn--quiet" onClick={fechar}>
              {t.install.dismiss}
            </button>
          </div>
        </div>
      )}
    </>
  )
}
