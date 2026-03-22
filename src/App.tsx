import { useState, useEffect, useCallback, useRef, type CSSProperties, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

// ─── Types ───────────────────────────────────────────────────────────────────

interface SavedText {
  id: string
  title: string
  text: string
  language: string
  day: number       // 0 = not started, 1-3 = current day
  step: number      // current step within day
  lineMastery: Record<number, 'perfect' | 'close' | 'missed' | null>
  completedDays: number[]
  createdAt: number
}

type AppView = 'landing' | 'training'

const LANGUAGES = [
  { code: 'en-US', label: 'English' },
  { code: 'es-ES', label: 'Spanish' },
  { code: 'fr-FR', label: 'French' },
  { code: 'de-DE', label: 'German' },
  { code: 'ar-SA', label: 'Arabic' },
  { code: 'ja-JP', label: 'Japanese' },
  { code: 'ko-KR', label: 'Korean' },
  { code: 'it-IT', label: 'Italian' },
  { code: 'pt-BR', label: 'Portuguese' },
]

const RTL_LANGS = ['ar-SA', 'he-IL']

const STORAGE_KEY = 'skit-trainer-texts'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function loadTexts(): SavedText[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) as SavedText[] : []
  } catch {
    return []
  }
}

function saveTexts(texts: SavedText[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(texts))
}

function splitLines(text: string): string[] {
  return text.split('\n').filter(l => l.trim().length > 0)
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size))
  }
  return chunks
}

function getMasteryPercent(mastery: Record<number, 'perfect' | 'close' | 'missed' | null>, totalLines: number): number {
  if (totalLines === 0) return 0
  let score = 0
  for (let i = 0; i < totalLines; i++) {
    const m = mastery[i]
    if (m === 'perfect') score += 1
    else if (m === 'close') score += 0.5
  }
  return Math.round((score / totalLines) * 100)
}

function removeRandomWords(text: string, percent: number): { display: string; blanks: { index: number; word: string }[] } {
  const words = text.split(/\s+/)
  const blanks: { index: number; word: string }[] = []
  const indices = words.map((_, i) => i)
  // Shuffle and pick
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]]
  }
  const count = Math.max(1, Math.round(words.length * percent))
  const toRemove = new Set(indices.slice(0, count))
  const display = words.map((w, i) => {
    if (toRemove.has(i)) {
      blanks.push({ index: i, word: w })
      return '____'
    }
    return w
  }).join(' ')
  return { display, blanks }
}

function getFirstLetters(line: string): string {
  return line.split(/\s+/).map(w => {
    if (w.length === 0) return ''
    // Keep punctuation attached
    const first = w[0]
    const rest = w.slice(1).replace(/[a-zA-Z\u00C0-\u024F\u0400-\u04FF\u0600-\u06FF\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/g, '_')
    return first + rest
  }).join(' ')
}

// ─── TTS ─────────────────────────────────────────────────────────────────────

function speakLine(text: string, lang: string): Promise<void> {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) { resolve(); return }
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = lang
    u.rate = 0.9
    u.onend = () => resolve()
    u.onerror = () => resolve()
    window.speechSynthesis.speak(u)
  })
}

function stopSpeech() {
  if ('speechSynthesis' in window) window.speechSynthesis.cancel()
}

// ─── Animation ───────────────────────────────────────────────────────────────

const fadeVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
}

const fadeTransition = { duration: 0.25, ease: 'easeOut' as const }

function FadeIn({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}

// ─── Shared Components ───────────────────────────────────────────────────────

const css = {
  container: {
    maxWidth: 720,
    margin: '0 auto',
    padding: '24px 20px',
    flex: 1,
    width: '100%',
  } satisfies CSSProperties,
  card: {
    background: 'var(--surface)',
    borderRadius: 'var(--radius)',
    padding: '24px',
    border: '1px solid var(--border)',
  } satisfies CSSProperties,
  btn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: '12px 24px',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.95rem',
    fontWeight: 600,
    transition: 'all 0.2s',
    whiteSpace: 'nowrap' as const,
  } satisfies CSSProperties,
  btnPrimary: {
    background: 'var(--accent)',
    color: '#0f0f14',
  } satisfies CSSProperties,
  btnSecondary: {
    background: 'var(--surface)',
    border: '1px solid var(--border)',
    color: 'var(--text)',
  } satisfies CSSProperties,
  btnSmall: {
    padding: '8px 16px',
    fontSize: '0.85rem',
  } satisfies CSSProperties,
  header: {
    textAlign: 'center' as const,
    marginBottom: 32,
  } satisfies CSSProperties,
  title: {
    fontSize: '2rem',
    fontWeight: 700,
    color: 'var(--text)',
    letterSpacing: '-0.02em',
  } satisfies CSSProperties,
  subtitle: {
    color: 'var(--text-muted)',
    fontSize: '1rem',
    marginTop: 4,
  } satisfies CSSProperties,
  label: {
    display: 'block',
    fontSize: '0.85rem',
    fontWeight: 500,
    color: 'var(--text-muted)',
    marginBottom: 6,
  } satisfies CSSProperties,
  lineNum: {
    color: 'var(--text-muted)',
    fontSize: '0.8rem',
    minWidth: 28,
    textAlign: 'right' as const,
    marginRight: 12,
    flexShrink: 0,
    userSelect: 'none' as const,
  } satisfies CSSProperties,
  progressBar: {
    width: '100%',
    height: 4,
    background: 'var(--border)',
    borderRadius: 2,
    overflow: 'hidden' as const,
  } satisfies CSSProperties,
}

