import { APP } from '../brand'
import { useT } from '../i18n'
import type { BlockReason } from '../lib/license'
import './GateScreen.css'

/**
 * Fim do prazo, ou acesso cancelado.
 *
 * Duas situacoes muito diferentes dividem a tela porque a saida e a mesma —
 * um botao —, mas o texto nao pode ser o mesmo. Uma pessoa que so ficou uma
 * semana sem internet nao pode ler que foi bloqueada; e quem pediu reembolso
 * precisa entender que acabou, sem ficar tentando de novo.
 *
 * Em nenhum dos dois casos o progresso e apagado: ele continua no aparelho e
 * volta inteiro assim que o acesso e confirmado.
 */
interface Props {
  reason: BlockReason
  onRetry: () => void
  onUseAnother: () => void
  busy: boolean
  /** Uma tentativa ja falhou por falta de rede: vale dizer isso. */
  stillOffline: boolean
}

export function BlockedScreen({ reason, onRetry, onUseAnother, busy, stillOffline }: Props) {
  const t = useT()
  const expired = reason === 'expired'

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

        <h1 className="gate__title">{expired ? t.blocked.expiredTitle : t.blocked.revokedTitle}</h1>
        <p className="gate__lede">{expired ? t.blocked.expiredBody : t.blocked.revokedBody}</p>

        {expired && (
          <>
            <button className="btn btn--primary gate__cta" onClick={onRetry} disabled={busy}>
              {busy ? t.blocked.retrying : t.blocked.retry}
            </button>
            {stillOffline && !busy && (
              <p className="gate__error" role="alert">
                {t.blocked.stillOffline}
              </p>
            )}
          </>
        )}

        <button className="btn btn--quiet gate__another" onClick={onUseAnother}>
          {t.blocked.another}
        </button>
      </div>
    </div>
  )
}
