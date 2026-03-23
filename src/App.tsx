import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

/* ═══════════════════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════════════════ */

interface Line { speaker: string; text: string }
interface Chunk { id: number; label: string; lines: Line[] }
interface MacroSection { id: string; label: string; chunks: number[] }
interface Skit {
  id: string; title: string; subtitle: string; speakers: string[]
  chunks: Chunk[]; macroSections: MacroSection[]; createdAt: string
}
interface SkitProgress { chunkMastery: Record<number, number> }
type Tool = 'read' | 'fill' | 'firstletter' | 'rsvp'
type View = 'library' | 'import' | 'practice'

/* ═══════════════════════════════════════════════════════════════════════════
   SEED SKITS
   ═══════════════════════════════════════════════════════════════════════════ */

const SEED_SKITS: Skit[] = [
  {
    id: 'prodigal-son', title: 'The Prodigal Son',
    subtitle: 'Rudyard Kipling — a returning son\'s defiant reflection',
    speakers: [''],
    chunks: [
      { id: 1, label: 'The Return', lines: [
        { speaker: '', text: 'Here come I to my own again' },
        { speaker: '', text: 'Fed, forgiven, and known again' },
        { speaker: '', text: 'Claimed by bone of my bone again' },
        { speaker: '', text: 'And cheered by flesh of my flesh' },
        { speaker: '', text: 'The fatted calf is dressed for me' },
        { speaker: '', text: 'but the husks have greater zest for me' },
        { speaker: '', text: 'I think my pigs will be best for me' },
        { speaker: '', text: "So I'm off to the yards afresh" },
      ]},
      { id: 2, label: 'The Swine\'s Comfort', lines: [
        { speaker: '', text: 'I never was refined, you see' },
        { speaker: '', text: "And it weighs on my brother's mind, you see" },
        { speaker: '', text: "But there's no reproach among swine, d'you see" },
        { speaker: '', text: 'For being a bit of a swine' },
        { speaker: '', text: "So I'm off with wallet and staff to eat" },
        { speaker: '', text: 'The bread that is three parts chaff to wheat,' },
        { speaker: '', text: "But glory be! - there's a laugh to it" },
        { speaker: '', text: "Which isn't the case when we dine" },
      ]},
      { id: 3, label: 'Family Judgement', lines: [
        { speaker: '', text: 'My father glooms and advises me' },
        { speaker: '', text: 'My brother sulks and despises me' },
        { speaker: '', text: 'And mother catechizes me' },
        { speaker: '', text: 'Till I want to go out and swear' },
        { speaker: '', text: "And, in spite of the butler's gravity" },
        { speaker: '', text: 'I know that the servants have it I' },
        { speaker: '', text: 'Am a monster of moral depravity' },
        { speaker: '', text: "And I'm damned if I think it's fair!" },
      ]},
      { id: 4, label: 'The Defense', lines: [
        { speaker: '', text: 'I wasted my substance, I know I did' },
        { speaker: '', text: 'On riotous living, so I did' },
        { speaker: '', text: "But there's nothing on record to show I did" },
        { speaker: '', text: 'Worse than my betters have done' },
        { speaker: '', text: 'They talk of the money I spent out there' },
        { speaker: '', text: 'They hint at the pace I went out there' },
        { speaker: '', text: 'But they all forget I was sent out there' },
        { speaker: '', text: "Alone as a rich man's son" },
      ]},
      { id: 5, label: 'Hard-Won Wisdom', lines: [
        { speaker: '', text: 'So I was a mark for plunder at once' },
        { speaker: '', text: 'and lost my cash - can you wonder - at once' },
        { speaker: '', text: "But I didn't give up and knock under at once" },
        { speaker: '', text: 'I worked in the yard for a spell' },
        { speaker: '', text: 'Where I spent my nights and days with hogs' },
        { speaker: '', text: 'And shared their milk and maize with hogs' },
        { speaker: '', text: "Till, I guess, I have learned what pays with hogs" },
        { speaker: '', text: 'And I have that knowledge to sell' },
      ]},
      { id: 6, label: 'The Departure', lines: [
        { speaker: '', text: 'So back I go to my job again' },
        { speaker: '', text: 'Not so easy to rob again' },
        { speaker: '', text: 'Not quite so ready to sob again' },
        { speaker: '', text: "On any neck that's around" },
        { speaker: '', text: "I'm leaving, Pater, goodbye to you!" },
        { speaker: '', text: "Go bless you, Mater, I'll write to you!" },
        { speaker: '', text: "I wouldn't be impolite to you," },
        { speaker: '', text: 'But, brother, you are a hound!' },
      ]},
    ],
    macroSections: [
      { id: 'all', label: 'Full Poem', chunks: [1,2,3,4,5,6] },
      { id: 's1', label: 'Part 1', chunks: [1,2] },
      { id: 's2', label: 'Part 2', chunks: [3,4] },
      { id: 's3', label: 'Part 3', chunks: [5,6] },
    ],
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'smoking', title: 'Smoking on a Plane',
    subtitle: "A monologue about freedom, ashtrays, and Sammie",
    speakers: ['GUY', 'FA'],
    chunks: [
      { id: 1, label: 'The Opener', lines: [
        { speaker: 'FA', text: "Oh, sir. There's no smoking on airplanes." },
        { speaker: 'GUY', text: "I know. Isn't that wild? Don't worry about it. I'll be quick." },
      ]},
      { id: 2, label: 'The FAA Threat', lines: [
        { speaker: 'FA', text: "Sir, if you don't put that out, I'm going to have to report you to the FAA." },
        { speaker: 'GUY', text: "Sammie — it's Sammie, right? Do you know when the first commercial flight went smokeless, Sammie?" },
        { speaker: 'FA', text: 'No.' },
      ]},
      { id: 3, label: '1973, Moon & Tombstone', lines: [
        { speaker: 'GUY', text: "1973. You know what else happened in 1973? We went to the moon. Now look at us. We can't smoke, and we stopped going to the moon. Coincidence? I think not. Look at this. See that little metal rectangle? It's a sealed-over ashtray, a remnant of a better time. But they welded it shut. That's not an armrest, Sammie. That's a tombstone. For freedom." },
      ]},
      { id: 4, label: 'Liquids, Shoes, Rick', lines: [
        { speaker: 'GUY', text: "It starts with ashtrays. Then it's liquids over 3.4 ounces. And just when we've been brainwashed into believing a bottle of water will lead to the next 911, they're making you take off your shoes like you're entering a Japanese temple, except there's no peace, there's no garden. There's just an overweight guy named Rick waving a metal detector wand over your belt buckle." },
      ]},
      { id: 5, label: 'Deodorant Sandwich', lines: [
        { speaker: 'GUY', text: "And now you can't do one damn thing without someone reporting you to the Department of Homeland Security. I mean, I had to put my deodorant in a Ziploc bag. A Ziploc bag, Sammie. Like a sandwich. They're treating my personal hygiene like a sandwich. And for what? So that some algorithm can flag me because I bought a one-way ticket? I buy everything one-way. That's how I live my life. Forward. Always forward." },
      ]},
      { id: 6, label: 'Proud Tradition', lines: [
        { speaker: 'FA', text: "Sir, I really need you to—" },
        { speaker: 'GUY', text: "I remember back in the day when you got on a plane and you knew you were in for a good time. A little smoking, a little drinking, and the stewardesses. You come from a proud tradition, Sammie. Flight attendants used to hand you a warm towel, a cocktail, and a cigarette. Now you hand people a bag of peanuts and an apology. And I can't even open the damn bag of peanuts cause Mr. Brown is deathly allergic to them. But I want you to know that it's not your fault, Sammie. That's the system... But we don't have to take it." },
      ]},
      { id: 7, label: 'The Heroes', lines: [
        { speaker: 'GUY', text: "Like Henry David Thoreau and Rosa Parks and David Lee Roth when he left Van Halen, we can say enough. Enough of this farce. Enough playing by their rules." },
      ]},
      { id: 8, label: '30,000 Feet', lines: [
        { speaker: 'GUY', text: "And when you and I are old, Sammie — and we will get old — we can look back on this moment. Thirty thousand feet above God's green earth. And we can say: we smoked one. We smoked one, for America!" },
      ]},
      { id: 9, label: 'The Drag & Punchline', lines: [
        { speaker: 'GUY', text: '(takes a long drag) (beat)' },
        { speaker: 'FA', text: '...Can I get a drag of that?' },
      ]},
    ],
    macroSections: [
      { id: 'all', label: 'Full Skit', chunks: [1,2,3,4,5,6,7,8,9] },
      { id: 'm1', label: 'Act I: Setup', chunks: [1,2,3] },
      { id: 'm2', label: 'Act II: Rant', chunks: [4,5] },
      { id: 'm3', label: 'Act III: Rally', chunks: [6,7,8] },
      { id: 'm4', label: 'Finale', chunks: [9] },
    ],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'bubble', title: 'Here Comes Another Bubble',
    subtitle: "A Billy Joel parody — Silicon Valley's greatest hits",
    speakers: ['PERFORMER'],
    chunks: [
      { id: 1, label: 'Verse 1', lines: [
        { speaker: 'PERFORMER', text: "Got me an M.L. degree from Stanford, class of GPT. Moved out to the Mission, full of dreams and ambition. Left my internship at Google Brain, thought I'd train the next big thing. Made a model, kind of mid — called it Jarvis, raised a bid." },
        { speaker: 'PERFORMER', text: "Startup with no revenue, raise a hundred million too. Put AI and crypto stuff, now it's finally dumb enough. Happy days are here again — Elon Musk, Sam Altman. Time to write a business plan, so I can be like those guys." },
      ]},
      { id: 2, label: 'Chorus 1', lines: [
        { speaker: 'PERFORMER', text: "Here comes another bubble! It's a monster rally, all around the valley. Demos filled with sleight of hand, AI wrappers barely stand. But if the hype is big enough, no one asks you to do stuff. Let's yell pivot, higher, fast — bail out, just outlast." },
      ]},
      { id: 3, label: 'Verse 2', lines: [
        { speaker: 'PERFORMER', text: "Moonshot deck, 10x plan — VC thinks I'm the man. Chatbot, therapist, startup, nihilist. Pump injection, jailbreak scripts, CEO with ego trips." },
        { speaker: 'PERFORMER', text: "Press release with zero blue. Grok, is that true? Deepfake nudes, lawsuit wrecks — now it's stealing indie sets." },
      ]},
      { id: 4, label: 'Chorus 2', lines: [
        { speaker: 'PERFORMER', text: "Here comes another bubble! But VCs are backing, baby, let's get cracking." },
        { speaker: 'PERFORMER', text: "Tweet, tweet, tweet it all — tweet it if it's big or small. Tweet your threads on moral worth, tweet like you invented birth. Tweet like you're a prophet king, tweet your takes on everything. Tweet — even if you're wrong — won't you tweet about the song?" },
      ]},
      { id: 5, label: 'Verse 3', lines: [
        { speaker: 'PERFORMER', text: "Every party, all dudes — house rules, no shoes. All on Twitter all the time, cutting tapes instead of lines." },
        { speaker: 'PERFORMER', text: "Got to YC, still feel beige — all these guys are half my age. Twenty-nine, past my prime — I feel so behind the times." },
      ]},
      { id: 6, label: 'Chorus 3', lines: [
        { speaker: 'PERFORMER', text: "Here comes another bubble! In a year we swear — we'll all be billionaires." },
      ]},
      { id: 7, label: 'Verse 4', lines: [
        { speaker: 'PERFORMER', text: "Make yourself a million bucks — partly skill, mostly luck. Now you're rich enough to pay for a one-bed in Noe." },
        { speaker: 'PERFORMER', text: "Want a yard and extra room? Maybe join a polycule. Flip the written, flip the chores — open floor plan, open doors. Make yourself a billion bucks, pay for games and venture luck." },
      ]},
      { id: 8, label: 'Outro', lines: [
        { speaker: 'PERFORMER', text: "Buy a ranch, a private zoo — with a goat that quotes Marc Andreessen too. Build yourself a rocket ship, blast off on an ego trip." },
        { speaker: 'PERFORMER', text: "Can this really be the end? Back to work you go again. Here comes another bubble — with the game you're on, it's still going on, and on, and on... pop." },
      ]},
    ],
    macroSections: [
      { id: 'all', label: 'Full Song', chunks: [1,2,3,4,5,6,7,8] },
      { id: 'm1', label: 'Act I', chunks: [1,2] },
      { id: 'm2', label: 'Act II', chunks: [3,4] },
      { id: 'm3', label: 'Act III', chunks: [5,6] },
      { id: 'm4', label: 'Finale', chunks: [7,8] },
    ],
    createdAt: new Date().toISOString(),
  },
]

