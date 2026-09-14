import { useCallback, useEffect, useRef, useState } from 'react'
import { Ball } from '../components/Ball'
import { Waves } from '../components/Waves'
import {
  IconArrowLeft,
  IconPause,
  IconPlay,
  IconSound,
  IconSoundOff,
  IconVibrate,
  IconVibrateOff,
} from '../components/icons'
import { SessionEngine, type Cue, type EngineTick, type SessionStep } from '../lib/engine'
import { audio, cues } from '../lib/audio'
import { haptics } from '../lib/haptics'
import { wakeLock } from '../lib/wakelock'
import { isIOS } from '../lib/platform'
import { useT } from '../i18n'
import type { SessionState, Posture } from '../types'
import type { Settings } from '../lib/storage'
import './SessionScreen.css'

interface Props {
  posture: Posture
  /** A sequência do dia. O treino de força emenda no de pulsação sozinho. */
  steps: SessionStep[]
  /** Série em que retomar, quando a sessão foi interrompida antes. */
  startSeries?: number
  settings: Settings
  onSettings: (patch: Partial<Settings>) => void
  /** Um treino da sequência terminou: grava já, sem esperar o fim da sessão. */
  onWorkoutDone: (stepIndex: number) => void
  /** Onde a sessão está agora, para sobreviver ao app ser descartado. */
  onProgress: (series: number, stepIndex: number) => void
  onFinish: () => void
  onExit: () => void
}

