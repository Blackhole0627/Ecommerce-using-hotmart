import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { APP } from '../brand'
import { useT } from '../i18n'
import { requestCode, signInWithGoogle, verifyCode, type AuthError } from '../lib/auth'
import { GOOGLE_CLIENT_ID, renderGoogleButton } from '../lib/google'
import type { Session } from '../lib/session'
import './GateScreen.css'
import './LoginScreen.css'

/**
 * Entrar na conta.
 *
 * Dois caminhos, e o do e-mail e o principal: funciona em qualquer celular,
 * inclusive no app instalado no iPhone, onde janelas de login de terceiros as
 * vezes falham. O botao do Google e um atalho para quem prefere um toque.
 *
 * O codigo vai para o e-mail da COMPRA. A tela nunca diz se um e-mail comprou
 * ou nao (ver api/_auth.ts): diz "se este for o e-mail da compra, o codigo
 * esta a caminho", e ajuda quem nao recebeu a conferir spam e o comprovante.
 */
interface Props {
  language: 'en' | 'pt'
  onSignedIn: (session: Session) => void
  onOpenPrivacy: () => void
}

const RESEND_SECONDS = 30
const EMAIL = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/

export function LoginScreen({ language, onSignedIn, onOpenPrivacy }: Props) {
  const t = useT()
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<AuthError | null>(null)
  const [notice, setNotice] = useState('')
  const [resendAt, setResendAt] = useState(0)
  const [now, setNow] = useState(() => Date.now())

  /** Entrou pelo Google com um Gmail que nao e o da compra: guarda para ligar. */
  const [google, setGoogle] = useState<{ credential: string; email: string } | null>(null)
  const [googleShown, setGoogleShown] = useState(false)
  const googleSlot = useRef<HTMLDivElement>(null)

  const finish = useCallback(
    (result: Awaited<ReturnType<typeof verifyCode>>) => {
      if (result.ok) {
        onSignedIn(result.session)
        return true
      }
      setError(result.error)
      return false
    },
    [onSignedIn],
  )

  const onGoogle = useCallback(
    async (credential: string) => {
      setBusy(true)
      setError(null)
      const result = await signInWithGoogle(credential)
      setBusy(false)
      if (result.ok) return finish(result)
      if (result.error === 'no_purchase' && result.googleEmail) {
        // Nao e erro: e o passo de ligar o Gmail ao e-mail da compra.
        setGoogle({ credential, email: result.googleEmail })
        setStep('email')
        return
      }
      setError(result.error)
    },
    [finish],
  )

  // O botao do Google so aparece no primeiro passo, e nunca no de ligar contas.
  useEffect(() => {
    if (step !== 'email' || google || !GOOGLE_CLIENT_ID || !googleSlot.current) return
    let alive = true
    void renderGoogleButton(googleSlot.current, language === 'pt' ? 'pt-BR' : 'en', (c) => void onGoogle(c)).then(
      (ok) => alive && setGoogleShown(ok),
    )
    return () => {
      alive = false
    }
  }, [step, google, language, onGoogle])

  // Relogio da espera para pedir outro codigo.
  useEffect(() => {
    if (step !== 'code') return
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [step])

  const sendCode = async (): Promise<boolean> => {
    setBusy(true)
    setError(null)
    setNotice('')
    const result = await requestCode(email.trim().toLowerCase(), language)
    setBusy(false)
    if (!result.ok) {
      setError(result.error ?? 'server_error')
      return false
    }
    setResendAt(Date.now() + RESEND_SECONDS * 1000)
    setNow(Date.now())
    return true
  }

  const submitEmail = async (event: FormEvent) => {
    event.preventDefault()
    if (busy) return
    if (!EMAIL.test(email.trim())) {
      setError('bad_email')
      return
    }
    if (await sendCode()) {
      setCode('')
      setStep('code')
    }
  }

  const submitCode = async (value: string) => {
    if (busy || value.length !== 6) return
    setBusy(true)
    setError(null)
    const result = await verifyCode(email.trim().toLowerCase(), value, google?.credential)
    setBusy(false)
    if (!finish(result)) setCode('')
  }

  const onCodeChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 6)
    setCode(digits)
    setError(null)
    // Seis digitos (digitados ou colados do e-mail) ja entram sozinhos.
    if (digits.length === 6) void submitCode(digits)
  }

  const resend = async () => {
    if (await sendCode()) setNotice(t.auth.resent)
  }

  const backToEmail = () => {
    setStep('email')
    setCode('')
    setError(null)
    setNotice('')
  }

  const waitLeft = Math.max(0, Math.ceil((resendAt - now) / 1000))

  return (
    <div className="screen gate login">
      <div className="gate__body">
        <img
          className="gate__logo"
          src="/brand/logo-lockup.png"
          alt={`${APP.name}, ${APP.tagline}`}
          width={621}
          height={485}
        />

        {step === 'email' ? (
          <>
            <span className="gate__eyebrow">{t.auth.eyebrow}</span>
            <h1 className="gate__title">{google ? t.auth.linkTitle : t.auth.title}</h1>
            <p className="gate__lede">{google ? t.auth.linkLede(google.email) : t.auth.lede}</p>

            {!google && GOOGLE_CLIENT_ID && (
              <>
                <div
                  ref={googleSlot}
                  className={`login__google${googleShown ? '' : ' login__google--loading'}`}
                  aria-busy={!googleShown}
                />
                {googleShown && (
                  <div className="login__divider" aria-hidden="true">
                    <span>{t.auth.or}</span>
                  </div>
                )}
              </>
            )}

            <form className="gate__form login__form" onSubmit={submitEmail} noValidate>
              <label className="login__label" htmlFor="login-email">
                {t.auth.emailLabel}
              </label>
              <input
                id="login-email"
                className="gate__input gate__input--email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value.trimStart())
                  setError(null)
                }}
                placeholder={t.auth.emailPlaceholder}
                type="email"
                inputMode="email"
                autoCapitalize="none"
                autoCorrect="off"
                autoComplete="email"
                spellCheck={false}
                enterKeyHint="send"
                maxLength={254}
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? 'login-error' : undefined}
              />
              {error && (
                <p className="gate__error" id="login-error" role="alert">
                  {t.auth.errors[error]}
                </p>
              )}
              <button className="btn btn--primary gate__cta" type="submit" disabled={busy || !email.trim()}>
                {busy ? t.auth.sending : t.auth.sendCode}
              </button>
            </form>
          </>
        ) : (
          <>
            <span className="gate__eyebrow">{t.auth.eyebrow}</span>
            <h1 className="gate__title">{t.auth.codeTitle}</h1>
            <p className="gate__lede">{t.auth.codeLede(email.trim().toLowerCase())}</p>

            <form
              className="gate__form login__form"
              onSubmit={(e) => {
                e.preventDefault()
                void submitCode(code)
              }}
            >
              <label className="login__label" htmlFor="login-code">
                {t.auth.codeLabel}
              </label>
              <input
                id="login-code"
                className="gate__input login__code"
                value={code}
                onChange={(e) => onCodeChange(e.target.value)}
                placeholder="000000"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                // O iPhone e o Android oferecem o codigo do e-mail acima do teclado.
                autoComplete="one-time-code"
                maxLength={6}
                enterKeyHint="go"
                aria-invalid={error ? true : undefined}
                aria-describedby={error ? 'login-error' : undefined}
              />
              {error && (
                <p className="gate__error" id="login-error" role="alert">
                  {t.auth.errors[error]}
                </p>
              )}
              {notice && !error && (
                <p className="login__notice" role="status">
                  {notice}
                </p>
              )}
              <button className="btn btn--primary gate__cta" type="submit" disabled={busy || code.length !== 6}>
                {busy ? t.auth.verifying : t.auth.verify}
              </button>
            </form>

            <div className="login__links">
              <button className="btn btn--quiet" type="button" onClick={() => void resend()} disabled={busy || waitLeft > 0}>
                {waitLeft > 0 ? t.auth.resendIn(waitLeft) : t.auth.resend}
              </button>
              <button className="btn btn--quiet" type="button" onClick={backToEmail} disabled={busy}>
                {t.auth.changeEmail}
              </button>
            </div>
            <p className="gate__help">{t.auth.noCode}</p>
          </>
        )}

        <button className="login__privacy" type="button" onClick={onOpenPrivacy}>
          {t.auth.privacy}
        </button>
      </div>
    </div>
  )
}
