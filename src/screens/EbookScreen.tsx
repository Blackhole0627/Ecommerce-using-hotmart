import { IconArrowLeft } from '../components/icons'
import { useT } from '../i18n'
import './EbookScreen.css'

/** O arquivo mora em public/ e é pré-cacheado pelo service worker. */
const EBOOK_URL = '/the-squeeze-method-ebook.pdf'

interface Props {
  onBack: () => void
}

/**
 * A área do ebook.
 *
 * O link abre em alvo próprio de propósito: no iPhone instalado (standalone),
 * navegar a própria janela para um PDF deixaria a usuária presa sem botão de
 * voltar; com target="_blank" o iOS abre o visualizador em cima do app, com o
 * "Concluído" para retornar. No Android vira uma aba ou o download direto.
 */
export function EbookScreen({ onBack }: Props) {
  const t = useT()

  return (
    <div className="screen ebook">
      <header className="ebook__header">
        <button className="icon-btn icon-btn--filled" onClick={onBack} aria-label={t.common.back}>
          <IconArrowLeft />
        </button>
        <h1 className="ebook__title">{t.ebook.title}</h1>
      </header>

      <div className="screen__body">
        <section className="card ebook__card">
          <img
            className="ebook__mark"
            src="/brand/logo-mark.png"
            alt=""
            width={288}
            height={347}
          />
          <h2 className="ebook__name">{t.ebook.homeTitle}</h2>
          <p className="ebook__lede">{t.ebook.lede}</p>

          <a
            className="btn btn--primary ebook__open"
            href={EBOOK_URL}
            target="_blank"
            rel="noopener"
          >
            {t.ebook.open}
          </a>

          <p className="ebook__note">{t.ebook.note}</p>
          <p className="ebook__note ebook__note--faint">{t.ebook.offlineNote}</p>
        </section>
      </div>
    </div>
  )
}
