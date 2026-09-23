import { forwardRef } from 'react'
import { useT } from '../i18n'
import './Ball.css'

interface Props {
  mode: 'travel' | 'pulse'
  /** Semanas 4-6: a bolinha para no topo em vez de cair na hora. */
  hasHold?: boolean
}

/**
 * A bolinha do treino e o trilho por onde ela sobe.
 *
 * A posição NÃO é estado do React. Quem escreve nela é a tela de execução,
 * direto no DOM, a cada quadro (ver SessionScreen). Este componente só desenha
 * a estrutura e expõe as variáveis CSS que o motor manipula:
 *
 *   --t   0 = embaixo (RELEASE), 1 = em cima (SQUEEZE)
 *
 * De --t saem posição, escala, cor e o rastro. Uma variável só, para o motor
 * nunca precisar tocar em mais de uma propriedade por quadro.
 */
export const Ball = forwardRef<HTMLDivElement, Props>(function Ball({ mode, hasHold }, ref) {
  const t = useT()

  return (
    <div
      className={`ball-stage ball-stage--${mode}${hasHold ? ' ball-stage--hold' : ''}`}
      ref={ref}
      aria-hidden="true"
    >
      {mode === 'travel' && (
        <>
          <span className="ball-stage__label ball-stage__label--top">{t.session.squeeze}</span>
          <span className="ball-stage__label ball-stage__label--bottom">{t.session.release}</span>

          {/*
            Quatro réguas de ponta a ponta da tela, dividindo o percurso em três
            partes iguais: a de cima no APERTA, a de baixo no SOLTA, e duas no
            meio. Elas dão a medida de quanto falta — sem elas a bolinha sobe no
            vazio e não há como saber se está na metade ou quase no fim.
          */}
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={`ball-stage__rule ball-stage__rule--${i}`} />
          ))}

          <span className="ball-stage__guide ball-stage__guide--top" />
          <span className="ball-stage__guide ball-stage__guide--bottom" />
          <span className="ball-stage__trail" />

          {/*
            Marcas que o rastro vai acendendo ao cruzar cada régua do meio.
            Aparecem por --t, como todo o resto, então acompanham a bolinha sem
            passar pelo React.
          */}
          {[1, 2].map((i) => (
            <span key={i} className={`ball-stage__dot ball-stage__dot--${i}`} />
          ))}
        </>
      )}
      <span className="ball-stage__halo" />
      {/*
        A flor da logo no lugar da bolinha (pedido da cliente, 23/09/2026):
        além de marca, é diferenciação visual do app de referência, que usa um
        círculo liso. A flor "fecha" ao apertar pelo mesmo --scale de antes.
      */}
      <span className="ball-stage__ball">
        <img src="/brand/logo-mark.png" alt="" draggable={false} />
      </span>

      {/*
        No modo pulsação os dois rótulos ficam empilhados e trocam por
        opacidade, presos ao mesmo --t que colore a bolinha. Se o texto viesse
        do estado do React e a cor do quadro de animação, os dois sairiam de
        sincronia justamente onde o ciclo é mais rápido — a bolinha já coral e
        a palavra ainda escrita "Release".
      */}
      {mode === 'pulse' && (
        <>
          <span className="pulse-label pulse-label--squeeze">{t.session.squeeze}</span>
          <span className="pulse-label pulse-label--release">{t.session.release}</span>
        </>
      )}
    </div>
  )
})
