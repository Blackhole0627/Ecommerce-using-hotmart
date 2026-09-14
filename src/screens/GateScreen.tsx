import type { FormEvent } from 'react'
import { APP } from '../brand'
import { useT } from '../i18n'
import { looksComplete } from '../lib/license'
import type { ActivateError } from '../lib/license'
import './GateScreen.css'

/**
 * A porta de entrada: o codigo que veio no e-mail da compra.
 *
 * A tela existe uma vez na vida do aparelho. Por isso ela e curta e diz onde
 * achar o codigo logo na primeira linha — a duvida "onde esta isso?" e a que
 * gera suporte, nao a digitacao.
 *
 * O campo formata sozinho enquanto se digita e aceita o codigo colado de
 * qualquer jeito: minusculo, sem traco, com espaco. Quem esta com o e-mail
 * aberto no celular vai colar, nao digitar.
 */
interface Props {
  code: string
  onCodeChange: (value: string) => void
  onSubmit: () => void
  error: ActivateError | null
  busy: boolean
}

export function GateScreen({ code, onCodeChange, onSubmit, error, busy }: Props) {
  const t = useT()
  const ready = looksComplete(code) && !busy

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (ready) onSubmit()
  }

  return (
    <div className="screen gate">
      <div className="gate__body">
        <img
          className="gate__logo"
          src="/brand/logo-lockup.png"
          alt={`${APP.name} — ${APP.tagline}`}
          width={621}
          height={485}
        />

        <span className="gate__eyebrow">{t.gate.eyebrow}</span>
        <h1 className="gate__title">{t.gate.title}</h1>
        <p className="gate__lede">{t.gate.lede}</p>

        <form className="gate__form" onSubmit={submit}>
          <label className="visually-hidden" htmlFor="access-code">
            {t.gate.label}
          </label>
          <input
            id="access-code"
            className={`gate__input${code.includes('@') ? ' gate__input--email' : ''}`}
            value={code}
            onChange={(e) => onCodeChange(e.target.value)}
            placeholder="voce@exemplo.com"
            // type="text" e nao "email": o campo tambem aceita um codigo de
            // acesso, e a validacao do navegador recusaria um.
            type="text"
            inputMode="email"
            autoCapitalize="none"
            autoCorrect="off"
            autoComplete="email"
            spellCheck={false}
            enterKeyHint="go"
            maxLength={254}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? 'access-error' : undefined}
          />

          {error && (
            <p className="gate__error" id="access-error" role="alert">
              {t.gate.errors[error]}
            </p>
          )}

          <button className="btn btn--primary gate__cta" type="submit" disabled={!ready}>
            {busy ? t.gate.working : t.gate.cta}
          </button>
        </form>

        <p className="gate__note">{t.gate.once}</p>
        <p className="gate__help">{t.gate.help}</p>
      </div>
    </div>
  )
}

/**
 * O instante da conferencia, na abertura.
 *
 * Conferir a assinatura leva alguns milissegundos, e renovar pode levar mais.
 * Piscar a tela do codigo nesse meio tempo para quem ja comprou seria pior do
 * que qualquer espera: da a entender que o acesso sumiu. Entao aqui fica so a
 * marca, que e a continuacao natural da splash do app instalado.
 */
export function GateSplash() {
  return (
    <div className="screen gate gate--checking">
      <div className="gate__body">
        <img
          className="gate__logo"
          src="/brand/logo-lockup.png"
          alt={`${APP.name} — ${APP.tagline}`}
          width={621}
          height={485}
        />
      </div>
    </div>
  )
}