function ProgressBar({ value, color = 'var(--accent)' }: { value: number; color?: string }) {
  return (
    <div style={css.progressBar}>
      <motion.div
        style={{ height: '100%', background: color, borderRadius: 2 }}
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      />
    </div>
  )
}

function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 20 }}>
      {Array.from({ length: total }, (_, i) => (
        <div
          key={i}
          style={{
            width: i === current ? 24 : 8,
            height: 8,
            borderRadius: 4,
            background: i === current ? 'var(--accent)' : i < current ? 'var(--success)' : 'var(--border)',
            transition: 'all 0.3s',
          }}
        />
      ))}
      <span style={{ marginLeft: 8, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        Step {current + 1} of {total}
      </span>
    </div>
  )
}

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [view, setView] = useState<AppView>('landing')
  const [texts, setTexts] = useState<SavedText[]>(loadTexts)
  const [activeTextId, setActiveTextId] = useState<string | null>(null)

  const activeText = texts.find(t => t.id === activeTextId) ?? null

  const updateTexts = useCallback((fn: (prev: SavedText[]) => SavedText[]) => {
    setTexts(prev => {
      const next = fn(prev)
      saveTexts(next)
      return next
    })
  }, [])

  const updateActive = useCallback((patch: Partial<SavedText>) => {
    if (!activeTextId) return
    updateTexts(prev => prev.map(t => t.id === activeTextId ? { ...t, ...patch } : t))
  }, [activeTextId, updateTexts])

  const startTraining = useCallback((id: string) => {
    setActiveTextId(id)
    setView('training')
  }, [])

  const goHome = useCallback(() => {
    stopSpeech()
    setView('landing')
    setActiveTextId(null)
  }, [])

  // Global keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && view === 'training') {
        goHome()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [view, goHome])

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', width: '100%' }}>
      <AnimatePresence mode="wait">
        {view === 'landing' ? (
          <motion.div key="landing" variants={fadeVariants} initial="initial" animate="animate" exit="exit" transition={fadeTransition} style={{ flex: 1 }}>
            <Landing texts={texts} updateTexts={updateTexts} onStart={startTraining} />
          </motion.div>
        ) : activeText ? (
          <motion.div key="training" variants={fadeVariants} initial="initial" animate="animate" exit="exit" transition={fadeTransition} style={{ flex: 1 }}>
            <Training text={activeText} onUpdate={updateActive} onHome={goHome} />
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

// ─── Landing ─────────────────────────────────────────────────────────────────

function Landing({ texts, updateTexts, onStart }: {
  texts: SavedText[]
  updateTexts: (fn: (prev: SavedText[]) => SavedText[]) => void
  onStart: (id: string) => void
}) {
  const [inputText, setInputText] = useState('')
  const [inputTitle, setInputTitle] = useState('')
  const [language, setLanguage] = useState('en-US')

  const handleCreate = () => {
    if (!inputText.trim()) return
    const newText: SavedText = {
      id: generateId(),
      title: inputTitle.trim() || `Text ${texts.length + 1}`,
      text: inputText.trim(),
      language,
      day: 1,
      step: 0,
      lineMastery: {},
      completedDays: [],
      createdAt: Date.now(),
    }
    updateTexts(prev => [newText, ...prev])
    setInputText('')
    setInputTitle('')
    onStart(newText.id)
  }

  const handleDelete = (id: string) => {
    updateTexts(prev => prev.filter(t => t.id !== id))
  }

  return (
    <div style={css.container}>
      <FadeIn>
        <div style={{ ...css.header, marginTop: 40, marginBottom: 48 }}>
          <h1 style={{ ...css.title, fontSize: '2.5rem' }}>Skit Trainer</h1>
          <p style={{ ...css.subtitle, fontSize: '1.1rem' }}>Memorize anything in 3 days</p>
        </div>
      </FadeIn>

      <FadeIn delay={0.1}>
        <div style={{ ...css.card, marginBottom: 32 }}>
          <div style={{ marginBottom: 16 }}>
            <label style={css.label}>Title (optional)</label>
            <input
              value={inputTitle}
              onChange={e => setInputTitle(e.target.value)}
              placeholder="My poem, speech, monologue..."
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={css.label}>Text to memorize</label>
            <textarea
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder="Paste your text here..."
              rows={8}
              style={{ minHeight: 180 }}
            />
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'end', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 160 }}>
              <label style={css.label}>Language (for TTS)</label>
              <select value={language} onChange={e => setLanguage(e.target.value)}>
                {LANGUAGES.map(l => (
                  <option key={l.code} value={l.code}>{l.label}</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleCreate}
              disabled={!inputText.trim()}
              style={{
                ...css.btn,
                ...css.btnPrimary,
                opacity: inputText.trim() ? 1 : 0.4,
                minWidth: 160,
              }}
            >
              Start Training
            </button>
          </div>
        </div>
      </FadeIn>

      {texts.length > 0 && (
        <FadeIn delay={0.2}>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: 12, color: 'var(--text-muted)' }}>
              Your Texts
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {texts.map(t => {
                const lines = splitLines(t.text)
                const mastery = getMasteryPercent(t.lineMastery, lines.length)
                const allDone = t.completedDays.length >= 3
                return (
                  <div
                    key={t.id}
                    style={{
                      ...css.card,
                      padding: '16px 20px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 16,
                      cursor: 'pointer',
                    }}
                    onClick={() => onStart(t.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => e.key === 'Enter' && onStart(t.id)}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.title}
                      </div>
                      <div style={{ display: 'flex', gap: 12, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        <span>{lines.length} lines</span>
                        <span>Day {Math.min(t.day, 3)}/3</span>
                        {mastery > 0 && <span style={{ color: allDone ? 'var(--success)' : 'var(--accent)' }}>{mastery}% mastered</span>}
                      </div>
                      <div style={{ marginTop: 8 }}>
                        <ProgressBar value={allDone ? 100 : ((t.day - 1) / 3) * 100} color={allDone ? 'var(--success)' : 'var(--accent)'} />
                      </div>
                    </div>
                    <button
                      onClick={e => { e.stopPropagation(); handleDelete(t.id) }}
                      style={{ ...css.btn, ...css.btnSmall, color: 'var(--text-muted)', padding: '6px 10px', fontSize: '0.8rem' }}
                      title="Delete"
                    >
                      Delete
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        </FadeIn>
      )}

      <div style={{ marginTop: 'auto', padding: '32px 0', textAlign: 'center' }}>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          All data stored locally in your browser.
        </p>
      </div>
    </div>
  )
}

// ─── Training ────────────────────────────────────────────────────────────────

function Training({ text, onUpdate, onHome }: {
  text: SavedText
  onUpdate: (patch: Partial<SavedText>) => void
  onHome: () => void
}) {
  const lines = splitLines(text.text)
  const isRtl = RTL_LANGS.includes(text.language)
  const allDone = text.completedDays.length >= 3

  const setStep = (step: number) => onUpdate({ step })

  const completeDay = (day: number) => {
    const completed = text.completedDays.includes(day) ? text.completedDays : [...text.completedDays, day]
    const nextDay = day < 3 ? day + 1 : day
    onUpdate({ completedDays: completed, day: nextDay, step: 0 })
  }

  // If all days done, show review
  if (allDone) {
    return <ReviewView text={text} lines={lines} isRtl={isRtl} onUpdate={onUpdate} onHome={onHome} />
  }

  return (
    <div style={css.container} dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={onHome} style={{ ...css.btn, ...css.btnSmall, ...css.btnSecondary }}>
          Back
        </button>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{text.title}</div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Day {text.day} of 3</div>
        </div>
      </div>

      <ProgressBar value={(text.step / (text.day === 1 ? 4 : text.day === 2 ? 4 : 3)) * 100} />
      <div style={{ height: 20 }} />

      <AnimatePresence mode="wait">
        <motion.div key={`${text.day}-${text.step}`} variants={fadeVariants} initial="initial" animate="animate" exit="exit" transition={fadeTransition}>
          {text.day === 1 && <Day1 text={text} lines={lines} step={text.step} setStep={setStep} completeDay={() => completeDay(1)} isRtl={isRtl} />}
          {text.day === 2 && <Day2 text={text} lines={lines} step={text.step} setStep={setStep} completeDay={() => completeDay(2)} onUpdate={onUpdate} isRtl={isRtl} />}
          {text.day === 3 && <Day3 text={text} lines={lines} step={text.step} setStep={setStep} completeDay={() => completeDay(3)} onUpdate={onUpdate} isRtl={isRtl} />}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

// ─── Day 1: Familiarize ──────────────────────────────────────────────────────

function Day1({ text, lines, step, setStep, completeDay, isRtl }: {
  text: SavedText; lines: string[]; step: number; setStep: (s: number) => void; completeDay: () => void; isRtl: boolean
}) {
  const totalSteps = 4

  if (step === 0) {
    return (
      <DayIntro
        day={1}
        title="Familiarize"
        description="Today you'll read, listen, and start chunking the text into memory."
        onStart={() => setStep(1)}
      />
    )
  }

  return (
    <div>
      <StepIndicator current={step - 1} total={totalSteps} />

      {step === 1 && (
        <Step title="Read Through" subtitle="Read the entire text carefully. Notice patterns and structure.">
          <TextDisplay lines={lines} isRtl={isRtl} />
          <NavButtons onNext={() => setStep(2)} />
        </Step>
      )}

      {step === 2 && (
        <ListenStep lines={lines} lang={text.language} isRtl={isRtl} onNext={() => setStep(3)} />
      )}

      {step === 3 && (
        <ReadAlongStep lines={lines} lang={text.language} isRtl={isRtl} onNext={() => setStep(4)} />
      )}

      {step === 4 && (
        <ChunkStep lines={lines} isRtl={isRtl} onComplete={completeDay} />
      )}
    </div>
  )
}

// ─── Day 2: Reinforce ────────────────────────────────────────────────────────

function Day2({ text, lines, step, setStep, completeDay, onUpdate, isRtl }: {
  text: SavedText; lines: string[]; step: number; setStep: (s: number) => void; completeDay: () => void; onUpdate: (p: Partial<SavedText>) => void; isRtl: boolean
}) {
  const totalSteps = 4

  if (step === 0) {
    return (
      <DayIntro
        day={2}
        title="Reinforce"
        description="Time to test your memory with gaps, first letters, and recall challenges."
        onStart={() => setStep(1)}
      />
    )
  }

  return (
    <div>
      <StepIndicator current={step - 1} total={totalSteps} />

      {step === 1 && (
        <TimedReadStep lines={lines} isRtl={isRtl} onNext={() => setStep(2)} />
      )}

      {step === 2 && (
        <FillGapsStep lines={lines} isRtl={isRtl} onNext={() => setStep(3)} />
      )}

      {step === 3 && (
        <FirstLettersStep lines={lines} isRtl={isRtl} onNext={() => setStep(4)} />
      )}

      {step === 4 && (
        <SpeakItStep lines={lines} isRtl={isRtl} onComplete={completeDay} onUpdate={onUpdate} savedText={text} />
      )}
    </div>
  )
}

// ─── Day 3: Master ───────────────────────────────────────────────────────────

function Day3({ text, lines, step, setStep, completeDay, onUpdate, isRtl }: {
  text: SavedText; lines: string[]; step: number; setStep: (s: number) => void; completeDay: () => void; onUpdate: (p: Partial<SavedText>) => void; isRtl: boolean
}) {
  const totalSteps = 3

  if (step === 0) {
    return (
      <DayIntro
        day={3}
        title="Master"
        description="The final test. Recall everything from memory and prove your mastery."
        onStart={() => setStep(1)}
      />
    )
  }

  return (
    <div>
      <StepIndicator current={step - 1} total={totalSteps} />

      {step === 1 && (
        <FullRecallStep lines={lines} isRtl={isRtl} onNext={() => setStep(2)} />
      )}

      {step === 2 && (
        <RSVPStep lines={lines} onNext={() => setStep(3)} />
      )}

      {step === 3 && (
        <FinalTestStep lines={lines} isRtl={isRtl} onComplete={completeDay} onUpdate={onUpdate} savedText={text} />
      )}
    </div>
  )
}

// ─── Review ──────────────────────────────────────────────────────────────────

function ReviewView({ text, lines, isRtl, onUpdate, onHome }: {
  text: SavedText; lines: string[]; isRtl: boolean; onUpdate: (p: Partial<SavedText>) => void; onHome: () => void
}) {
  const mastery = getMasteryPercent(text.lineMastery, lines.length)
  const [showWeak, setShowWeak] = useState(false)

  const weakLines = lines.map((l, i) => ({ line: l, index: i })).filter(({ index }) => {
    const m = text.lineMastery[index]
    return m !== 'perfect'
  })

  const handleReset = () => {
    onUpdate({ day: 1, step: 0, lineMastery: {}, completedDays: [] })
  }

  return (
    <div style={css.container} dir={isRtl ? 'rtl' : 'ltr'}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button onClick={onHome} style={{ ...css.btn, ...css.btnSmall, ...css.btnSecondary }}>
          Back
        </button>
        <div style={{ flex: 1, fontWeight: 600, fontSize: '1.1rem' }}>{text.title}</div>
      </div>

      <FadeIn>
        <div style={{ ...css.card, textAlign: 'center', marginBottom: 24, padding: 40 }}>
          {mastery >= 80 ? (
            <>
              <div style={{ fontSize: '3rem', marginBottom: 12 }}>Mastered!</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--success)' }}>{mastery}%</div>
            </>
          ) : (
            <>
              <div style={{ fontSize: '1.5rem', marginBottom: 12 }}>Keep Practicing</div>
              <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--accent)' }}>{mastery}%</div>
            </>
          )}
          <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>Overall mastery</p>
        </div>
      </FadeIn>

      <FadeIn delay={0.1}>
        <div style={{ ...css.card, marginBottom: 16 }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 16 }}>Line by Line Results</h3>
          {lines.map((line, i) => {
            const m = text.lineMastery[i]
            const color = m === 'perfect' ? 'var(--success)' : m === 'close' ? 'var(--yellow)' : 'var(--error)'
            const bg = m === 'perfect' ? 'var(--success-dim)' : m === 'close' ? 'var(--yellow-dim)' : 'var(--error-dim)'
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: bg, marginBottom: 4 }}>
                <span style={{ ...css.lineNum, color }}>{i + 1}</span>
                <span style={{ flex: 1, fontSize: '0.95rem' }}>{line}</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color, textTransform: 'uppercase', flexShrink: 0 }}>
                  {m || 'unrated'}
                </span>
              </div>
            )
          })}
        </div>
      </FadeIn>

      <FadeIn delay={0.15}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {weakLines.length > 0 && (
            <button onClick={() => setShowWeak(!showWeak)} style={{ ...css.btn, ...css.btnSecondary }}>
              {showWeak ? 'Hide' : 'Practice'} Weak Lines ({weakLines.length})
            </button>
          )}
          <button onClick={handleReset} style={{ ...css.btn, ...css.btnSecondary }}>
            Start Over
          </button>
          <button onClick={onHome} style={{ ...css.btn, ...css.btnPrimary }}>
            New Text
          </button>
        </div>
      </FadeIn>

      {showWeak && weakLines.length > 0 && (
        <FadeIn>
          <div style={{ ...css.card, marginTop: 16 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 16 }}>Weak Lines — Practice</h3>
            {weakLines.map(({ line, index }) => (
              <RevealLine key={index} lineNum={index + 1} text={line} />
            ))}
          </div>
        </FadeIn>
      )}
    </div>
  )
}

