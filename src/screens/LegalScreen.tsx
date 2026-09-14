import { IconArrowLeft } from '../components/icons'
import { useT } from '../i18n'
import './LegalScreen.css'

export type LegalPage = 'privacy' | 'terms' | 'disclaimer'

interface Props {
  page: LegalPage
  onBack: () => void
}

/**
 * Páginas legais: Política de Privacidade, Termos de Uso e Aviso Médico.
 *
 * O conteúdo vive inteiro no dicionário (en/pt), como todo texto do app, então
 * uma revisão de texto não passa por aqui. A tela só desenha título, seções e
 * parágrafos — e no aviso médico as listas viram parágrafos curtos, que leem
 * melhor em celular do que bullets apertados.
 */
export function LegalScreen({ page, onBack }: Props) {
  const t = useT()
  const doc = t.legal.pages[page]

  return (
    <div className="screen legal">
      <header className="legal__header">
        <button className="icon-btn icon-btn--filled" onClick={onBack} aria-label={t.common.back}>
          <IconArrowLeft />
        </button>
        <h1 className="legal__title">{doc.title}</h1>
      </header>

      <div className="screen__body">
        <p className="legal__updated">{t.legal.updated}</p>

        {doc.sections.map((section, i) => (
          <section key={i} className="legal__section">
            {section.h && <h2 className="legal__section-title">{section.h}</h2>}
            {section.ps.map((p, j) => (
              <p key={j} className="legal__p">
                {p}
              </p>
            ))}
          </section>
        ))}
      </div>
    </div>
  )
}