/* ═══════════════════════════════════════════════════════════════════════════
   STORAGE + PARSER
   ═══════════════════════════════════════════════════════════════════════════ */

const STORAGE_KEY = 'skit-trainer-library'
const PROGRESS_KEY = 'skit-trainer-progress'

function loadLibrary(): Skit[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const saved = raw ? JSON.parse(raw) as Skit[] : []
    const ids = new Set(saved.map(s => s.id))
    const merged = [...saved]
    for (const seed of SEED_SKITS) { if (!ids.has(seed.id)) merged.push(seed) }
    return merged
  } catch { return [...SEED_SKITS] }
}
function saveLibrary(skits: Skit[]) { localStorage.setItem(STORAGE_KEY, JSON.stringify(skits)) }
function loadProgress(id: string): SkitProgress {
  try { const r = localStorage.getItem(`${PROGRESS_KEY}-${id}`); return r ? JSON.parse(r) : { chunkMastery: {} } }
  catch { return { chunkMastery: {} } }
}
function saveProgress(id: string, p: SkitProgress) { localStorage.setItem(`${PROGRESS_KEY}-${id}`, JSON.stringify(p)) }

function parseSkit(raw: string, title: string): Skit {
  const paras = raw.split(/\n\s*\n/).filter(p => p.trim())
  const speakerPat = /^([A-Z][A-Z0-9 ]+):\s*/
  const speakers = new Set<string>()
  const chunks: Chunk[] = paras.map((para, i) => {
    const lines: Line[] = para.split('\n').filter(l => l.trim()).map(l => {
      const m = l.match(speakerPat)
      if (m) { speakers.add(m[1]); return { speaker: m[1], text: l.replace(speakerPat, '').trim() } }
      return { speaker: '', text: l.trim() }
    })
    return { id: i + 1, label: `Section ${i + 1}`, lines }
  })
  const allIds = chunks.map(c => c.id)
  const macros: MacroSection[] = [{ id: 'all', label: 'Full Text', chunks: allIds }]
  for (let i = 0; i < chunks.length; i += 3) {
    const s = allIds.slice(i, i + 3)
    macros.push({ id: `s${i}`, label: `Part ${Math.floor(i/3)+1}`, chunks: s })
  }
  const wordCount = chunks.reduce((a, c) => a + c.lines.reduce((b, l) => b + l.text.split(/\s+/).length, 0), 0)
  return {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    title, subtitle: `${chunks.length} sections · ${chunks.reduce((a,c) => a+c.lines.length, 0)} lines · ${wordCount} words`,
    speakers: [...speakers].length ? [...speakers] : [''],
    chunks, macroSections: macros, createdAt: new Date().toISOString(),
  }
}

function countWords(skit: Skit) {
  return skit.chunks.reduce((a, c) => a + c.lines.reduce((b, l) => b + l.text.split(/\s+/).length, 0), 0)
}

/* ═══════════════════════════════════════════════════════════════════════════
   SHARE ENCODING / DECODING
   ═══════════════════════════════════════════════════════════════════════════ */