// ─── Step Components ─────────────────────────────────────────────────────────

function DayIntro({ day, title, description, onStart }: { day: number; title: string; description: string; onStart: () => void }) {
  return (
    <div style={{ ...css.card, textAlign: 'center', padding: 48 }}>
      <div style={{ fontSize: '0.85rem', color: 'var(--accent)', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Day {day}
      </div>
      <h2 style={{ fontSize: '1.8rem', fontWeight: 700, marginBottom: 12 }}>{title}</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: 32, maxWidth: 400, margin: '0 auto 32px' }}>{description}</p>
      <button onClick={onStart} style={{ ...css.btn, ...css.btnPrimary }}>
        Begin
      </button>
    </div>
  )
}

function Step({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div>
      <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: 4 }}>{title}</h3>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 20 }}>{subtitle}</p>
      {children}
    </div>
  )
}

function TextDisplay({ lines, isRtl, highlightLine = -1 }: { lines: string[]; isRtl: boolean; highlightLine?: number }) {
  return (
    <div style={{ ...css.card, marginBottom: 16 }}>
      {lines.map((line, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            padding: '8px 12px',
            borderRadius: 'var(--radius-sm)',
            background: highlightLine === i ? 'var(--accent-dim)' : 'transparent',
            transition: 'background 0.3s',
            direction: isRtl ? 'rtl' : 'ltr',
          }}
        >
          <span style={css.lineNum}>{i + 1}</span>
          <span style={{ flex: 1, fontSize: '1.05rem', lineHeight: 1.7 }}>{line}</span>
        </div>
      ))}
    </div>
  )
}

