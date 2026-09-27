/**
 * Textos em inglês (en-US) — idioma principal do app.
 *
 * O público é americano: o projeto foi anunciado para o mercado dos Estados
 * Unidos e a cliente pediu um nome adaptado "para as americanas". Um nome em
 * inglês sobre uma interface em português não se sustenta, então o app inteiro
 * fala inglês, com o português mantido para a cliente revisar.
 *
 * Todo o texto aqui é original, escrito para o app.
 */
export const en = {
  common: {
    back: 'Back',
    settings: 'Settings',
    week: 'Week',
    day: 'Day',
    of: 'of',
    minute: 'min',
    second: 's',
  },

  home: {
    subtitle: 'Your daily pelvic floor training',
    progressTitle: 'Your progress',
    weeksDone: (done: number, total: number) => `${done} of ${total} weeks`,
    percentDone: (n: number) => `${n}% complete`,
    upNext: (week: number, day: number) => `Up next: week ${week}, day ${day}`,
    allDone: 'Program complete. You can start the cycle again whenever you like.',
    startHere: 'Start here',
    yourProgram: 'Your program',
    locked: 'Finish the previous week',
    daysDone: (done: number, total: number) => `${done} of ${total} days`,
    resumeTitle: 'Workout in progress',
    resumeWhere: (week: number, day: number, series: number, workout: string) =>
      `Week ${week}, day ${day} · ${workout}. You stopped on set ${series}`,
    resumeCta: 'Pick up where you left off',
    resumeDiscard: 'Start the day over',
    savedHere: 'Saved on this phone. No account, no password.',
    sequenceNote:
      'Weeks unlock in order. Each one builds on the last: first you learn the movement lying down, then you carry it into sitting and standing.',
  },

  intro: {
    eyebrow: 'Before you begin',
    title: 'Find the right muscle',
    lede: 'Everything in this program depends on one thing: squeezing the pelvic floor and nothing else. Take a few minutes here before your first session.',
    steps: [
      {
        title: 'Locate it',
        body: 'Imagine you are trying to stop yourself from passing gas, and at the same time stop the flow of urine. That inward-and-upward lift is the pelvic floor. Use this only to identify the muscle. Do not practice while actually urinating.',
      },
      {
        title: 'Check what else is moving',
        body: 'Rest a hand on your belly. If your stomach, thighs or buttocks tighten, you are recruiting the wrong muscles. The movement should be internal and almost invisible from the outside.',
      },
      {
        title: 'Keep breathing',
        body: 'Holding your breath is the most common mistake. Breathe normally the whole time. At first, it can help to squeeze as you exhale.',
      },
      {
        title: 'Let go completely',
        body: 'Releasing matters as much as squeezing. Between repetitions, let the muscle fully relax. A muscle that never releases does not get stronger.',
      },
    ],
    postureTitle: 'Why posture changes',
    postureBody:
      'Weeks 1 to 3 repeat the same workout lying down, then seated, then standing. Gravity works against you a little more each time, so the same movement asks more of the muscle. From week 4 you add a five-second hold and go through the three positions again.',
    disclaimerTitle: 'A note before you start',
    disclaimerBody:
      'This app is a training guide, not medical advice. If you have any health condition, are under medical follow-up, or feel pain during the exercises, talk to a healthcare professional first.',
    cta: 'Got it, start week 1',
    done: 'Read',
  },

  posture: {
    lying: 'Lying down',
    seated: 'Seated',
    standing: 'Standing',
    lyingHint: 'Lie on your back with knees bent and feet flat. The easiest position to feel the muscle working.',
    seatedHint: 'Sit upright on a firm chair, feet flat on the floor, weight even on both sides.',
    standingHint: 'Stand with feet hip-width apart, knees soft. The hardest position, since gravity is working against you.',
  },

  style: {
    quick: 'Quick squeezes',
    hold: '5-second holds',
    quickHint: 'Squeeze, hold briefly, then release. Four seconds per repetition.',
    holdHint: 'Squeeze, hold for five seconds, then release.',
  },

  workout: {
    strength: 'Strength workout',
    pulse: 'Pulse workout',
    sets: 'Sets',
    reps: 'Reps',
    rest: 'Rest',
    duration: 'Duration',
    hold: 'Hold',
    start: 'Start workout',
    repeat: 'Do it again',
    doneLabel: 'Completed',
    bothNote:
      'Do both workouts, in the order shown. The day counts as complete once you finish the second one.',
    tips: {
      strengthQuick: [
        'Squeeze firmly, hold while the ball rests at the top, then let go completely.',
        'Breathe normally. Holding your breath works against the movement.',
        'Belly, thighs and buttocks stay relaxed. The work is internal.',
      ],
      strengthHold: [
        'Squeeze, hold steady for five seconds, then release slowly.',
        'The hold should feel even from start to finish, not strongest at the beginning.',
        'If you cannot keep the full five seconds yet, hold what you can and build up.',
      ],
      pulse: [
        'Light and quick here, like a blink. This is not maximum effort.',
        'Keep the same rhythm from the first repetition to the last.',
        'If you lose control of the movement, pause and restart the set.',
      ],
    },
  },

  session: {
    squeeze: 'Squeeze',
    hold: 'Hold',
    release: 'Release',
    seriesOf: (current: number, total: number) => `Set ${current}/${total}`,
    repsOf: (current: number, total: number) => `${current}/${total} reps`,
    restTime: 'Rest',
    getReady: (workout: string) => `Get ready for the ${workout.toLowerCase()}`,
    pause: 'Pause workout',
    resume: 'Resume workout',
    exit: 'Leave workout',
    completed: 'Workout complete',
    pausedTitle: 'Paused',
    pausedBody:
      'Your place is saved on this phone. You can close the app and come back. The workout will be waiting on this set.',
    soundOn: 'Turn sound off',
    soundOff: 'Turn sound on',
    vibrationOn: 'Turn vibration off',
    vibrationOff: 'Turn vibration on',
    iosNote: 'On iPhone the cue is sound only. Keep the volume up and silent mode off.',
  },

  finish: {
    workoutDone: 'Workout complete',
    dayDone: (day: number) => `Day ${day} complete`,
    weekDone: (week: number) => `Week ${week} complete`,
    programDone: 'Program complete',
    nextWorkout: (workout: string) => `Go to the ${workout.toLowerCase()}`,
    backToProgram: 'Back to the program',
    later: "I'll do it later",
    dayUnlocked: (day: number) => `Day ${day} is now open.`,
    weekUnlocked: (week: number, posture: string) =>
      `Week ${week} is now open: same workout, ${posture.toLowerCase()}.`,
    programDoneBody: 'You finished all six weeks. You can start the cycle again whenever you like.',
    sets: 'Sets',
    totalReps: 'Total reps',
  },

  settings: {
    title: 'Settings',
    duringWorkout: 'During the workout',
    sound: 'Sound',
    soundHint: 'A cue on every squeeze and release.',
    vibration: 'Vibration',
    vibrationHint: 'A short buzz on every transition.',
    vibrationUnsupported: 'Safari on iPhone does not offer vibration. The cue here is sound only.',
    keepAwake: 'Keep the screen on',
    keepAwakeHint: 'Stops the screen going dark in the middle of a set.',
    keepAwakeApprox:
      'On this device the feature is approximate. If the screen still goes dark, raise the auto-lock time in your phone settings.',
    pulseTitle: 'Pulse rhythm',
    pulseHint:
      'A pulse repetition is a quick squeeze followed by a longer rest, about one second in all. Pick the pace you can actually follow.',
    pulseSlower: 'Slower',
    pulseDefault: 'Default',
    pulseFaster: 'Faster',
    holdTitle: 'Hold length',
    holdHint: 'How long you hold the squeeze in weeks 4 to 6.',
    language: 'Language',
    languageHint: 'The app is written for an American audience. Portuguese is here for review.',
    progressTitle: 'Progress',
    progressHint:
      'Your progress is saved on this device. There is no account and no password, and nothing leaves your phone.',
    restart: 'Restart the program',
    confirmRestart: 'Erase your progress and go back to week 1?',
    erase: 'Erase',
    cancel: 'Cancel',
    version: 'version',
    installTitle: 'Add to your home screen',
    installHint:
      'Installed, it opens full screen with its own icon and works without internet. These steps are always here if you need them again.',
    installDone: 'Already installed. You are running it from the home screen.',
    accessTitle: 'Your access',
    accessCode: (code: string) => `Code ${code}`,
    accessHint:
      'Kept on this phone. The app checks in online about once a week; you do not have to do anything.',
  },

  install: {
    barTitle: "You're in the browser",
    barBody: 'Add the app to your home screen so it opens on its own and stays put.',
    barCta: 'Show me how',
    title: (name: string) => `Add ${name} to your home screen`,
    body: 'It gets its own icon, opens full screen, works without internet, and stops the browser closing it in the middle of a workout. Your progress stays on this phone either way.',
    stepShare: 'Tap the share button in the Safari toolbar.',
    stepAdd: 'Choose',
    stepAddStrong: 'Add to Home Screen',
    stepConfirm: 'Confirm with',
    stepConfirmStrong: 'Add',
    stepConfirmTail: '. Done.',
    cta: 'Add to home screen',
    dismiss: 'Not now',
  },

  gate: {
    eyebrow: 'Your access',
    title: 'Enter your purchase e-mail',
    lede: 'Use the same e-mail address you used to buy. No password, nothing to look up.',
    label: 'Purchase e-mail',
    cta: 'Unlock the app',
    working: 'Checking…',
    once: 'You only do this once on this phone. After that the app opens straight into your program, with or without internet.',
    help: 'Bought with a different address, or received an access code instead? Enter that here. It works too.',
    errors: {
      bad_code: 'That does not look like a complete e-mail address.',
      unknown_code: 'We could not find a purchase with that e-mail. Check for typos, and make sure it is the address you used at checkout.',
      revoked: 'This code is no longer active. If you believe this is a mistake, reply to your purchase email.',
      device_limit: 'This code is already in use on three devices, which is the limit. Reply to your purchase email and we can free one up.',
      not_activated: 'This code has not been set up on this device yet.',
      offline: 'No internet connection. Unlocking needs to happen online, just this once.',
      store_unavailable: 'The activation service is temporarily unavailable. Please try again in a few minutes.',
      server_error: 'Something went wrong on our side. Please try again in a moment.',
    },
  },

  blocked: {
    expiredTitle: 'Time to check in',
    expiredBody:
      'The app runs offline, but about once a week it needs a moment of internet to confirm your access is still active. Connect and tap below. Your progress is untouched.',
    revokedTitle: 'This access is no longer active',
    revokedBody:
      'The code on this phone has been cancelled, usually after a refund. If you think this is a mistake, reply to your purchase email and we will look into it.',
    retry: 'Try again',
    retrying: 'Checking…',
    another: 'Use a different code',
    stillOffline: 'Still no connection. Check your internet and try once more.',
  },

  ebook: {
    homeEyebrow: 'Your guide',
    homeTitle: 'The Squeeze Method ebook',
    title: 'Your ebook',
    lede: 'The 49-page guide that comes with your purchase. It explains how the pelvic floor works, what the exercises do, and why the program is built the way it is.',
    open: 'Open the ebook (PDF)',
    note: 'The ebook opens as a PDF you can read here or save to your phone. It also arrived attached to your purchase e-mail.',
    offlineNote: 'Opening it for the first time may need a moment of internet. After that it is kept on this phone.',
  },

  legal: {
    groupTitle: 'About & legal',
    updated: 'Last updated: September 11, 2026',
    pages: {
      privacy: {
        title: 'Privacy Policy',
        sections: [
          {
            h: 'What this policy covers',
            ps: [
              'This policy explains what information The Squeeze Method (femivita.online) handles when you use the app and the ebook. The short version: almost everything stays on your phone.',
            ],
          },
          {
            h: 'What we process',
            ps: [
              'To unlock the app, we check the purchase e-mail or access code you enter, and the activation service keeps a record of it together with an anonymous identifier for each device it unlocks (up to three). That is all it stores.',
              'Your training progress and settings are saved only on your device. They are never uploaded, and we cannot see them.',
            ],
          },
          {
            h: 'What we do not do',
            ps: [
              'The app has no ads, no analytics and no trackers. We do not collect your name, location or health information, and we do not sell or share personal information with anyone.',
            ],
          },
          {
            h: 'Purchases',
            ps: [
              'Payments are processed by Hotmart, the platform where you bought the product, under its own privacy policy. We receive only what is needed to grant access: the e-mail linked to your purchase, and refund notifications.',
            ],
          },
          {
            h: 'The weekly check-in',
            ps: [
              'About once a week the app contacts our server to confirm your access is still active. That request carries your access code and device identifier, and nothing else.',
            ],
          },
          {
            h: 'Your choices',
            ps: [
              'You can ask us to delete the activation record linked to your purchase at any time by writing to squeezemethod@gmail.com. Deleting it disables the app on your devices.',
            ],
          },
          {
            h: 'Changes',
            ps: [
              'We may update this policy as the product evolves. The date above always reflects the current version.',
            ],
          },
        ],
      },
      terms: {
        title: 'Terms of Use',
        sections: [
          {
            h: 'The product',
            ps: [
              'The Squeeze Method is a digital product: a six-week pelvic floor training app and a companion ebook, sold as a one-time purchase through Hotmart.',
            ],
          },
          {
            h: 'Your license',
            ps: [
              'Your purchase gives you a personal, non-transferable license to use the app on up to three of your own devices and to read the ebook for your own use.',
              'Sharing your access code or purchase e-mail, or copying, reselling or republishing the app or the ebook, is not permitted.',
            ],
          },
          {
            h: 'Refunds',
            ps: [
              'Refunds follow the policy shown at checkout on Hotmart. When a purchase is refunded, access to the app ends.',
            ],
          },
          {
            h: 'Health notice',
            ps: [
              'The app and the ebook are educational training guides, not medical advice. The Medical Disclaimer is part of these terms.',
            ],
          },
          {
            h: 'No guarantees',
            ps: [
              'We work to keep the app available and accurate, but it is provided "as is", without warranties of any kind. Results vary from person to person and are not guaranteed.',
            ],
          },
          {
            h: 'Liability',
            ps: [
              'To the maximum extent allowed by law, our total liability for any claim related to the product is limited to the amount you paid for it.',
            ],
          },
          {
            h: 'Contact',
            ps: ['Questions about these terms: squeezemethod@gmail.com.'],
          },
        ],
      },
      disclaimer: {
        title: 'Medical Disclaimer',
        sections: [
          {
            h: '',
            ps: [
              'The Squeeze Method, meaning the app and the ebook, is an educational training program. It does not provide medical advice, and it is not a substitute for evaluation, diagnosis or treatment by a healthcare professional.',
            ],
          },
          {
            h: 'Talk to a professional first if',
            ps: [
              'You are pregnant, or gave birth recently.',
              'You have had pelvic or abdominal surgery.',
              'You have been diagnosed with a pelvic floor condition, such as prolapse or overly tight (hypertonic) muscles.',
              'You feel pelvic pain in daily life.',
            ],
          },
          {
            h: 'While training',
            ps: [
              'Stop if you feel pain. Pain is information, never something to push through.',
              'Pelvic floor training is low-risk when done correctly, but doing more than the program asks, or squeezing through pain, can make some conditions worse.',
            ],
          },
          {
            h: 'Results',
            ps: [
              'Improvement takes consistent practice over weeks, and results vary from person to person. No specific outcome is promised.',
            ],
          },
          {
            h: 'Emergencies',
            ps: [
              'If you experience sudden or severe symptoms, seek medical care. Do not rely on this app to decide.',
            ],
          },
        ],
      },
    },
  },
}

/**
 * A forma do dicionário sai do inglês, sem `as const` — com ele cada texto
 * viraria um tipo literal e a tradução em português não caberia na forma.
 * Do jeito que está, o TypeScript cobra que pt.ts tenha exatamente as mesmas
 * chaves: esquecer uma tradução vira erro de compilação, não texto faltando
 * em produção.
 */
export type Dict = typeof en
