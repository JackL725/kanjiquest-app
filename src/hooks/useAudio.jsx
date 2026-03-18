import { useCallback, useEffect, useRef, useState } from 'react'

// ─── useAudio ──────────────────────────────────────────────────────────
// Japanese TTS pronunciation using the Web Speech API.
// Falls back gracefully if no Japanese voice is available.
//
// Settings: audioEnabled (default true), audioRate (0.7–1.3, default 0.85)
//
// Usage:
//   const { speak, speakReading, isAvailable } = useAudio()
//   speak('設定')        — speaks the kanji
//   speakReading('せってい') — speaks the reading
//

const AUDIO_KEY = 'kq-audio-settings'

function readAudioSettings() {
  try {
    const raw = localStorage.getItem(AUDIO_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    return {
      enabled: parsed.enabled !== false,  // default true
      rate: parsed.rate ?? 0.85,
      autoPlay: parsed.autoPlay !== false, // auto-play on card flip
    }
  } catch {
    return { enabled: true, rate: 0.85, autoPlay: true }
  }
}

export function writeAudioSettings(settings) {
  try {
    localStorage.setItem(AUDIO_KEY, JSON.stringify(settings))
  } catch {}
}

export function useAudio() {
  const [isAvailable, setIsAvailable] = useState(false)
  const jaVoiceRef = useRef(null)
  const settingsRef = useRef(readAudioSettings())

  // Find Japanese voice on mount
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return

    function findVoice() {
      const voices = window.speechSynthesis.getVoices()
      // Prefer high-quality Japanese voices
      const ja = voices.find(v => v.lang === 'ja-JP' && v.localService) ||
                 voices.find(v => v.lang === 'ja-JP') ||
                 voices.find(v => v.lang.startsWith('ja'))

      if (ja) {
        jaVoiceRef.current = ja
        setIsAvailable(true)
      }
    }

    findVoice()

    // Voices may load asynchronously (Chrome)
    window.speechSynthesis.onvoiceschanged = findVoice
    return () => { window.speechSynthesis.onvoiceschanged = null }
  }, [])

  const speak = useCallback((text, opts = {}) => {
    if (!window.speechSynthesis || !jaVoiceRef.current) return
    const settings = readAudioSettings()
    if (!settings.enabled && !opts.force) return

    // Cancel any current speech
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.voice = jaVoiceRef.current
    utterance.lang = 'ja-JP'
    utterance.rate = opts.rate ?? settings.rate
    utterance.pitch = opts.pitch ?? 1.0
    utterance.volume = opts.volume ?? 1.0

    window.speechSynthesis.speak(utterance)
  }, [])

  const speakReading = useCallback((reading) => {
    // Readings are in hiragana/katakana — speak slightly slower
    speak(reading, { rate: (readAudioSettings().rate ?? 0.85) * 0.9 })
  }, [speak])

  const stop = useCallback(() => {
    if (window.speechSynthesis) window.speechSynthesis.cancel()
  }, [])

  // Refresh settings ref
  const getSettings = useCallback(() => readAudioSettings(), [])

  return { speak, speakReading, stop, isAvailable, getSettings }
}

// ─── AudioButton (standalone play button) ───────────────────────────────
// Small speaker icon that speaks the given text on click.
export function AudioButton({ text, reading, className = '' }) {
  const { speak, speakReading, isAvailable } = useAudio()
  const [playing, setPlaying] = useState(false)

  const handleClick = useCallback((e) => {
    e.stopPropagation()
    setPlaying(true)
    if (reading) speakReading(reading)
    else speak(text, { force: true })
    setTimeout(() => setPlaying(false), 800)
  }, [text, reading, speak, speakReading])

  if (!isAvailable) return null

  return (
    <button
      onClick={handleClick}
      className={`w-8 h-8 rounded-lg border flex items-center justify-center
                  transition-all duration-200 touch-manipulation
                  ${playing
                    ? 'bg-gold-400/15 border-gold-400/40 text-gold-400'
                    : 'bg-ink-700/50 border-gold-400/10 text-parchment-500/40 hover:border-gold-400/25 hover:text-parchment-400'
                  } ${className}`}
      title="Play pronunciation"
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="shrink-0">
        {playing ? (
          // Sound waves animation
          <>
            <path d="M3 5.5V8.5H5L8 11V3L5 5.5H3Z" fill="currentColor" opacity="0.7"/>
            <path d="M9.5 5C10.1 5.6 10.5 6.3 10.5 7C10.5 7.7 10.1 8.4 9.5 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            <path d="M11 3.5C12 4.8 12.5 5.9 12.5 7C12.5 8.1 12 9.2 11 10.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.5"/>
          </>
        ) : (
          // Speaker icon
          <>
            <path d="M3 5.5V8.5H5L8 11V3L5 5.5H3Z" fill="currentColor" opacity="0.5"/>
            <path d="M9.5 5C10.1 5.6 10.5 6.3 10.5 7C10.5 7.7 10.1 8.4 9.5 9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </>
        )}
      </svg>
    </button>
  )
}