function NavButtons({ onNext, onBack, nextLabel = 'Next Step', backLabel = 'Previous' }: {
  onNext?: () => void; onBack?: () => void; nextLabel?: string; backLabel?: string
}) {
  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
      {onBack && <button onClick={onBack} style={{ ...css.btn, ...css.btnSecondary }}>{backLabel}</button>}
      {onNext && <button onClick={onNext} style={{ ...css.btn, ...css.btnPrimary }}>{nextLabel}</button>}
    </div>
  )
}

function RevealLine({ lineNum, text }: { lineNum: number; text: string }) {
  const [revealed, setRevealed] = useState(false)
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 8,
        padding: '10px 12px',
        borderRadius: 'var(--radius-sm)',
        background: revealed ? 'transparent' : 'var(--surface-hover)',
        cursor: 'pointer',
        marginBottom: 4,
        transition: 'background 0.2s',
      }}
      onClick={() => setRevealed(!revealed)}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === ' ' && setRevealed(!revealed)}
    >
      <span style={css.lineNum}>{lineNum}</span>
      <span style={{ flex: 1, fontSize: '1rem', filter: revealed ? 'none' : 'blur(8px)', transition: 'filter 0.3s', userSelect: revealed ? 'auto' : 'none' }}>
        {text}
      </span>
      {!revealed && (
        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', flexShrink: 0 }}>tap to reveal</span>
      )}
    </div>
  )
}

