import { useEffect } from 'react'
import { IconArrowLeft } from '../components/icons'
import { useT } from '../i18n'
import './IntroScreen.css'

/**
 * "Find the right muscle" — pedido da cliente para abrir o programa.
 *
 * É a única parte educativa do app, e existe porque sem ela o resto não
 * funciona: quem não localiza o assoalho pélvico passa seis semanas contraindo
 * glúteo. O resto do conteúdo do ebook continua fora — ler sobre o assunto é o
 * ebook, executar é o app.
 *
 * Tela estática de propósito: sem checkmarks por tópico e sem rastreio de
 * progresso, para não virar um segundo programa competindo com o treino.
 */
interface Props {
  onStart: () => void
  onBack: () => void
  onRead: () => void
}

export function IntroScreen({ onStart, onBack, onRead }: Props) {
  const t = useT()

  // Abrir a tela já conta como lida: o card na home para de insistir.
  useEffect(() => {
    onRead()
  }, [onRead])

  return (
    <div className="screen intro">
      <header className="intro__header">
        <button className="icon-btn icon-btn--filled" onClick={onBack} aria-label={t.common.back}>
          <IconArrowLeft />
        </button>
        <span className="intro__eyebrow">{t.intro.eyebrow}</span>
      </header>

      <div className="screen__body">
        <h1 className="intro__title">{t.intro.title}</h1>
        <p className="intro__lede">{t.intro.lede}</p>

        <ol className="intro__steps">
          {t.intro.steps.map((step, index) => (
            <li key={step.title} className="intro__step">
              <span className="intro__step-number" aria-hidden="true">
                {index + 1}
              </span>
              <div>
                <h2 className="intro__step-title">{step.title}</h2>
                <p className="intro__step-body">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <section className="intro__panel">
          <h2 className="intro__panel-title">{t.intro.postureTitle}</h2>
          <p className="intro__panel-body">{t.intro.postureBody}</p>
        </section>

        {/*
          Aviso de saúde. O PWA não passa pela revisão da Apple, então não há
          risco de rejeição por categoria — mas o público é americano e o
          assunto é saúde, então o aviso fica, e sem nenhuma promessa de cura.
        */}
        <section className="intro__panel intro__panel--warn">
          <h2 className="intro__panel-title">{t.intro.disclaimerTitle}</h2>
          <p className="intro__panel-body">{t.intro.disclaimerBody}</p>
        </section>

        <button className="btn btn--primary intro__cta" onClick={onStart}>
          {t.intro.cta}
        </button>
      </div>
    </div>
  )
}
