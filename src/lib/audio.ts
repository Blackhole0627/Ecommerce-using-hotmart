/**
 * Som do treino, em Web Audio.
 *
 * O ponto delicado e o iOS. O Safari so deixa um AudioContext sair do estado
 * "suspended" dentro do gesto do usuario. Como o primeiro beep do treino toca
 * uns 40 segundos depois do toque no botao, se o contexto nao for destravado
 * no proprio gesto, ele nunca mais toca — e no iPhone o som e o unico canal de
 * retorno que existe, porque nao ha vibracao (ver haptics.ts).
 *
 * Por isso unlock() precisa ser chamado SINCRONAMENTE dentro do handler do
 * botao "Iniciar treino", nao em um efeito ou callback posterior.
 */

type Ctor = typeof AudioContext
const getCtor = (): Ctor | null => {
  if (typeof window === 'undefined') return null
  return (window.AudioContext ?? (window as unknown as { webkitAudioContext?: Ctor }).webkitAudioContext) ?? null
}

let ctx: AudioContext | null = null
let master: GainNode | null = null
let enabled = true

export const audio = {
  get supported() {
    return getCtor() !== null
  },

  setEnabled(value: boolean) {
    enabled = value
  },

  get enabled() {
    return enabled
  },

  /** Chamar dentro do gesto do usuario. Idempotente. */
  unlock() {
    const Ctor = getCtor()
    if (!Ctor) return

    if (!ctx) {
      ctx = new Ctor()
      master = ctx.createGain()
      master.gain.value = 0.9
      master.connect(ctx.destination)
    }

    // Em alguns navegadores resume() so vale dentro do gesto; ignorar a
    // promessa e proposital, nao ha nada util a fazer com a falha aqui.
    void ctx.resume()

    // Um buffer mudo de um quadro. E o que efetivamente marca o contexto como
    // "tocado por gesto do usuario" no Safari; resume() sozinho nem sempre basta.
    const buffer = ctx.createBuffer(1, 1, ctx.sampleRate)
    const source = ctx.createBufferSource()
    source.buffer = buffer
    source.connect(master!)
    source.start(0)
  },

  /** O Safari suspende o contexto ao sair da aba; retomar ao voltar. */
  resumeIfNeeded() {
    if (ctx && ctx.state === 'suspended') void ctx.resume()
  },

  close() {
    if (ctx) {
      void ctx.close()
      ctx = null
      master = null
    }
  },

  /**
   * Um beep com envelope curto. Onda senoidal com ataque e queda suaves:
   * ligar e desligar um oscilador na unha estala, e um estalo a cada segundo
   * durante sete minutos e insuportavel.
   */
  beep(frequency: number, durationMs = 130, volume = 0.5) {
    if (!enabled || !ctx || !master || ctx.state !== 'running') return

    const now = ctx.currentTime
    const dur = durationMs / 1000
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(frequency, now)

    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(volume, now + 0.012)
    gain.gain.setValueAtTime(volume, now + dur * 0.6)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur)

    osc.connect(gain)
    gain.connect(master)
    osc.start(now)
    osc.stop(now + dur + 0.02)
  },

  /** Sequencia de notas, cada uma com seu atraso em milissegundos. */
  sequence(notes: Array<{ freq: number; at: number; dur?: number; vol?: number }>) {
    for (const n of notes) {
      window.setTimeout(() => this.beep(n.freq, n.dur ?? 130, n.vol ?? 0.5), n.at)
    }
  },
}

/** Vocabulario sonoro do treino. Agudo sobe (aperta), grave desce (solta). */
export const cues = {
  contract: () => audio.beep(880, 120, 0.5),
  release: () => audio.beep(523, 120, 0.38),
  restStart: () => audio.sequence([
    { freq: 660, at: 0, dur: 150 },
    { freq: 440, at: 150, dur: 220 },
  ]),
  restEnding: () => audio.sequence([
    { freq: 700, at: 0, dur: 90, vol: 0.35 },
    { freq: 700, at: 1000, dur: 90, vol: 0.42 },
    { freq: 700, at: 2000, dur: 90, vol: 0.5 },
  ]),
  done: () => audio.sequence([
    { freq: 523, at: 0, dur: 160 },
    { freq: 659, at: 150, dur: 160 },
    { freq: 784, at: 300, dur: 320 },
  ]),
}