// ─── Day 1 Steps ─────────────────────────────────────────────────────────────

function ListenStep({ lines, lang, isRtl, onNext }: { lines: string[]; lang: string; isRtl: boolean; onNext: () => void }) {
  const [activeLine, setActiveLine] = useState(-1)
  const [playing, setPlaying] = useState(false)
  const cancelRef = useRef(false)

  const play = async () => {
    cancelRef.current = false
    setPlaying(true)
    for (let i = 0; i < lines.length; i++) {
      if (cancelRef.current) break
      setActiveLine(i)
      await speakLine(lines[i], lang)
      await new Promise(r => setTimeout(r, 300))
    }
    setActiveLine(-1)
    setPlaying(false)
  }

  const stop = () => {
    cancelRef.current = true
    stopSpeech()
    setPlaying(false)
    setActiveLine(-1)
  }

  useEffect(() => () => { cancelRef.current = true; stopSpeech() }, [])

  return (
    <Step title="Listen" subtitle="Listen to each line being read aloud. Follow along.">
      <TextDisplay lines={lines} isRtl={isRtl} highlightLine={activeLine} />
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={playing ? stop : play} style={{ ...css.btn, ...css.btnSecondary }}>
          {playing ? 'Stop' : 'Play'}
        </button>
        <button onClick={() => { stop(); onNext() }} style={{ ...css.btn, ...css.btnPrimary }}>Next Step</button>
      </div>
    </Step>
  )
}

function ReadAlongStep({ lines, lang, isRtl, onNext }: { lines: string[]; lang: string; isRtl: boolean; onNext: () => void }) {
  const [activeLine, setActiveLine] = useState(-1)
  const [playing, setPlaying] = useState(false)
  const cancelRef = useRef(false)

  const play = async () => {
    cancelRef.current = false
    setPlaying(true)
    for (let i = 0; i < lines.length; i++) {
      if (cancelRef.current) break
      setActiveLine(i)
      await speakLine(lines[i], lang)
      await new Promise(r => setTimeout(r, 200))
    }
    setActiveLine(-1)
    setPlaying(false)
  }

  const stop = () => {
    cancelRef.current = true
    stopSpeech()
    setPlaying(false)
    setActiveLine(-1)
  }

  useEffect(() => () => { cancelRef.current = true; stopSpeech() }, [])

  return (
    <Step title="Read Along" subtitle="Read along as each line is spoken. Match the rhythm and pacing.">
      <TextDisplay lines={lines} isRtl={isRtl} highlightLine={activeLine} />
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={playing ? stop : play} style={{ ...css.btn, ...css.btnSecondary }}>
          {playing ? 'Stop' : 'Play & Read Along'}
        </button>
        <button onClick={() => { stop(); onNext() }} style={{ ...css.btn, ...css.btnPrimary }}>Next Step</button>
      </div>
    </Step>
  )
}

