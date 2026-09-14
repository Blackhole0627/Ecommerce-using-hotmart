/**
 * Ondas decorativas do rodapé.
 *
 * SVG inline, não imagem: escala em qualquer tela sem pesar no cache offline
 * e acompanha as variáveis de cor do tema quando a marca da cliente entrar.
 */
export function Waves() {
  return (
    <svg
      className="waves"
      viewBox="0 0 390 220"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <path
        d="M0 96c58-34 118-34 176 0s118 34 214-6v130H0z"
        fill="var(--teal-wash)"
        opacity="0.55"
      />
      <path
        d="M0 140c70-40 132-30 196 4s126 30 194-8v84H0z"
        fill="var(--teal-soft)"
        opacity="0.45"
      />
      <path
        d="M0 178c74-30 140-18 206 8s118 22 184-10v44H0z"
        fill="var(--teal-wash)"
        opacity="0.8"
      />
    </svg>
  )
}
