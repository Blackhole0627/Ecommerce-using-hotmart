/**
 * Vibracao.
 *
 * navigator.vibrate NAO existe no Safari do iPhone, em nenhuma versao. Nao
 * adianta try/catch: a funcao simplesmente nao esta la. Todo o app trata
 * vibracao como recurso opcional e detectado, nunca como garantido — no iOS o
 * beep e o unico retorno, e por isso a tela de execucao avisa a usuaria disso
 * em vez de exibir um botao de vibracao que nao faz nada.
 */

const detect = (): boolean =>
  typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'

let enabled = true

export const haptics = {
  /** Falso no iPhone. Use para decidir se o controle deve sequer aparecer. */
  supported: detect(),

  setEnabled(value: boolean) {
    enabled = value
  },

  get enabled() {
    return enabled
  },

  buzz(pattern: number | number[]) {
    if (!enabled || !this.supported) return
    try {
      navigator.vibrate(pattern)
    } catch {
      // Alguns navegadores lancam se a aba nao teve interacao. Silencio e o
      // comportamento certo: vibracao nunca deve derrubar o treino.
    }
  },

  contract() {
    this.buzz(45)
  },
  /** Entrada na sustentação: dois toques curtos, "agora segura". */
  hold() {
    this.buzz([0, 18, 70, 18])
  },
  release() {
    this.buzz(20)
  },
  restStart() {
    this.buzz([0, 60, 90, 60])
  },
  done() {
    this.buzz([0, 80, 100, 80, 100, 180])
  },
  stopAll() {
    if (this.supported) {
      try {
        navigator.vibrate(0)
      } catch {
        /* idem */
      }
    }
  },
}