function encodeSkitForShare(skit: Skit): string {
  try {
    const data = {
      title: skit.title,
      subtitle: skit.subtitle,
      speakers: skit.speakers,
      chunks: skit.chunks,
      macroSections: skit.macroSections,
    }
    return btoa(JSON.stringify(data))
  } catch { return '' }
}

function decodeSkitFromUrl(encoded: string): Skit | null {
  try {
    const data = JSON.parse(atob(encoded))
    if (!data.title || !data.chunks) return null
    return {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      title: data.title,
      subtitle: data.subtitle || '',
      speakers: data.speakers || [''],
      chunks: data.chunks,
      macroSections: data.macroSections || [{ id: 'all', label: 'Full Text', chunks: data.chunks.map((c: Chunk) => c.id) }],
      createdAt: new Date().toISOString(),
    }
  } catch { return null }
}

/* ═══════════════════════════════════════════════════════════════════════════
   TOOLS CONFIG — 4 tools (no Chunk)
   ═══════════════════════════════════════════════════════════════════════════ */

const TOOLS: { id: Tool; label: string; icon: string }[] = [
  { id: 'read', label: 'Read', icon: '\u{1F4D6}' },
  { id: 'fill', label: 'Fill Blank', icon: '\u{270F}\u{FE0F}' },
  { id: 'firstletter', label: 'First Letters', icon: '\u{1F524}' },
  { id: 'rsvp', label: 'Speed Read', icon: '\u{26A1}' },
]

/* ═══════════════════════════════════════════════════════════════════════════
   STUDY GUIDE DATA
   ═══════════════════════════════════════════════════════════════════════════ */

const STUDY_STEPS: {
  step: number; title: string; tool: Tool; icon: string
  description: string; difficulty: string; tip: string; citation: string
}[] = [
  // === PHASE 1: FAMILIARIZE ===
  {
    step: 1, title: 'Silent Read', tool: 'read', icon: '📖',
    difficulty: '⬜ Warm-up',
    description: 'Read the full text silently. Don\'t try to memorize — just understand the meaning, the story, the flow. Read it twice.',
    tip: 'Comprehension must come before memorization. You cannot recall what you never understood.',
    citation: 'Craik & Lockhart, 1972 — Depth of Processing',
  },
  {
    step: 2, title: 'Read Aloud', tool: 'read', icon: '🗣️',
    difficulty: '⬜ Warm-up',
    description: 'Read the full text out loud. Feel the rhythm, the pauses, the emotion. Hear yourself say every word. This activates motor memory alongside visual.',
    tip: 'Speaking engages articulatory rehearsal — your mouth remembers patterns your eyes alone cannot.',
    citation: 'Baddeley, 1986 — Phonological Loop',
  },
  {
    step: 3, title: 'Speed Read — Slow Pass', tool: 'rsvp', icon: '⚡',
    difficulty: '🟩 Easy',
    description: 'Set speed to 120–150 WPM. Let each word land. The forced sequential presentation removes the temptation to skip ahead. Watch for the pink focus letter.',
    tip: 'RSVP at slow speeds is an encoding tool, not a speed tool. You\'re imprinting word order.',
    citation: 'Forster, 1970 — Rapid Serial Visual Presentation',
  },
  // === PHASE 2: ACTIVE RECALL ===
  {
    step: 4, title: 'Chunk — Section by Section', tool: 'read', icon: '🧱',
    difficulty: '🟩 Easy',
    description: 'Select a single chunk. Read it twice, then click "Hide & Test." Try to recite from memory. Rate yourself honestly. Master each chunk before moving on.',
    tip: 'Working memory holds 7±2 items. Chunking compresses information into manageable units.',
    citation: 'Miller, 1956 — The Magical Number Seven',
  },
  {
    step: 5, title: 'Fill Blank — 20% (with hints)', tool: 'fill', icon: '✏️',
    difficulty: '🟨 Medium',
    description: 'Set difficulty to 20%. First-letter hints are shown. Only 1 in 5 words is blanked — you should get most right. This is your first active retrieval test.',
    tip: 'The effort of retrieval — even when easy — strengthens the memory trace more than re-reading.',
    citation: 'Roediger & Karpicke, 2006 — Testing Effect',
  },
  {
    step: 6, title: 'First Letters — Read Along', tool: 'firstletter', icon: '🔤',
    difficulty: '🟨 Medium',
    description: 'The full text is reduced to first letters only. Read through WITHOUT revealing — try to speak each word from the single letter cue. Then tap lines you struggled with to check.',
    tip: 'A single letter cue can trigger recall of the entire word by exploiting pattern completion.',
    citation: 'Tulving & Pearlstone, 1966 — Retrieval Cues',
  },
  // === PHASE 3: STRENGTHEN ===
  {
    step: 7, title: 'Fill Blank — 50%', tool: 'fill', icon: '✏️',
    difficulty: '🟧 Hard',
    description: 'Increase to 50% blanked. Half the words are missing. Work section by section if the full text is too difficult. Type each word — no peeking.',
    tip: 'Desirable difficulty: the harder the retrieval, the stronger the resulting memory. Don\'t make it easy.',
    citation: 'Bjork & Bjork, 1992 — Desirable Difficulties',
  },
  {
    step: 8, title: 'Speed Read — Medium Pass', tool: 'rsvp', icon: '⚡',
    difficulty: '🟧 Hard',
    description: 'Set speed to 200–250 WPM. You should recognize most words now. Notice where you feel uncertain — those are your weak spots. Run it 2–3 times.',
    tip: 'Increasing speed forces automatic processing. Words you truly know will keep up; words you don\'t will feel jarring.',
    citation: 'Logan, 1988 — Instance Theory of Automatization',
  },
  {
    step: 9, title: 'First Letters — Recite Aloud', tool: 'firstletter', icon: '🔤',
    difficulty: '🟧 Hard',
    description: 'Same as Step 6 but now speak the FULL text aloud from first letters alone. Go section by section. Don\'t tap to reveal until you\'ve tried the entire section.',
    tip: 'Combining motor output (speech) with visual cues creates a dual encoding trace.',
    citation: 'Paivio, 1971 — Dual Coding Theory',
  },
  // === PHASE 4: MASTER ===
  {
    step: 10, title: 'Fill Blank — 80%', tool: 'fill', icon: '✏️',
    difficulty: '🟥 Expert',
    description: 'Set difficulty to 80%. Almost every word is blanked. You are essentially writing the text from memory with minimal scaffolding. This is the real test.',
    tip: 'At 80%, you\'re generating text, not recognizing it. Generation produces the strongest long-term memories.',
    citation: 'Slamecka & Graf, 1978 — Generation Effect',
  },
  {
    step: 11, title: 'Speed Read — Fast Pass', tool: 'rsvp', icon: '⚡',
    difficulty: '🟥 Expert',
    description: 'Set speed to 300–400 WPM. If you can follow at this speed, the text is deeply encoded. Run it once as a victory lap. If you lose track, drop back to 250 and try again tomorrow.',
    tip: 'Fluent processing at high speed indicates automaticity — the text has moved to long-term memory.',
    citation: 'LaBerge & Samuels, 1974 — Automatic Processing',
  },
  {
    step: 12, title: 'Full Recall — Eyes Closed', tool: 'firstletter', icon: '🏆',
    difficulty: '🟥 Expert',
    description: 'Close your eyes (or look away from the screen). Recite the entire text from memory. Use the first letters ONLY if you get stuck. If you can do this, you\'ve mastered it.',
    tip: 'Free recall without cues is the gold standard of memory strength. If you can do this, the text is yours.',
    citation: 'Tulving, 1972 — Episodic Memory',
  },
  // === PHASE 5: PERFORM ===
  {
    step: 13, title: 'Write It Out', tool: 'fill', icon: '📝',
    difficulty: '🟪 Performance',
    description: 'Set Fill Blank to 100% (or close your tool and open a blank page). Write out the entire text from memory by hand or typing. Compare against the original. Mark your errors.',
    tip: 'Handwriting activates unique neural pathways. Writing from memory is the most demanding — and most effective — form of retrieval practice.',
    citation: 'Mueller & Oppenheimer, 2014 — The Pen Is Mightier',
  },
  {
    step: 14, title: 'Rehearse in Character', tool: 'read', icon: '🎭',
    difficulty: '🟪 Performance',
    description: 'Stand up. Deliver the text as if you\'re performing. Use gestures, facial expressions, voice variation. Move through the space. If it\'s a dialogue, switch voices between speakers.',
    tip: 'Embodied cognition: physical movement linked to words creates richer, more durable memory traces. Every great actor rehearses on their feet.',
    citation: 'Glenberg, 1997 — Embodied Cognition; Stanislavski Method',
  },
  {
    step: 15, title: 'Visualize the Performance', tool: 'read', icon: '🧘',
    difficulty: '🟪 Performance',
    description: 'Close your eyes. Mentally walk through the entire text in your mind. Visualize yourself delivering each line — where you stand, how you gesture, the audience\'s reaction. Run it like a movie.',
    tip: 'Mental rehearsal activates the same motor and cognitive pathways as physical performance. Elite athletes and performers use this technique before every event.',
    citation: 'Driskell et al., 1994 — Mental Practice; Feltz & Landers, 1983',
  },
  {
    step: 16, title: 'Distraction Test', tool: 'firstletter', icon: '🌀',
    difficulty: '🟪 Performance',
    description: 'Do something else for 30 minutes — walk, cook, scroll your phone. Then return and recite from memory cold, without any warm-up. This tests true long-term retention.',
    tip: 'The spacing effect: retrieval after a delay is harder but produces dramatically stronger memories than massed practice.',
    citation: 'Ebbinghaus, 1885 — Spacing Effect; Cepeda et al., 2006',
  },
  {
    step: 17, title: 'Perform for Someone', tool: 'read', icon: '🌟',
    difficulty: '🟪 Performance',
    description: 'Find an audience — a friend, family member, or your phone camera. Perform the full text from memory. The social pressure of a real audience reveals gaps you didn\'t know existed and cements what you do know.',
    tip: 'Social facilitation theory: the presence of others heightens arousal and performance on well-learned tasks. If you can do it in front of someone, you own it.',
    citation: 'Zajonc, 1965 — Social Facilitation; Meisner Technique',
  },
]