function ChunkStep({ lines, isRtl, onComplete }: { lines: string[]; isRtl: boolean; onComplete: () => void }) {
  const chunks = chunkArray(lines, 3)
  const [currentChunk, setCurrentChunk] = useState(0)
  const [revealed, setRevealed] = useState(false)

  const chunk = chunks[currentChunk]
  const isLast = currentChunk === chunks.length - 1

  return (
    <Step title="Chunk It" subtitle={`Practice chunk ${currentChunk + 1} of ${chunks.length}. Read it, then try to recall without looking.`}>
      <div style={css.card}>
        {!revealed ? (
          <div>
            {chunk.map((line, i) => {
              const globalIdx = currentChunk * 3 + i
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', padding: '8px 12px', direction: isRtl ? 'rtl' : 'ltr' }}>
                  <span style={css.lineNum}>{globalIdx + 1}</span>
                  <span style={{ flex: 1, fontSize: '1.05rem', lineHeight: 1.7 }}>{line}</span>
                </div>
              )
            })}
            <div style={{ textAlign: 'center', marginTop: 20 }}>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 12 }}>Read this chunk, then hide it and try to recite.</p>
              <button onClick={() => setRevealed(true)} style={{ ...css.btn, ...css.btnSecondary }}>
                Hide & Test Myself
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <p style={{ fontSize: '1.1rem', marginBottom: 8 }}>Can you recite chunk {currentChunk + 1}?</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Try to say it from memory, then tap below to check.</p>
            </div>
            <button
              onClick={() => setRevealed(false)}
              style={{ ...css.btn, ...css.btnSecondary, width: '100%', marginBottom: 8 }}
            >
              Reveal & Check
            </button>
            {isLast ? (
              <button onClick={onComplete} style={{ ...css.btn, ...css.btnPrimary, width: '100%' }}>
                Complete Day 1
              </button>
            ) : (
              <button onClick={() => { setCurrentChunk(c => c + 1); setRevealed(false) }} style={{ ...css.btn, ...css.btnPrimary, width: '100%' }}>
                Next Chunk
              </button>
            )}
          </div>
        )}
      </div>
    </Step>
  )
}

// ─── Day 2 Steps ─────────────────────────────────────────────────────────────

function TimedReadStep({ lines, isRtl, onNext }: { lines: string[]; isRtl: boolean; onNext: () => void }) {
  const [started, setStarted] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [done, setDone] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const start = () => {
    setStarted(true)
    const t0 = Date.now()
    timerRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - t0) / 1000)), 100)
  }

  const finish = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    setDone(true)
  }

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current) }, [])

  if (!started) {
    return (
      <Step title="Quick Read" subtitle="Read through the entire text as fast as you can. We'll time you.">
        <button onClick={start} style={{ ...css.btn, ...css.btnPrimary }}>Start Timer</button>
      </Step>
    )
  }

  if (done) {
    return (
      <Step title="Quick Read" subtitle="Nice work!">
        <div style={{ ...css.card, textAlign: 'center', padding: 32 }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--accent)' }}>
            {Math.floor(elapsed / 60)}:{(elapsed % 60).toString().padStart(2, '0')}
          </div>
          <p style={{ color: 'var(--text-muted)', marginTop: 8 }}>Time to read through</p>
        </div>
        <NavButtons onNext={onNext} />
      </Step>
    )
  }

  return (
    <Step title="Quick Read" subtitle={`Timer: ${Math.floor(elapsed / 60)}:${(elapsed % 60).toString().padStart(2, '0')}`}>
      <TextDisplay lines={lines} isRtl={isRtl} />
      <NavButtons onNext={finish} nextLabel="Done Reading" />
    </Step>
  )
}

