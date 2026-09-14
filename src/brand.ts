/**
 * ---------------------------------------------------------------------------
 * IDENTIDADE VISUAL — ARQUIVO ÚNICO DE MARCA
 * ---------------------------------------------------------------------------
 * Tudo que é "cara do produto" mora aqui: nome, frase, cores.
 * Trocar a marca é editar este arquivo, nada mais.
 *
 * NOME: veio no logo que a cliente enviou — "The Squeeze Method", com
 * "Pelvic Power & Wellness" embaixo. É a decisão dela sobre o nome em inglês
 * que estava em aberto; o app inteiro passou a usar exatamente o que está
 * escrito na arte.
 *
 * CORES: amostradas do arquivo dela (brand/previewlogoapp.webp), que é a
 * paleta que ela pediu para usar. São três cores, e só três:
 *
 *     coral   #EF6B58   pétalas e o nome
 *     verde   #2B938B   folhas e a linha de baixo
 *     areia   #EEE2D6   o fundo da arte
 *
 * O resto da paleta abaixo é derivado dessas três — clareando na direção do
 * branco para os fundos e escurecendo para os tons de ênfase. Nada foi
 * inventado fora delas.
 */

export const APP = {
  /** Nome completo (cabeçalho, manifesto). */
  name: 'The Squeeze Method',
  /** Nome curto do ícone. O iOS corta perto de 12 caracteres. */
  shortName: 'Squeeze',
  /** Frase de uma linha, para o manifesto e para o cabeçalho. */
  tagline: 'Pelvic Power & Wellness',
  /** Cor da barra do sistema quando instalado. */
  themeColor: '#EF6B58',
  /** Cor do fundo da splash de abertura. */
  backgroundColor: '#F6EFE8',
} as const

/** Paleta, derivada das três cores do logo da cliente. */
export const PALETTE = {
  /** Coral — ação, contração, SQUEEZE. Cor exata das pétalas. */
  coral: '#EF6B58',
  coralDeep: '#C95A4A',
  coralSoft: '#FAD0CA',
  coralWash: '#FDEDEB',

  /** Verde — descanso, soltura, RELEASE. Cor exata das folhas. */
  teal: '#2B938B',
  tealDeep: '#237972',
  tealSoft: '#BBDCDA',
  tealWash: '#E6F2F1',

  /**
   * Neutros quentes. A tinta é marrom, não cinza-azulado: sobre o creme dela
   * um preto frio fica sujo, e era isso que dava ao app o ar clínico que ela
   * pediu para tirar.
   */
  ink: '#3B2B26',
  inkMuted: '#8F837D',
  inkFaint: '#AFA59E',
  surface: '#FFFFFF',
  /** Fundo do app: a areia dela, clareada o bastante para ler o dia inteiro. */
  canvas: '#F6EFE8',
  /** A areia exata do logo, para as ondas, as réguas e os fundos de apoio. */
  sand: '#EEE2D6',
  line: '#EADFD4',
} as const
