import { useState } from 'react'
import { APP } from '../brand'
import { IconArrowLeft } from '../components/icons'
import { InstallSteps } from '../components/InstallHint'
import { isIOS, isStandalone } from '../lib/platform'
import { audio } from '../lib/audio'
import { haptics } from '../lib/haptics'
import { wakeLock } from '../lib/wakelock'
import { loadLicence } from '../lib/license'
import { useT, type Language } from '../i18n'
import type { Settings } from '../lib/storage'
import './SettingsScreen.css'

/**
 * Ritmo da pulsação: segundos por repetição inteira. O padrão, 1,05 s, é o que
 * foi medido na gravação de referência; as outras duas opções existem para a
 * cliente ajustar ao que consegue acompanhar. Ver PENDENCIAS.md.
 */
const PULSE_OPTIONS = [1.4, 1.05, 0.8] as const

/**
 * Tempo de sustentação das semanas 4 a 6. A cliente pediu 5 segundos, que é o
 * padrão. As outras opções existem para quem ainda não sustenta cinco, e para
 * a cliente testar se cinco é confortável dentro de 5 séries de 10.
 */
const HOLD_OPTIONS = [3, 5, 8] as const

interface Props {
  settings: Settings
  onChange: (patch: Partial<Settings>) => void
  onReset: () => void
  onBack: () => void
  onOpenLegal: (page: 'privacy' | 'terms' | 'disclaimer') => void
}