/* ═══════════════════════════════════════════════════════════════════════════
   PER-TOOL INSTRUCTIONS
   ═══════════════════════════════════════════════════════════════════════════ */

const TOOL_INSTRUCTIONS: Record<Tool, string> = {
  read: "Read the text to familiarize yourself. Use the section pills above to focus on one chunk at a time. When ready, click 'Hide & Test' to cover a section and recite from memory. Start with the full text (Steps 1–2), then drill section by section (Step 4).",
  fill: "Words are randomly blanked out. Type the missing words and press Check. Start at 20% difficulty (Step 5), then 50% (Step 7), then 80% (Step 10). Tab moves between blanks. The struggle of recalling IS the learning — resist the urge to peek.",
  firstletter: "Each word is reduced to its first letter and dots. Try to speak the full word before tapping a line to reveal it. In early rounds (Step 6), read along silently. In later rounds (Step 9), recite the entire section aloud before checking. For the final test (Step 12), look away and recite from memory.",
  rsvp: "Words flash one at a time. The pink letter marks the optimal recognition point. Space to play/pause, arrows to adjust speed. Start slow at 120–150 WPM (Step 3) for encoding. Return at 200–250 WPM (Step 8) to test recall. Final pass at 300+ WPM (Step 11) for mastery.",
}

/* ═══════════════════════════════════════════════════════════════════════════
   TOAST COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2200)
    return () => clearTimeout(t)
  }, [onDone])
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 30 }}
      style={{
        position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
        background: 'var(--green-dark)', color: '#fff', padding: '10px 24px',
        borderRadius: 'var(--radius)', fontSize: 14, fontWeight: 600,
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)', zIndex: 1000,
      }}
    >
      {message}
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   INSTRUCTION PANEL (collapsible, per-tool)
   ═══════════════════════════════════════════════════════════════════════════ */

function InstructionPanel({ tool }: { tool: Tool }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ marginBottom: open ? 12 : 8 }}>
      <button onClick={() => setOpen(!open)} style={{
        fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500,
        display: 'flex', alignItems: 'center', gap: 4,
      }}>
        <span style={{ fontSize: 11 }}>{open ? '\u25BC' : '\u25B6'}</span>
        <span>ℹ️ How to use</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }}
            style={{ overflow: 'hidden' }}
          >
            <p style={{
              fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6,
              padding: '8px 12px', marginTop: 4, background: 'var(--surface-alt)',
              borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
            }}>
              {TOOL_INSTRUCTIONS[tool]}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   CHUNK SELECTOR (shared, shown in all tools)
   ═══════════════════════════════════════════════════════════════════════════ */