export function SessionScreen({
  posture,
  steps,
  startSeries = 1,
  settings,
  onSettings,
  onWorkoutDone,
  onProgress,
  onFinish,
  onExit,
}: Props) {
  const t = useT()
  const [state, setState] = useState<SessionState>({
    stepIndex: 0,
    phase: 'prep',
    series: 1,
    rep: 1,
    paused: false,
    phaseDurationMs: SessionEngine.PREP_MS,
  })

  const stageRef = useRef<HTMLDivElement>(null)
  const countRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef<SessionEngine | null>(null)

  const step = steps[Math.min(state.stepIndex, steps.length - 1)]
  const workout = step.workout
  const timing = step.timing
  const isPulse = workout.type === 'pulse'
  // Semanas 4-6: sustentação longa o bastante para valer um número na tela.
  const countsHold = timing.holdMs >= 3000

  /**
   * Callback de quadro. Escreve direto no DOM de propósito.
   *
   * Passar isto por setState renderizaria a árvore 60 vezes por segundo pelos
   * onze minutos da sessão mais longa. Aqui saem duas escritas de estilo por
   * quadro, e o React só acorda quando fase, série, repetição ou treino mudam.
   */
  const onTick = useCallback(({ phase, progress, remainingMs }: EngineTick) => {
    const stage = stageRef.current
    if (stage) {
      // Curva suave nas pontas: a bolinha desacelera ao chegar no topo e na
      // base, o que ajuda a acompanhar o momento exato de apertar e soltar.
      const eased = 0.5 - Math.cos(Math.PI * progress) / 2

      // Quatro tempos por repetição, medidos na gravação de referência:
      // sobe (0,4s) → segura em cima → desce (0,4s) → fica embaixo.
      let t = 0
      if (phase === 'contract') t = eased
      else if (phase === 'hold') t = 1
      else if (phase === 'release') t = 1 - eased
      else if (phase === 'relax') t = 0

      stage.style.setProperty('--t', t.toFixed(4))
    }

    // Contagem regressiva: descanso, preparo e sustentação mostram segundos.
    const count = countRef.current
    if (count && (phase === 'rest' || phase === 'prep' || phase === 'hold')) {
      const text = String(Math.ceil(remainingMs / 1000))
      if (count.textContent !== text) count.textContent = text
    }
  }, [])

  const onCue = useCallback((cue: Cue) => {
    switch (cue) {
      case 'contract':
        cues.contract()
        haptics.contract()
        break
      case 'hold':
        // Sem som novo aqui: a contração acabou de tocar e um segundo beep a
        // um segundo de distância soa como erro, não como instrução.
        haptics.hold()
        break
      case 'release':
        cues.release()
        haptics.release()
        break
      case 'relax':
        // Sem som: o "solta" já tocou ao começar a descida.
        break
      case 'rest':
        cues.restStart()
        haptics.restStart()
        break
      case 'restEnding':
        cues.restEnding()
        break
      case 'done':
        cues.done()
        haptics.done()
        break
    }
  }, [])

  /**
   * Mede a altura útil do trilho e a publica como --travel-px.
   *
   * Roda quando o layout muda (rotação, troca de treino, troca de tela), nunca
   * por quadro: a distância percorrida só depende do tamanho do palco.
   */
  useEffect(() => {
    const stage = stageRef.current
    if (!stage || isPulse) return

    const measure = () => {
      const pad = parseFloat(getComputedStyle(stage).getPropertyValue('--pad')) || 0
      stage.style.setProperty('--travel-px', `${Math.max(0, stage.clientHeight - pad * 2)}px`)
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(stage)
    return () => observer.disconnect()
  }, [isPulse, state.phase])

  // Monta o motor uma vez por sessão e o desliga ao sair da tela.
  useEffect(() => {
    const engine = new SessionEngine(steps, {
      onChange: setState,
      onTick,
      onCue,
      onWorkoutDone,
    })
    engineRef.current = engine
    engine.start(startSeries)

    return () => {
      engine.stop()
      engineRef.current = null
      haptics.stopAll()
    }
    // A sequência não muda durante a sessão; recriar o motor a cada render
    // seria reiniciar a contagem do zero.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Marca a posição a cada série, para poder retomar se o app for descartado.
  // Grava também o índice do treino: parar na pulsação e voltar no começo do
  // treino de força seria refazer cinco séries que já estavam feitas.
  useEffect(() => {
    if (state.phase !== 'done') onProgress(state.series, state.stepIndex)
  }, [state.series, state.stepIndex, state.phase, onProgress])

  // Tela acesa enquanto a sessão existe.
  useEffect(() => {
    if (settings.keepScreenOn) void wakeLock.enable()
    return () => {
      void wakeLock.disable()
    }
  }, [settings.keepScreenOn])

  /**
   * Sair do app pausa o treino.
   *
   * É daqui que vinha o "pausei e sumiu". Fora da tela o iPhone congela os
   * quadros e depois descarta a página inteira: o motor voltava consumindo de
   * uma vez todas as fases atrasadas, e a usuária reencontrava o treino três
   * séries à frente — ou não reencontrava treino nenhum, se a página tinha
   * morrido. Pausar na saída torna a volta previsível: está parado, no ponto,
   * e o ponto está gravado.
   *
   * Voltar não retoma sozinho, de propósito. Retomar no meio de uma contração
   * é pior do que a pausa: quem volta precisa ver onde parou antes de o corpo
   * ter que acompanhar.
   */
  useEffect(() => {
    const onHidden = () => {
      engineRef.current?.pause()
      haptics.stopAll()
    }
    const onVisibility = () => {
      if (document.visibilityState === 'visible') audio.resumeIfNeeded()
      else onHidden()
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', onHidden)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', onHidden)
    }
  }, [])

  useEffect(() => {
    audio.setEnabled(settings.sound)
  }, [settings.sound])

  useEffect(() => {
    haptics.setEnabled(settings.vibration)
  }, [settings.vibration])

  useEffect(() => {
    if (state.phase === 'done') {
      const id = window.setTimeout(onFinish, 1100)
      return () => window.clearTimeout(id)
    }
  }, [state.phase, onFinish])

  const togglePause = () => {
    const engine = engineRef.current
    if (!engine) return
    if (state.paused) {
      audio.unlock() // retomar também é gesto: reaproveita para destravar o som
      engine.resume()
    } else {
      engine.pause()
      haptics.stopAll()
    }
  }

  const resting = state.phase === 'rest'
  const preparing = state.phase === 'prep'
  const finished = state.phase === 'done'
  const counting = resting || preparing

  return (
    <div className={`session session--${state.phase}`}>
      <Waves />

      <header className="session__top">
        <button className="icon-btn icon-btn--filled" onClick={onExit} aria-label={t.session.exit}>
          <IconArrowLeft />
        </button>

        <div className="session__counter" role="status" aria-live="polite">
          <span className="session__counter-series">
            {t.session.seriesOf(state.series, workout.series)}
          </span>
          <strong className="session__counter-reps">
            {t.session.repsOf(Math.min(state.rep, workout.reps), workout.reps)}
          </strong>
        </div>

        <div className="session__toggles">
          {haptics.supported && (
            <button
              className="icon-btn"
              aria-pressed={settings.vibration}
              aria-label={settings.vibration ? t.session.vibrationOn : t.session.vibrationOff}
              onClick={() => onSettings({ vibration: !settings.vibration })}
            >
              {settings.vibration ? <IconVibrate /> : <IconVibrateOff />}
            </button>
          )}
          <button
            className="icon-btn"
            aria-pressed={settings.sound}
            aria-label={settings.sound ? t.session.soundOn : t.session.soundOff}
            onClick={() => {
              if (!settings.sound) audio.unlock()
              onSettings({ sound: !settings.sound })
            }}
          >
            {settings.sound ? <IconSound /> : <IconSoundOff />}
          </button>
        </div>
      </header>

      <main className="session__stage">
        {counting ? (
          <div className="session__countdown">
            <div className="session__countdown-number" ref={countRef}>
              {Math.ceil(state.phaseDurationMs / 1000)}
            </div>
            <p className="session__countdown-caption">
              {resting ? t.session.restTime : t.session.getReady(t.workout[workout.type])}
            </p>
          </div>
        ) : finished ? (
          <div className="session__countdown">
            <div className="session__done-mark" aria-hidden="true">
              &#10003;
            </div>
            <p className="session__countdown-caption">{t.session.completed}</p>
          </div>
        ) : (
          <>
            <Ball ref={stageRef} mode={isPulse ? 'pulse' : 'travel'} hasHold={countsHold} />
            {countsHold && state.phase === 'hold' && (
              <div className="session__hold" aria-hidden="true">
                <span className="session__hold-count" ref={countRef}>
                  {Math.ceil(timing.holdMs / 1000)}
                </span>
                <span className="session__hold-label">{t.session.hold}</span>
              </div>
            )}
          </>
        )}

        {/*
          Pausado.

          Responde, no momento exato em que a pergunta aparece, a que a cliente
          fez por escrito: "salvo onde?". Cobre o palco e só o palco — o
          contador em cima e o botão de retomar embaixo continuam legíveis e
          clicáveis, que é justamente do que ela precisa para voltar.
        */}
        {state.paused && !finished && (
          <div className="session__paused" role="status">
            <strong className="session__paused-title">{t.session.pausedTitle}</strong>
            <p className="session__paused-body">{t.session.pausedBody}</p>
          </div>
        )}
      </main>

      <footer className="session__bottom">
        {/*
          Qual treino está rodando. Com os dois emendando sozinhos, é isto que
          diz à usuária que ela passou da força para a pulsação.
        */}
        {!finished && (
          <p className="session__posture">
            {t.workout[workout.type]} · {t.posture[posture]}
          </p>
        )}

        {isIOS && !haptics.supported && preparing && state.stepIndex === 0 && state.series === 1 && (
          <p className="session__note">{t.session.iosNote}</p>
        )}

        {!finished && (
          <button className="btn btn--primary" onClick={togglePause}>
            {state.paused ? <IconPlay /> : <IconPause />}
            {state.paused ? t.session.resume : t.session.pause}
          </button>
        )}
      </footer>

      <span className="visually-hidden" aria-live="polite">
        {t.workout[workout.type]}. {t.session.seriesOf(state.series, workout.series)}.
      </span>
    </div>
  )
}