export function SettingsScreen({ settings, onChange, onReset, onBack, onOpenLegal }: Props) {
  const t = useT()
  const [confirmingReset, setConfirmingReset] = useState(false)
  const licence = loadLicence()

  const pulseLabel = [t.settings.pulseSlower, t.settings.pulseDefault, t.settings.pulseFaster]

  return (
    <div className="screen settings">
      <header className="settings__header">
        <button className="icon-btn icon-btn--filled" onClick={onBack} aria-label={t.common.back}>
          <IconArrowLeft />
        </button>
        <h1 className="settings__title">{t.settings.title}</h1>
      </header>

      <div className="screen__body">
        <section className="card settings__group">
          <h2 className="settings__group-title">{t.settings.duringWorkout}</h2>

          <Toggle
            label={t.settings.sound}
            hint={t.settings.soundHint}
            checked={settings.sound}
            onChange={(v) => {
              // Ligar o som é gesto do usuário: aproveita para destravar o
              // áudio no iOS agora, e não no meio da série lá na frente.
              if (v) {
                audio.unlock()
                window.setTimeout(() => audio.beep(880, 120), 60)
              }
              onChange({ sound: v })
            }}
          />

          <Toggle
            label={t.settings.vibration}
            hint={haptics.supported ? t.settings.vibrationHint : t.settings.vibrationUnsupported}
            checked={haptics.supported && settings.vibration}
            disabled={!haptics.supported}
            onChange={(v) => {
              if (v) haptics.contract()
              onChange({ vibration: v })
            }}
          />

          <Toggle
            label={t.settings.keepAwake}
            hint={wakeLock.nativeSupported ? t.settings.keepAwakeHint : t.settings.keepAwakeApprox}
            checked={settings.keepScreenOn}
            onChange={(v) => onChange({ keepScreenOn: v })}
          />
        </section>

        <section className="card settings__group">
          <h2 className="settings__group-title">{t.settings.pulseTitle}</h2>
          <p className="settings__group-hint">{t.settings.pulseHint}</p>

          <div className="settings__choices" role="radiogroup" aria-label={t.settings.pulseTitle}>
            {PULSE_OPTIONS.map((value, index) => (
              <button
                key={value}
                role="radio"
                aria-checked={settings.pulseSeconds === value}
                className={`choice${settings.pulseSeconds === value ? ' choice--on' : ''}`}
                onClick={() => onChange({ pulseSeconds: value })}
              >
                <span className="choice__label">{pulseLabel[index]}</span>
                <span className="choice__hint">
                  {value}
                  {t.common.second}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="card settings__group">
          <h2 className="settings__group-title">{t.settings.holdTitle}</h2>
          <p className="settings__group-hint">{t.settings.holdHint}</p>

          <div className="settings__choices" role="radiogroup" aria-label={t.settings.holdTitle}>
            {HOLD_OPTIONS.map((value) => (
              <button
                key={value}
                role="radio"
                aria-checked={settings.holdSeconds === value}
                className={`choice${settings.holdSeconds === value ? ' choice--on' : ''}`}
                onClick={() => onChange({ holdSeconds: value })}
              >
                <span className="choice__label">
                  {value}
                  {t.common.second}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/*
          Instalação, sempre alcançável.
          O convite automático aparece uma vez e some ao ser dispensado. Sem
          esta seção não sobrava caminho de volta, e a cliente acabou usando o
          app pela aba do navegador — sem ícone, sem tela cheia, sem offline.
        */}
        <section className="card settings__group">
          <h2 className="settings__group-title">{t.settings.installTitle}</h2>
          {isStandalone() ? (
            <p className="settings__group-hint">{t.settings.installDone}</p>
          ) : (
            <>
              <p className="settings__group-hint">{t.settings.installHint}</p>
              {isIOS && <InstallSteps />}
            </>
          )}
        </section>

        <section className="card settings__group">
          <h2 className="settings__group-title">{t.settings.language}</h2>
          <p className="settings__group-hint">{t.settings.languageHint}</p>

          <div className="settings__choices settings__choices--two" role="radiogroup" aria-label={t.settings.language}>
            {(
              [
                ['en', 'English'],
                ['pt', 'Português'],
              ] as Array<[Language, string]>
            ).map(([code, label]) => (
              <button
                key={code}
                role="radio"
                aria-checked={settings.language === code}
                className={`choice${settings.language === code ? ' choice--on' : ''}`}
                onClick={() => onChange({ language: code })}
              >
                <span className="choice__label">{label}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="card settings__group">
          <h2 className="settings__group-title">{t.settings.progressTitle}</h2>
          <p className="settings__group-hint">{t.settings.progressHint}</p>

          {confirmingReset ? (
            <div className="settings__confirm">
              <p>{t.settings.confirmRestart}</p>
              <div className="settings__confirm-actions">
                <button
                  className="btn btn--primary"
                  onClick={() => {
                    onReset()
                    setConfirmingReset(false)
                  }}
                >
                  {t.settings.erase}
                </button>
                <button className="btn btn--quiet" onClick={() => setConfirmingReset(false)}>
                  {t.settings.cancel}
                </button>
              </div>
            </div>
          ) : (
            <button className="btn btn--ghost" onClick={() => setConfirmingReset(true)}>
              {t.settings.restart}
            </button>
          )}
        </section>

        {/*
          O código de acesso, só para leitura. Existe pelo suporte: quando ela
          escrever "não consigo abrir", a primeira pergunta vai ser qual é o
          código, e ninguém guarda um e-mail de compra de três meses atrás.
          Lido direto do armazenamento — é informação de exibição, não vale
          atravessar o app inteiro em propriedades por causa dela.
        */}
        {licence && (
          <section className="card settings__group">
            <h2 className="settings__group-title">{t.settings.accessTitle}</h2>
            <p className="settings__access-code">{t.settings.accessCode(licence.code)}</p>
            <p className="settings__group-hint">{t.settings.accessHint}</p>
          </section>
        )}

        {/*
          Páginas legais. Produto de saúde íntima vendido nos EUA: privacidade,
          termos e o aviso médico precisam estar alcançáveis de dentro do app,
          não só na página de vendas.
        */}
        <section className="card settings__group">
          <h2 className="settings__group-title">{t.legal.groupTitle}</h2>
          <div className="settings__legal-links">
            {(['privacy', 'terms', 'disclaimer'] as const).map((page) => (
              <button key={page} className="btn btn--ghost" onClick={() => onOpenLegal(page)}>
                {t.legal.pages[page].title}
              </button>
            ))}
          </div>
        </section>

        {/*
          Sem número de commit aqui: quem lê esta tela é a compradora, e um
          código de versão do desenvolvedor no meio do produto dela não diz
          nada a ninguém. Para saber o que está publicado, /version.json.
        */}
        <p className="settings__about">
          {APP.name} · {t.settings.version} 1.4
        </p>
      </div>
    </div>
  )
}

function Toggle({
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  label: string
  hint: string
  checked: boolean
  disabled?: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <div className={`toggle${disabled ? ' toggle--disabled' : ''}`}>
      <div className="toggle__text">
        <span className="toggle__label">{label}</span>
        <span className="toggle__hint">{hint}</span>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        className="switch"
        onClick={() => onChange(!checked)}
      >
        <span className="switch__knob" />
      </button>
    </div>
  )
}