function ChunkSelector({ chunks, selected, onSelect }: {
  chunks: Chunk[]; selected: number | null; onSelect: (id: number | null) => void
}) {
  if (chunks.length <= 1) return null
  return (
    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 12 }}>
      <button onClick={() => onSelect(null)} style={{
        padding: '4px 12px', borderRadius: 16, fontSize: 11, fontWeight: 600,
        background: selected === null ? 'var(--pink-faded)' : 'var(--surface-alt)',
        color: selected === null ? 'var(--pink-dark)' : 'var(--text-secondary)',
        border: `1px solid ${selected === null ? 'var(--pink)' : 'var(--border)'}`,
      }}>All</button>
      {chunks.map(c => (
        <button key={c.id} onClick={() => onSelect(c.id)} style={{
          padding: '4px 12px', borderRadius: 16, fontSize: 11, fontWeight: 600,
          background: selected === c.id ? 'var(--pink-faded)' : 'var(--surface-alt)',
          color: selected === c.id ? 'var(--pink-dark)' : 'var(--text-secondary)',
          border: `1px solid ${selected === c.id ? 'var(--pink)' : 'var(--border)'}`,
        }}>{c.label}</button>
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   APP
   ═══════════════════════════════════════════════════════════════════════════ */

export default function App() {
  const [view, setView] = useState<View>('library')
  const [library, setLibrary] = useState<Skit[]>(loadLibrary)
  const [activeSkit, setActiveSkit] = useState<Skit | null>(null)
  const [activeTool, setActiveTool] = useState<Tool>('read')
  const [dark, setDark] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  useEffect(() => { saveLibrary(library) }, [library])
  useEffect(() => { document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light') }, [dark])

  // On load: check for ?skit= URL parameter
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const encoded = params.get('skit')
    if (!encoded) return
    const skit = decodeSkitFromUrl(encoded)
    if (!skit) return
    // Check for duplicate by title
    setLibrary(prev => {
      if (prev.some(s => s.title === skit.title)) {
        // Already exists, just open it
        const existing = prev.find(s => s.title === skit.title)!
        setActiveSkit(existing)
        setActiveTool('read')
        setView('practice')
        return prev
      }
      setActiveSkit(skit)
      setActiveTool('read')
      setView('practice')
      return [...prev, skit]
    })
    // Clean URL
    window.history.replaceState({}, '', window.location.pathname)
  }, [])

  const openSkit = useCallback((skit: Skit) => { setActiveSkit(skit); setActiveTool('read'); setView('practice') }, [])
  const deleteSkit = useCallback((id: string) => {
    if (SEED_SKITS.some(s => s.id === id)) return
    setLibrary(prev => prev.filter(s => s.id !== id))
  }, [])
  const addSkit = useCallback((skit: Skit) => { setLibrary(prev => [...prev, skit]); openSkit(skit) }, [openSkit])

  const shareSkit = useCallback((skit: Skit) => {
    const encoded = encodeSkitForShare(skit)
    if (!encoded) return
    const url = `${window.location.origin}${window.location.pathname}?skit=${encoded}`
    navigator.clipboard.writeText(url).then(() => {
      setToast('Link copied!')
    }).catch(() => {
      // Fallback
      const ta = document.createElement('textarea')
      ta.value = url; document.body.appendChild(ta); ta.select(); document.execCommand('copy')
      document.body.removeChild(ta)
      setToast('Link copied!')
    })
  }, [])

  const allChunks = activeSkit?.chunks ?? []
  const allLines = allChunks.flatMap(c => c.lines.map(l => ({ ...l, chunkId: c.id, chunkLabel: c.label })))

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{
        padding: '10px 20px', display: 'flex', alignItems: 'center', gap: 10,
        borderBottom: '1px solid var(--border)', background: 'var(--surface)',
      }}>
        <span style={{ fontSize: 22 }}>{'\u{1F3AD}'}</span>
        <span style={{ fontWeight: 800, fontSize: 17, color: 'var(--green-dark)' }}>Skit Trainer</span>
        <div style={{ flex: 1 }} />
        <button onClick={() => setDark(!dark)} style={{
          width: 36, height: 36, borderRadius: 'var(--radius-sm)',
          background: 'var(--surface-alt)', fontSize: 16, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
        }}>{dark ? '\u2600\uFE0F' : '\u{1F319}'}</button>
        {view === 'practice' && (
          <button onClick={() => setView('library')} style={{
            padding: '6px 14px', borderRadius: 'var(--radius-sm)',
            background: 'var(--green-faded)', color: 'var(--green-dark)',
            fontSize: 13, fontWeight: 600,
          }}>{'\u2190'} Library</button>
        )}
      </header>

      <main style={{ flex: 1, overflow: 'auto' }}>
        <AnimatePresence mode="wait">
          {view === 'library' && (
            <motion.div key="lib" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ maxWidth: 640, margin: '0 auto', padding: 20 }}>
              <LibraryView library={library} onOpen={openSkit} onDelete={deleteSkit} onImport={() => setView('import')} onShare={shareSkit} />
            </motion.div>
          )}
          {view === 'import' && (
            <motion.div key="imp" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ maxWidth: 640, margin: '0 auto', padding: 20 }}>
              <ImportView onAdd={addSkit} onCancel={() => setView('library')} />
            </motion.div>
          )}
          {view === 'practice' && activeSkit && (
            <motion.div key="prac" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              style={{ maxWidth: 720, margin: '0 auto', padding: 20 }}>
              <PracticeView skit={activeSkit} tool={activeTool} setTool={setActiveTool}
                chunks={allChunks} lines={allLines} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Toast */}
      <AnimatePresence>
        {toast && <Toast message={toast} onDone={() => setToast(null)} />}
      </AnimatePresence>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   LIBRARY
   ═══════════════════════════════════════════════════════════════════════════ */

function LibraryView({ library, onOpen, onDelete, onImport, onShare }: {
  library: Skit[]; onOpen: (s: Skit) => void; onDelete: (id: string) => void; onImport: () => void; onShare: (s: Skit) => void
}) {
  return (
    <>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--green-dark)', marginBottom: 2 }}>Your Library</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>Skits, monologues, songs, poems -- anything to memorize.</p>
      </div>
      <button onClick={onImport} style={{
        width: '100%', padding: 14, borderRadius: 'var(--radius)',
        background: 'var(--green-pale)', border: '2px dashed var(--green-mid)',
        fontSize: 15, fontWeight: 700, color: 'var(--green-main)', marginBottom: 20,
      }}>+ Add New Text</button>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {library.map(skit => (
          <div key={skit.id} onClick={() => onOpen(skit)} style={{
            background: 'var(--surface)', borderRadius: 'var(--radius)',
            border: '1.5px solid var(--border)', padding: '14px 16px', cursor: 'pointer',
            transition: 'border-color 0.15s, box-shadow 0.15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--green-main)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(5,150,105,0.1)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.boxShadow = 'none' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ fontWeight: 700, fontSize: 15, color: 'var(--green-dark)' }}>{skit.title}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 2 }}>{skit.subtitle}</p>
              </div>
              <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                <button onClick={e => { e.stopPropagation(); onShare(skit) }} title="Share" style={{
                  fontSize: 12, color: 'var(--text-secondary)', padding: '4px 8px', borderRadius: 4,
                  background: 'var(--surface-alt)', border: '1px solid var(--border)',
                  fontWeight: 500,
                }}>{'\u{1F517}'} Share</button>
                {!SEED_SKITS.some(s => s.id === skit.id) && (
                  <button onClick={e => { e.stopPropagation(); onDelete(skit.id) }} style={{
                    fontSize: 11, color: 'var(--text-dim)', padding: '4px 8px', borderRadius: 4,
                    background: 'var(--surface-alt)', border: '1px solid var(--border)',
                  }}>{'\u2715'}</button>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 14, marginTop: 6, fontSize: 12, color: 'var(--text-dim)' }}>
              <span>{skit.chunks.length} sections</span>
              <span>{skit.chunks.reduce((a,c) => a+c.lines.length, 0)} lines</span>
              <span>{countWords(skit)} words</span>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   IMPORT
   ═══════════════════════════════════════════════════════════════════════════ */

function ImportView({ onAdd, onCancel }: { onAdd: (s: Skit) => void; onCancel: () => void }) {
  const [title, setTitle] = useState('')
  const [text, setText] = useState('')
  const ok = title.trim() && text.trim()
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontWeight: 800, fontSize: 20, color: 'var(--green-dark)' }}>Add New Text</h2>
        <button onClick={onCancel} style={{ padding: '5px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--surface-alt)', fontSize: 13, fontWeight: 500 }}>Cancel</button>
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--text-secondary)' }}>Title</label>
        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g., Hamlet's Soliloquy" />
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--text-secondary)' }}>Text</label>
        <textarea value={text} onChange={e => setText(e.target.value)}
          placeholder={"Paste your text here.\n\nBlank lines \u2192 sections.\nSPEAKER: text \u2192 dialogue."} style={{ minHeight: 200 }} />
      </div>
      <button onClick={() => ok && onAdd(parseSkit(text, title.trim()))} disabled={!ok} style={{
        width: '100%', padding: 13, borderRadius: 'var(--radius)',
        background: ok ? 'var(--green-main)' : 'var(--border)',
        color: ok ? '#fff' : 'var(--text-dim)', fontSize: 15, fontWeight: 700,
        cursor: ok ? 'pointer' : 'not-allowed',
      }}>Start Practicing</button>
    </>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   STUDY GUIDE
   ═══════════════════════════════════════════════════════════════════════════ */

const PHASES: { id: number; label: string; icon: string; startStep: number; endStep: number }[] = [
  { id: 1, label: 'Familiarize', icon: '🌱', startStep: 1, endStep: 3 },
  { id: 2, label: 'Active Recall', icon: '🧠', startStep: 4, endStep: 6 },
  { id: 3, label: 'Strengthen', icon: '💪', startStep: 7, endStep: 9 },
  { id: 4, label: 'Master', icon: '🏆', startStep: 10, endStep: 12 },
  { id: 5, label: 'Perform', icon: '🎭', startStep: 13, endStep: 17 },
]

function StudyGuide({ onNavigate }: { onNavigate: (tool: Tool) => void }) {
  const [open, setOpen] = useState(false)
  const [openPhases, setOpenPhases] = useState<Record<number, boolean>>({ 1: true })
  const togglePhase = (id: number) => setOpenPhases(p => ({ ...p, [id]: !p[id] }))
  return (
    <div style={{ marginBottom: 14 }}>
      <button onClick={() => setOpen(!open)} style={{
        padding: '8px 16px', borderRadius: 'var(--radius-sm)',
        background: open ? 'var(--green-faded)' : 'var(--surface-alt)',
        border: `1px solid ${open ? 'var(--green-mid)' : 'var(--border)'}`,
        fontSize: 13, fontWeight: 600,
        color: open ? 'var(--green-dark)' : 'var(--text-secondary)',
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        📋 Study Guide
        <span style={{ fontSize: 10, marginLeft: 4 }}>{open ? '▲' : '▼'}</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 10 }}>
              <p style={{ fontSize: 12, color: 'var(--text-dim)', lineHeight: 1.5, marginBottom: 6 }}>
                Follow these 17 steps across 5 phases. Alternate between tools at increasing difficulty. Most texts can be memorized in 2–3 sessions.
              </p>
              {PHASES.map(phase => {
                const phaseSteps = STUDY_STEPS.filter(s => s.step >= phase.startStep && s.step <= phase.endStep)
                const isOpen = !!openPhases[phase.id]
                return (
                  <div key={phase.id}>
                    <button onClick={() => togglePhase(phase.id)} style={{
                      width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '8px 10px', borderRadius: 'var(--radius-sm)',
                      background: isOpen ? 'var(--green-faded)' : 'transparent',
                      border: `1px solid ${isOpen ? 'var(--green-mid)' : 'var(--border)'}`,
                      marginTop: phase.id > 1 ? 4 : 0, cursor: 'pointer',
                    }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--green-dark)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {phase.icon} Phase {phase.id}: {phase.label}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                        Steps {phase.startStep}–{phase.endStep} {isOpen ? '▲' : '▼'}
                      </span>
                    </button>
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }}
                          style={{ overflow: 'hidden' }}
                        >
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingTop: 4 }}>
                            {phaseSteps.map(s => (
                              <div key={s.step} style={{
                                background: 'var(--surface)', border: '1px solid var(--border)',
                                borderRadius: 'var(--radius)', padding: '10px 12px',
                                display: 'flex', gap: 10, alignItems: 'flex-start',
                              }}>
                                <div style={{
                                  width: 28, height: 28, borderRadius: '50%',
                                  background: 'var(--green-faded)', display: 'flex',
                                  alignItems: 'center', justifyContent: 'center',
                                  fontSize: 12, fontWeight: 800, flexShrink: 0,
                                  color: 'var(--green-dark)',
                                }}>{s.step}</div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 3 }}>
                                    <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>
                                      {s.icon} {s.title} <span style={{ fontSize: 10, opacity: 0.6, marginLeft: 4 }}>{s.difficulty}</span>
                                    </span>
                                    <button onClick={() => { onNavigate(s.tool); setOpen(false) }} style={{
                                      fontSize: 11, fontWeight: 700, color: 'var(--pink)',
                                      padding: '3px 10px', borderRadius: 12,
                                      background: 'var(--pink-faded)', border: '1px solid var(--pink-mid)',
                                      flexShrink: 0, minHeight: 28, minWidth: 28,
                                    }}>Go →</button>
                                  </div>
                                  <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 3 }}>{s.description}</p>
                                  <p style={{ fontSize: 11, color: 'var(--text-dim)', fontStyle: 'italic', lineHeight: 1.4 }}>
                                    💡 {s.tip} <span style={{ opacity: 0.6 }}>— {s.citation}</span>
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   PRACTICE -- title + stats + study guide + tools + content
   ═══════════════════════════════════════════════════════════════════════════ */

function PracticeView({ skit, tool, setTool, chunks, lines }: {
  skit: Skit; tool: Tool; setTool: (t: Tool) => void
  chunks: Chunk[]; lines: { speaker: string; text: string; chunkId: number; chunkLabel: string }[]
}) {
  const [selectedChunk, setSelectedChunk] = useState<number | null>(null)

  // Filter lines and chunks based on selection
  const filteredChunks = selectedChunk !== null ? chunks.filter(c => c.id === selectedChunk) : chunks
  const filteredLines = selectedChunk !== null
    ? lines.filter(l => l.chunkId === selectedChunk)
    : lines

  return (
    <>
      <div style={{ marginBottom: 14 }}>
        <h2 style={{ fontWeight: 800, fontSize: 20, color: 'var(--green-dark)' }}>{skit.title}</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 12 }}>
          {skit.chunks.length} sections {'\u00B7'} {skit.chunks.reduce((a,c)=>a+c.lines.length,0)} lines {'\u00B7'} {countWords(skit)} words
        </p>
      </div>

      {/* Study Guide */}
      <StudyGuide onNavigate={setTool} />

      {/* Tool bar */}
      <div className="tool-grid" style={{
        display: 'grid', gridTemplateColumns: `repeat(${TOOLS.length}, 1fr)`, gap: 6, marginBottom: 16,
      }}>
        {TOOLS.map(t => (
          <button key={t.id} onClick={() => setTool(t.id)} style={{
            padding: '8px 6px', borderRadius: 'var(--radius-sm)', textAlign: 'center',
            background: tool === t.id ? 'var(--pink-faded)' : 'var(--surface)',
            border: `1.5px solid ${tool === t.id ? 'var(--pink)' : 'var(--border)'}`,
            transition: 'all 0.12s',
          }}>
            <div style={{ fontSize: 16, marginBottom: 1 }}>{t.icon}</div>
            <div style={{ fontSize: 11, fontWeight: tool === t.id ? 700 : 500, color: tool === t.id ? 'var(--pink-dark)' : 'var(--text-secondary)' }}>{t.label}</div>
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{
        background: 'var(--surface)', borderRadius: 'var(--radius)',
        border: '1px solid var(--border)', padding: 18, minHeight: 180,
      }}>
        {/* Instruction panel */}
        <InstructionPanel tool={tool} />

        {/* Chunk selector */}
        <ChunkSelector chunks={chunks} selected={selectedChunk} onSelect={setSelectedChunk} />

        <AnimatePresence mode="wait">
          <motion.div key={`${tool}-${selectedChunk}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>
            {tool === 'read' && <ReadTool lines={filteredLines} chunks={filteredChunks} skitId={skit.id} singleChunk={selectedChunk !== null} />}
            {tool === 'fill' && <FillTool lines={filteredLines} />}
            {tool === 'firstletter' && <FirstLetterTool lines={filteredLines} />}
            {tool === 'rsvp' && <RSVPTool lines={filteredLines} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   READ — with optional chunk hide/test/rate controls
   ═══════════════════════════════════════════════════════════════════════════ */

function ReadTool({ lines, chunks, skitId, singleChunk }: {
  lines: { speaker: string; text: string; chunkLabel: string; chunkId: number }[]
  chunks: Chunk[]; skitId: string; singleChunk: boolean
}) {
  const [hidden, setHidden] = useState(false)
  const [progress, setProgress] = useState<SkitProgress>(() => loadProgress(skitId))

  // Reset hidden state when chunk changes
  useEffect(() => { setHidden(false) }, [singleChunk, chunks])

  const chunk = singleChunk && chunks.length === 1 ? chunks[0] : null
  const mark = (val: number) => {
    if (!chunk) return
    const n = { ...progress, chunkMastery: { ...progress.chunkMastery, [chunk.id]: val } }
    setProgress(n); saveProgress(skitId, n)
  }
  const mastery = chunk ? (progress.chunkMastery[chunk.id] || 0) : 0

  let last = -1
  return (
    <div>
      {/* Mastery indicator for single chunk */}
      {singleChunk && chunk && (
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 10 }}>
          <div style={{
            height: 6, flex: 1, background: 'var(--border)', borderRadius: 3, overflow: 'hidden',
          }}>
            <div style={{
              width: `${mastery}%`, height: '100%', borderRadius: 3,
              background: mastery >= 80 ? 'var(--green-main)' : 'var(--pink)',
              transition: 'width 0.3s',
            }} />
          </div>
          <span style={{ fontSize: 10, color: 'var(--text-dim)', fontWeight: 600, minWidth: 28 }}>{mastery}%</span>
        </div>
      )}

      {/* Lines */}
      {lines.map((l, i) => {
        const show = l.chunkId !== last; last = l.chunkId
        return (
          <div key={i}>
            {show && !singleChunk && (
              <div style={{
                fontSize: 10, fontWeight: 700, color: 'var(--pink)',
                textTransform: 'uppercase', letterSpacing: 1,
                marginTop: i > 0 ? 18 : 0, marginBottom: 6,
              }}>{l.chunkLabel}</div>
            )}
            <div style={{
              marginBottom: 6, lineHeight: 1.7,
              opacity: hidden ? 0 : 1,
              filter: hidden ? 'blur(8px)' : 'none',
              transition: 'all 0.3s',
              userSelect: hidden ? 'none' : 'auto',
            }}>
              {l.speaker && <span style={{ fontWeight: 700, color: 'var(--green-main)', marginRight: 8, fontSize: 12 }}>{l.speaker}:</span>}
              <span>{l.text}</span>
            </div>
          </div>
        )
      })}

      {/* Hide & Test controls — only for single chunk mode */}
      {singleChunk && chunk && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 14 }}>
          <button onClick={() => setHidden(!hidden)} style={{
            padding: '7px 14px', borderRadius: 'var(--radius-sm)',
            background: hidden ? 'var(--pink-faded)' : 'var(--surface-alt)',
            border: `1px solid ${hidden ? 'var(--pink)' : 'var(--border)'}`,
            fontSize: 12, fontWeight: 600, color: hidden ? 'var(--pink-dark)' : 'var(--text)',
          }}>{hidden ? '\u{1F441} Show' : '\u{1F648} Hide & Test'}</button>
          {hidden && <>
            <button onClick={() => mark(100)} style={{
              padding: '7px 14px', borderRadius: 'var(--radius-sm)',
              background: 'var(--green-faded)', border: '1px solid var(--green-mid)',
              fontSize: 12, fontWeight: 600, color: 'var(--green-dark)',
            }}>Got it {'\u2713'}</button>
            <button onClick={() => mark(40)} style={{
              padding: '7px 14px', borderRadius: 'var(--radius-sm)',
              background: 'var(--pink-faded)', border: '1px solid var(--pink)',
              fontSize: 12, fontWeight: 600, color: 'var(--pink-dark)',
            }}>More practice</button>
          </>}
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   FILL BLANK
   ═══════════════════════════════════════════════════════════════════════════ */

function FillTool({ lines }: { lines: { speaker: string; text: string }[] }) {
  const [pct, setPct] = useState(30)
  const [hintType, setHintType] = useState<'firstletter'|'wordcount'|'none'>('wordcount')
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [checked, setChecked] = useState(false)
  const [gen, setGen] = useState(0)
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const tokens = useMemo(() =>
    lines.flatMap((l, li) => l.text.split(/\s+/).map((w, wi) => ({ word: w, key: `${li}-${wi}`, li, wi, speaker: l.speaker }))),
  [lines])

  const blanked = useMemo(() => {
    const eligible = tokens.filter(t => t.word.replace(/[^a-zA-Z]/g, '').length > 2).map(t => t.key)
    const shuffled = [...eligible].sort(() => Math.random() - 0.5)
    return new Set(shuffled.slice(0, Math.ceil(eligible.length * (pct / 100))))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tokens, pct, gen])

  const blankKeys = useMemo(() => tokens.filter(t => blanked.has(t.key)).map(t => t.key), [tokens, blanked])
  const normalize = (s: string) => (s||'').trim().replace(/[^a-zA-Z0-9']/g, '').toLowerCase()
  const correct = (k: string) => normalize(tokens.find(t => t.key === k)!.word) === normalize(answers[k]||'')
  const score = checked ? blankKeys.filter(correct).length : 0
  const regenerate = () => { setGen(g => g+1); setAnswers({}); setChecked(false) }

  const focusNext = (key: string) => {
    const i = blankKeys.indexOf(key)
    const next = blankKeys[(i+1) % blankKeys.length]
    inputRefs.current[next]?.focus()
  }

  const getHint = (word: string) => {
    if (hintType === 'firstletter') return word[0] + '_'.repeat(word.replace(/[^a-zA-Z]/g,'').length - 1)
    if (hintType === 'wordcount') return word.replace(/[^a-zA-Z]/g,'').length.toString()
    return '___'
  }

  return (
    <div>
      {/* Controls */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>Blanks:</span>
        {[20, 30, 50, 70, 100].map(p => (
          <button key={p} onClick={() => { setPct(p); regenerate() }} style={{
            padding: '3px 10px', borderRadius: 14, fontSize: 11, fontWeight: 600,
            background: pct === p ? 'var(--pink-faded)' : 'var(--surface-alt)',
            color: pct === p ? 'var(--pink-dark)' : 'var(--text-secondary)',
            border: `1px solid ${pct === p ? 'var(--pink)' : 'var(--border)'}`,
          }}>{p}%</button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 14, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>Hints:</span>
        {([['firstletter','1st Letter'],['wordcount','# Chars'],['none','None']] as const).map(([id, label]) => (
          <button key={id} onClick={() => setHintType(id)} style={{
            padding: '3px 10px', borderRadius: 14, fontSize: 11, fontWeight: 600,
            background: hintType === id ? 'var(--green-faded)' : 'var(--surface-alt)',
            color: hintType === id ? 'var(--green-dark)' : 'var(--text-secondary)',
            border: `1px solid ${hintType === id ? 'var(--green-mid)' : 'var(--border)'}`,
          }}>{label}</button>
        ))}
        <button onClick={regenerate} style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--pink)', fontWeight: 600 }}>{'\u21BB'} Reshuffle</button>
      </div>
      {/* Text with blanks */}
      <div style={{ lineHeight: 2.4 }}>
        {lines.map((l, li) => (
          <div key={li} style={{ marginBottom: 6 }}>
            {l.speaker && <span style={{ fontWeight: 700, color: 'var(--green-main)', marginRight: 6, fontSize: 12 }}>{l.speaker}:</span>}
            {l.text.split(/\s+/).map((w, wi) => {
              const key = `${li}-${wi}`
              if (!blanked.has(key)) return <span key={key}>{w} </span>
              const clean = w.replace(/[^a-zA-Z']/g,'')
              const val = answers[key] || ''
              const ok = checked && correct(key)
              const wrong = checked && !correct(key)
              return (
                <span key={key} style={{ display: 'inline-block', marginRight: 3 }}>
                  <input
                    ref={el => { inputRefs.current[key] = el }}
                    value={val} onChange={e => setAnswers(p => ({ ...p, [key]: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Tab' || e.key === 'Enter') { e.preventDefault(); focusNext(key) } }}
                    disabled={checked} placeholder={getHint(w)}
                    className="fill-blank-input"
                    style={{
                      width: Math.max(50, clean.length * 9 + 12), padding: '2px 5px', fontSize: 13,
                      borderRadius: 4, textAlign: 'center', minHeight: 'auto', minWidth: 'auto',
                      background: ok ? 'var(--green-faded)' : wrong ? 'var(--incorrect-faded)' : 'var(--surface-alt)',
                      borderColor: ok ? 'var(--green-mid)' : wrong ? 'var(--incorrect)' : 'var(--border)',
                    }}
                  />
                  {wrong && <span style={{ fontSize: 10, color: 'var(--pink)', display: 'block' }}>{w}</span>}
                </span>
              )
            })}
          </div>
        ))}
      </div>
      {/* Check / Score */}
      <div style={{ marginTop: 14, display: 'flex', gap: 8, alignItems: 'center' }}>
        {!checked ? (
          <button onClick={() => setChecked(true)} style={{
            padding: '8px 22px', borderRadius: 'var(--radius-sm)',
            background: 'var(--green-main)', color: '#fff', fontWeight: 700, fontSize: 13,
          }}>Check</button>
        ) : (
          <>
            <span style={{ fontSize: 14, fontWeight: 700, color: score/blankKeys.length >= 0.8 ? 'var(--green-main)' : 'var(--pink)' }}>
              {score}/{blankKeys.length} ({Math.round(score/blankKeys.length*100)}%)
            </span>
            <button onClick={regenerate} style={{
              padding: '8px 18px', borderRadius: 'var(--radius-sm)',
              background: 'var(--surface-alt)', border: '1px solid var(--border)',
              fontSize: 13, fontWeight: 600, marginLeft: 'auto',
            }}>Try Again</button>
          </>
        )}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   FIRST LETTER
   ═══════════════════════════════════════════════════════════════════════════ */

function FirstLetterTool({ lines }: { lines: { speaker: string; text: string }[] }) {
  const [revealed, setRevealed] = useState<Set<number>>(new Set())
  const fl = (t: string) => t.split(/\s+/).map(w => w[0] + '\u00B7'.repeat(w.length-1)).join(' ')
  return (
    <div>
      <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 12 }}>Tap a line to reveal. Try to recall first.</p>
      {lines.map((l, i) => {
        const show = revealed.has(i)
        return (
          <div key={i} onClick={() => setRevealed(p => { const n = new Set(p); n.has(i) ? n.delete(i) : n.add(i); return n })} style={{
            marginBottom: 6, padding: '7px 10px', borderRadius: 'var(--radius-sm)',
            background: show ? 'var(--fl-revealed-bg, var(--green-faded))' : 'var(--surface-alt)',
            cursor: 'pointer', lineHeight: 1.7, transition: 'background 0.15s',
            borderLeft: `3px solid ${show ? 'var(--green-main)' : 'transparent'}`,
          }}>
            {l.speaker && <span style={{ fontWeight: 700, color: 'var(--green-main)', marginRight: 6, fontSize: 12 }}>{l.speaker}:</span>}
            <span className={show ? '' : 'fl-unrevealed'} style={{
              fontFamily: show ? 'inherit' : 'monospace',
              letterSpacing: show ? 'normal' : 0.5,
              color: show ? 'var(--text)' : 'var(--fl-text, var(--text))',
            }}>
              {show ? l.text : fl(l.text)}
            </span>
          </div>
        )
      })}
      <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-dim)' }}>{revealed.size}/{lines.length} revealed</div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════
   RSVP
   ═══════════════════════════════════════════════════════════════════════════ */

function RSVPTool({ lines }: { lines: { speaker: string; text: string }[] }) {
  const WPM_PRESETS = [100, 200, 300, 450, 600]
  const words = useMemo(() => {
    const r: { text: string; isSpeaker: boolean }[] = []
    lines.forEach(l => {
      if (l.speaker) r.push({ text: `${l.speaker}:`, isSpeaker: true })
      l.text.split(/\s+/).forEach(w => r.push({ text: w, isSpeaker: false }))
    })
    return r
  }, [lines])

  const [wpm, setWpm] = useState(250)
  const [idx, setIdx] = useState(0)
  const [playing, setPlaying] = useState(false)
  const timerRef = useRef<number|null>(null)
  const textRef = useRef<HTMLDivElement>(null)

  const ms = Math.round(60000 / wpm)
  const cur = words[idx] || { text: '\u2014', isSpeaker: false }
  const findORP = (w: string) => { const l = w.length; if (l<=1) return 0; if (l<=3) return 1; if (l<=5) return 2; return Math.floor(l*0.4) }
  const orp = findORP(cur.text)
  const progress = words.length > 1 ? (idx / (words.length - 1)) * 100 : 0
  const remaining = Math.round((words.length - idx) / wpm * 60)

  useEffect(() => {
    if (playing && idx < words.length) {
      const delay = cur.isSpeaker ? ms * 3 : /[.!?;—]$/.test(cur.text) ? ms * 2 : ms
      timerRef.current = window.setTimeout(() => setIdx(i => { if (i+1 >= words.length) { setPlaying(false); return i } return i+1 }), delay)
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [playing, idx, ms, cur, words.length])

  useEffect(() => {
    textRef.current?.querySelector(`[data-wi="${idx}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [idx])

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return
      if (e.code === 'Space') { e.preventDefault(); setPlaying(p => !p) }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  return (
    <div>
      {/* WPM control */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600 }}>WPM:</span>
        <input type="range" min={60} max={900} step={10} value={wpm} onChange={e => setWpm(Number(e.target.value))}
          style={{ width: 100, accentColor: 'var(--pink)', minHeight: 'auto', minWidth: 'auto', padding: 0, border: 'none', background: 'transparent' }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--pink)', minWidth: 40 }}>{wpm}</span>
        <div style={{ display: 'flex', gap: 4, marginLeft: 8 }}>
          {WPM_PRESETS.map(w => (
            <button key={w} onClick={() => setWpm(w)} style={{
              padding: '2px 8px', borderRadius: 10, fontSize: 10, fontWeight: 600,
              background: wpm === w ? 'var(--pink-faded)' : 'var(--surface-alt)',
              color: wpm === w ? 'var(--pink-dark)' : 'var(--text-dim)',
              border: `1px solid ${wpm === w ? 'var(--pink)' : 'var(--border)'}`,
            }}>{w}</button>
          ))}
        </div>
      </div>

      {/* ORP display */}
      <div style={{
        background: 'var(--surface-alt)', border: '3px solid var(--green-main)',
        borderRadius: 14, padding: '36px 16px', minHeight: 120,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'relative', marginBottom: 10,
      }}>
        <div style={{ position: 'absolute', left: '40%', top: 0, bottom: 0, width: 1, background: 'var(--pink)', opacity: 0.2 }} />
        <div style={{ display: 'flex', alignItems: 'baseline' }}>
          <span style={{ fontFamily: 'monospace', fontSize: 36, fontWeight: 700, textAlign: 'right', minWidth: 90, color: 'var(--green-dark)' }}>{cur.text.slice(0, orp)}</span>
          <span style={{ fontFamily: 'monospace', fontSize: 36, fontWeight: 900, color: 'var(--pink)' }}>{cur.text[orp] || ''}</span>
          <span style={{ fontFamily: 'monospace', fontSize: 36, fontWeight: 700, textAlign: 'left', minWidth: 90, color: 'var(--green-dark)' }}>{cur.text.slice(orp + 1)}</span>
        </div>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 8 }}>
        <button onClick={() => setIdx(Math.max(0, idx-1))} style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)', background: 'var(--surface-alt)', fontSize: 14 }}>{'\u25C0'}</button>
        <button onClick={() => { if (playing) setPlaying(false); else { if (idx >= words.length-1) setIdx(0); setPlaying(true) } }}
          style={{ width: 50, height: 36, borderRadius: 'var(--radius-sm)', color: '#fff', fontSize: 14, fontWeight: 700,
            background: playing ? 'var(--pink)' : 'var(--green-main)' }}>
          {playing ? '\u23F8' : '\u25B6'}
        </button>
        <button onClick={() => { setPlaying(false); setIdx(0) }} style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)', background: 'var(--surface-alt)', fontSize: 14 }}>{'\u21BB'}</button>
        <button onClick={() => setIdx(Math.min(words.length-1, idx+1))} style={{ width: 36, height: 36, borderRadius: 'var(--radius-sm)', background: 'var(--surface-alt)', fontSize: 14 }}>{'\u25B6'}</button>
      </div>

      {/* Progress bar */}
      <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, marginBottom: 4 }}>
        <div style={{ width: `${progress}%`, height: '100%', background: 'var(--green-main)', borderRadius: 2, transition: 'width 0.1s' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-dim)', marginBottom: 10 }}>
        <span>{Math.round(progress)}%</span>
        <span>{Math.floor(remaining/60)}:{(remaining%60).toString().padStart(2,'0')} remaining</span>
      </div>

      {/* Text view with current word highlighted */}
      <div ref={textRef} style={{
        padding: 12, background: 'var(--surface-alt)', borderRadius: 'var(--radius)',
        maxHeight: 180, overflowY: 'auto', lineHeight: 2, fontSize: 12,
      }}>
        {words.map((w, i) => (
          <span key={i} data-wi={i} onClick={() => { setIdx(i); setPlaying(false) }} style={{
            cursor: 'pointer', padding: '1px 2px', borderRadius: 3, transition: 'all 0.1s',
            color: i < idx ? 'var(--rsvp-past, var(--text-dim))' : i === idx ? '#fff' : 'var(--text)',
            background: i === idx ? 'var(--pink)' : 'transparent',
            fontWeight: w.isSpeaker ? 700 : 400,
          }}>{w.text} </span>
        ))}
      </div>
    </div>
  )
}