function FillGapsStep({ lines, isRtl, onNext }: { lines: string[]; isRtl: boolean; onNext: () => void }) {
  const [pass, setPass] = useState(1)
  const percent = pass === 1 ? 0.2 : 0.4
  const [gapped, setGapped] = useState(() => lines.map(l => removeRandomWords(l, percent)))
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [checked, setChecked] = useState(false)

  const regenerate = (p: number) => {
    setGapped(lines.map(l => removeRandomWords(l, p)))
    setAnswers({})
    setChecked(false)
  }

  const handleCheck = () => setChecked(true)

  const allCorrect = checked && gapped.every((g, li) =>
    g.blanks.every(b => {
      const key = `${li}-${b.index}`
      const ans = (answers[key] ?? '').trim().toLowerCase()
      return ans === b.word.toLowerCase().replace(/[.,!?;:'"]/g, '')
    })
  )

  return (
    <Step title={`Fill the Gaps — Pass ${pass}`} subtitle={`${Math.round(percent * 100)}% of words removed. Type the missing words.`}>
      <div style={{ ...css.card, marginBottom: 16 }}>
        {gapped.map((g, li) => (
          <div key={li} style={{ display: 'flex', alignItems: 'flex-start', padding: '6px 12px', gap: 8, direction: isRtl ? 'rtl' : 'ltr' }}>
            <span style={css.lineNum}>{li + 1}</span>
            <div style={{ flex: 1, fontSize: '1rem', lineHeight: 2, display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
              {g.display.split(' ').map((word, wi) => {
                if (word === '____') {
                  const blank = g.blanks.find(b => {
                    // Find the n-th blank
                    const blanksBefore = g.display.split(' ').slice(0, wi).filter(w => w === '____').length
                    return b === g.blanks[blanksBefore]
                  })
                  const key = `${li}-${blank?.index ?? wi}`
                  const val = answers[key] ?? ''
                  const correct = checked && blank && val.trim().toLowerCase() === blank.word.toLowerCase().replace(/[.,!?;:'"]/g, '')
                  const wrong = checked && !correct
                  return (
                    <span key={wi} style={{ position: 'relative', display: 'inline-block' }}>
                      <input
                        value={val}
                        onChange={e => setAnswers(a => ({ ...a, [key]: e.target.value }))}
                        style={{
                          width: Math.max(60, (blank?.word.length ?? 4) * 11),
                          padding: '2px 6px',
                          fontSize: '0.95rem',
                          textAlign: 'center',
                          borderColor: checked ? (correct ? 'var(--success)' : 'var(--error)') : 'var(--border)',
                          background: checked ? (correct ? 'var(--success-dim)' : 'var(--error-dim)') : 'var(--surface)',
                          borderRadius: 'var(--radius-sm)',
                        }}
                        disabled={checked}
                        placeholder="..."
                      />
                      {wrong && blank && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--success)', display: 'block', textAlign: 'center' }}>
                          {blank.word}
                        </span>
                      )}
                    </span>
                  )
                }
                return <span key={wi}>{word} </span>
              })}
            </div>
          </div>
        ))}
      </div>

      {!checked ? (
        <NavButtons onNext={handleCheck} nextLabel="Check Answers" />
      ) : (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
          {pass === 1 ? (
            <button onClick={() => { setPass(2); regenerate(0.4) }} style={{ ...css.btn, ...css.btnPrimary }}>
              {allCorrect ? 'Pass 2 (Harder)' : 'Try Pass 2'}
            </button>
          ) : (
            <button onClick={onNext} style={{ ...css.btn, ...css.btnPrimary }}>Next Step</button>
          )}
        </div>
      )}
    </Step>
  )
}

function FirstLettersStep({ lines, isRtl, onNext }: { lines: string[]; isRtl: boolean; onNext: () => void }) {
  const [revealedLines, setRevealedLines] = useState<Set<number>>(new Set())

  const toggle = (i: number) => {
    setRevealedLines(prev => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  return (
    <Step title="First Letters" subtitle="Each word shows only its first letter. Try to recall the full text. Tap a line to reveal.">
      <div style={{ ...css.card, marginBottom: 16 }}>
        {lines.map((line, i) => {
          const revealed = revealedLines.has(i)
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                direction: isRtl ? 'rtl' : 'ltr',
                background: revealed ? 'var(--success-dim)' : 'transparent',
                transition: 'background 0.2s',
              }}
              onClick={() => toggle(i)}
              role="button"
              tabIndex={0}
              onKeyDown={e => e.key === ' ' && toggle(i)}
            >
              <span style={css.lineNum}>{i + 1}</span>
              <span style={{ flex: 1, fontSize: '1.05rem', lineHeight: 1.7, fontFamily: revealed ? 'inherit' : 'monospace', letterSpacing: revealed ? 'normal' : '0.05em' }}>
                {revealed ? line : getFirstLetters(line)}
              </span>
            </div>
          )
        })}
      </div>
      <NavButtons onNext={onNext} />
    </Step>
  )
}

function SpeakItStep({ lines, isRtl, onComplete, onUpdate: _onUpdate, savedText: _savedText }: {
  lines: string[]; isRtl: boolean; onComplete: () => void; onUpdate: (p: Partial<SavedText>) => void; savedText: SavedText
}) {
  const chunks = chunkArray(lines, 3)
  const [currentChunk, setCurrentChunk] = useState(0)
  const [phase, setPhase] = useState<'show' | 'hidden'>('show')
  const [countdown, setCountdown] = useState(3)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const chunk = chunks[currentChunk]
  const isLast = currentChunk === chunks.length - 1

  useEffect(() => {
    if (phase === 'show') {
      setCountdown(3)
      timerRef.current = setInterval(() => {
        setCountdown(c => {
          if (c <= 1) {
            if (timerRef.current) clearInterval(timerRef.current)
            setPhase('hidden')
            return 0
          }
          return c - 1
        })
      }, 1000)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [phase, currentChunk])

  const nextChunk = () => {
    if (isLast) {
      onComplete()
    } else {
      setCurrentChunk(c => c + 1)
      setPhase('show')
    }
  }

  return (
    <Step title="Speak It" subtitle={`Chunk ${currentChunk + 1} of ${chunks.length}. Watch, then recite from memory.`}>
      <div style={{ ...css.card, minHeight: 200 }}>
        {phase === 'show' ? (
          <div>
            <div style={{ textAlign: 'center', color: 'var(--accent)', fontWeight: 600, marginBottom: 12, fontSize: '0.85rem' }}>
              Memorize — hiding in {countdown}s
            </div>
            {chunk.map((line, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', padding: '8px 12px', direction: isRtl ? 'rtl' : 'ltr' }}>
                <span style={css.lineNum}>{currentChunk * 3 + i + 1}</span>
                <span style={{ flex: 1, fontSize: '1.05rem', lineHeight: 1.7 }}>{line}</span>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <p style={{ fontSize: '1.1rem', marginBottom: 8 }}>Now recite chunk {currentChunk + 1} from memory.</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 20 }}>Tap to reveal and check yourself.</p>
            {chunk.map((line, i) => (
              <RevealLine key={i} lineNum={currentChunk * 3 + i + 1} text={line} />
            ))}
          </div>
        )}
      </div>
      {phase === 'hidden' && (
        <NavButtons onNext={nextChunk} nextLabel={isLast ? 'Complete Day 2' : 'Next Chunk'} />
      )}
    </Step>
  )
}

// ─── Day 3 Steps ─────────────────────────────────────────────────────────────

function FullRecallStep({ lines, isRtl, onNext }: { lines: string[]; isRtl: boolean; onNext: () => void }) {
  return (
    <Step title="Full Recall" subtitle="The entire text is hidden. Try to recite everything from memory. Tap each line to check.">
      <div style={{ ...css.card, marginBottom: 16 }}>
        {lines.map((line, i) => (
          <div key={i} style={{ direction: isRtl ? 'rtl' : 'ltr' }}>
            <RevealLine lineNum={i + 1} text={line} />
          </div>
        ))}
      </div>
      <NavButtons onNext={onNext} />
    </Step>
  )
}

function RSVPStep({ lines, onNext }: { lines: string[]; onNext: () => void }) {
  const words = lines.join(' ').split(/\s+/)
  const [running, setRunning] = useState(false)
  const [wordIndex, setWordIndex] = useState(0)
  const [speed, setSpeed] = useState(300) // ms per word
  const [done, setDone] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const start = () => {
    setWordIndex(0)
    setDone(false)
    setRunning(true)
  }

  const stop = () => {
    setRunning(false)
    if (timerRef.current) clearInterval(timerRef.current)
  }

  useEffect(() => {
    if (!running) return
    timerRef.current = setInterval(() => {
      setWordIndex(i => {
        if (i >= words.length - 1) {
          setRunning(false)
          setDone(true)
          return i
        }
        return i + 1
      })
    }, speed)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [running, speed, words.length])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === ' ' && !e.target || (e.target instanceof HTMLElement && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA')) {
        e.preventDefault()
        running ? stop() : start()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  })

  return (
    <Step title="Speed Round" subtitle="Words flash one at a time. Test your recognition speed.">
      <div style={{ ...css.card, textAlign: 'center', minHeight: 200, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        {!running && !done && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <label style={{ ...css.label, textAlign: 'center' }}>Speed (ms per word)</label>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                {[500, 300, 200, 100].map(s => (
                  <button
                    key={s}
                    onClick={() => setSpeed(s)}
                    style={{
                      ...css.btn,
                      ...css.btnSmall,
                      ...(speed === s ? css.btnPrimary : css.btnSecondary),
                    }}
                  >
                    {s}ms
                  </button>
                ))}
              </div>
            </div>
            <button onClick={start} style={{ ...css.btn, ...css.btnPrimary }}>
              Start (or Space)
            </button>
          </div>
        )}
        {running && (
          <div>
            <div style={{ fontSize: '2.5rem', fontWeight: 700, minHeight: 60 }}>
              {words[wordIndex]}
            </div>
            <ProgressBar value={(wordIndex / words.length) * 100} />
            <button onClick={stop} style={{ ...css.btn, ...css.btnSmall, ...css.btnSecondary, marginTop: 16 }}>
              Pause
            </button>
          </div>
        )}
        {done && (
          <div>
            <div style={{ fontSize: '1.5rem', marginBottom: 16 }}>Complete!</div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
              <button onClick={start} style={{ ...css.btn, ...css.btnSecondary }}>Again</button>
              <button onClick={onNext} style={{ ...css.btn, ...css.btnPrimary }}>Next Step</button>
            </div>
          </div>
        )}
      </div>
    </Step>
  )
}

function FinalTestStep({ lines, isRtl, onComplete, onUpdate, savedText }: {
  lines: string[]; isRtl: boolean; onComplete: () => void; onUpdate: (p: Partial<SavedText>) => void; savedText: SavedText
}) {
  const [phase, setPhase] = useState<'recite' | 'rate'>('recite')
  const [ratings, setRatings] = useState<Record<number, 'perfect' | 'close' | 'missed'>>({})

  const allRated = lines.every((_, i) => ratings[i] !== undefined)

  const handleComplete = () => {
    onUpdate({ lineMastery: { ...savedText.lineMastery, ...ratings } })
    onComplete()
  }

  if (phase === 'recite') {
    return (
      <Step title="Final Test" subtitle="Recite the entire text from memory. When ready, reveal and rate yourself.">
        <div style={{ ...css.card, textAlign: 'center', padding: '48px 24px', marginBottom: 16 }}>
          <p style={{ fontSize: '1.2rem', marginBottom: 8 }}>Close your eyes and recite.</p>
          <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>When you're done, reveal the text and rate each line.</p>
          <button onClick={() => setPhase('rate')} style={{ ...css.btn, ...css.btnPrimary }}>
            Reveal & Rate
          </button>
        </div>
      </Step>
    )
  }

  return (
    <Step title="Rate Your Recall" subtitle="How did you do on each line?">
      <div style={{ ...css.card, marginBottom: 16 }}>
        {lines.map((line, i) => {
          const rating = ratings[i]
          return (
            <div key={i} style={{ padding: '12px', borderBottom: i < lines.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 8, direction: isRtl ? 'rtl' : 'ltr' }}>
                <span style={css.lineNum}>{i + 1}</span>
                <span style={{ flex: 1, fontSize: '1rem', lineHeight: 1.7 }}>{line}</span>
              </div>
              <div style={{ display: 'flex', gap: 6, paddingLeft: 40 }}>
                {(['perfect', 'close', 'missed'] as const).map(r => {
                  const active = rating === r
                  const color = r === 'perfect' ? 'var(--success)' : r === 'close' ? 'var(--yellow)' : 'var(--error)'
                  const bg = r === 'perfect' ? 'var(--success-dim)' : r === 'close' ? 'var(--yellow-dim)' : 'var(--error-dim)'
                  return (
                    <button
                      key={r}
                      onClick={() => setRatings(prev => ({ ...prev, [i]: r }))}
                      style={{
                        ...css.btn,
                        ...css.btnSmall,
                        fontSize: '0.75rem',
                        background: active ? bg : 'transparent',
                        color: active ? color : 'var(--text-muted)',
                        border: `1px solid ${active ? color : 'var(--border)'}`,
                        textTransform: 'capitalize',
                      }}
                    >
                      {r}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
      <NavButtons
        onNext={allRated ? handleComplete : undefined}
        nextLabel="See Results"
      />
      {!allRated && (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: 8 }}>
          Rate every line to continue
        </p>
      )}
    </Step>
  )
}
