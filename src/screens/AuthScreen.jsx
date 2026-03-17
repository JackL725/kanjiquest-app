import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { syncProgress, syncStudyDates } from '@/lib/sync'

const GUEST_KEY = 'kq-guest-mode'

export function isGuestMode() {
  try { return localStorage.getItem(GUEST_KEY) === 'true' } catch { return false }
}

export function setGuestMode(val) {
  try { localStorage.setItem(GUEST_KEY, val ? 'true' : 'false') } catch {}
}

// ─── AuthScreen ──────────────────────────────────────────────────────────
export default function AuthScreen() {
  const navigate = useNavigate()
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSuccess(null)

    if (!email.trim()) return setError('Email is required')
    if (!password) return setError('Password is required')
    if (password.length < 6) return setError('Password must be at least 6 characters')
    if (mode === 'signup' && !displayName.trim()) return setError('Display name is required')

    setLoading(true)
    try {
      if (mode === 'signup') {
        const data = await signUp(email.trim(), password, displayName.trim())
        // Supabase may require email confirmation
        if (data?.user?.identities?.length === 0) {
          setError('An account with this email already exists')
        } else {
          setSuccess('Check your email to confirm your account, then sign in.')
          setMode('signin')
        }
      } else {
        const data = await signIn(email.trim(), password)
        setGuestMode(false)
        // Sync local progress to cloud on first sign-in
        if (data?.user) {
          try { await syncProgress(data.user.id) } catch {}
          try { await syncStudyDates(data.user.id) } catch {}
        }
        navigate('/library', { replace: true })
      }
    } catch (err) {
      const msg = err?.message || 'Something went wrong'
      if (msg.includes('Invalid login')) setError('Invalid email or password')
      else if (msg.includes('already registered')) setError('An account with this email already exists')
      else if (msg.includes('Email not confirmed')) setError('Please confirm your email first — check your inbox')
      else setError(msg)
    } finally {
      setLoading(false)
    }
  }

  function handleGuest() {
    setGuestMode(true)
    navigate('/library', { replace: true })
  }

  const isSignUp = mode === 'signup'

  return (
    <div className="min-h-full bg-ink-950 flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-10 max-w-sm mx-auto w-full">

        {/* Brand */}
        <div className="text-center mb-10 animate-fade-up">
          <span className="font-kanji text-6xl text-gold-400/20 block mb-3">漢字</span>
          <h1 className="font-display italic text-3xl text-gold-400 tracking-wide">KanjiQuest</h1>
          <p className="font-mono text-[10px] text-parchment-500 tracking-widest uppercase mt-2">
            Learn kanji through the games you love
          </p>
        </div>

        {/* Tab toggle */}
        <div className="w-full flex bg-ink-800 border border-gold-400/10 rounded-lg p-0.5 gap-0.5 mb-6 animate-fade-up"
             style={{ animationDelay: '0.05s' }}>
          {[
            { key: 'signin', label: 'Sign in' },
            { key: 'signup', label: 'Create account' },
          ].map(t => (
            <button key={t.key}
              onClick={() => { setMode(t.key); setError(null); setSuccess(null) }}
              className={`flex-1 font-mono text-[10px] tracking-wide py-2 rounded-md transition-colors duration-150
                ${mode === t.key
                  ? 'bg-ink-700 text-gold-400 border border-gold-400/20'
                  : 'text-parchment-500/50 hover:text-parchment-400'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full space-y-4 animate-fade-up" style={{ animationDelay: '0.1s' }}>

          {/* Display name (sign up only) */}
          {isSignUp && (
            <div>
              <label className="font-mono text-[9px] text-parchment-500/60 tracking-widest uppercase block mb-1.5">
                Display name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={e => setDisplayName(e.target.value)}
                placeholder="Your name"
                autoComplete="name"
                className="w-full bg-ink-800 border border-gold-400/12 rounded-xl px-4 py-3
                           font-body text-sm text-parchment-200 placeholder:text-parchment-500/25
                           outline-none focus:border-gold-400/40 transition-colors"
              />
            </div>
          )}

          {/* Email */}
          <div>
            <label className="font-mono text-[9px] text-parchment-500/60 tracking-widest uppercase block mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className="w-full bg-ink-800 border border-gold-400/12 rounded-xl px-4 py-3
                         font-body text-sm text-parchment-200 placeholder:text-parchment-500/25
                         outline-none focus:border-gold-400/40 transition-colors"
            />
          </div>

          {/* Password */}
          <div>
            <label className="font-mono text-[9px] text-parchment-500/60 tracking-widest uppercase block mb-1.5">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder={isSignUp ? 'At least 6 characters' : 'Your password'}
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              className="w-full bg-ink-800 border border-gold-400/12 rounded-xl px-4 py-3
                         font-body text-sm text-parchment-200 placeholder:text-parchment-500/25
                         outline-none focus:border-gold-400/40 transition-colors"
            />
          </div>

          {/* Error message */}
          {error && (
            <div className="bg-ember/10 border border-ember/25 rounded-xl px-4 py-3">
              <p className="font-mono text-[11px] text-ember leading-snug">{error}</p>
            </div>
          )}

          {/* Success message */}
          {success && (
            <div className="bg-emerald-400/10 border border-emerald-400/25 rounded-xl px-4 py-3">
              <p className="font-mono text-[11px] text-emerald-400 leading-snug">{success}</p>
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3.5 rounded-xl font-display italic text-lg transition-all duration-200
              ${loading
                ? 'bg-gold-400/20 text-gold-400/40 cursor-wait'
                : 'bg-gold-400/15 border border-gold-400/40 text-gold-400 hover:bg-gold-400/25 hover:border-gold-400/60'}`}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-gold-400/30 border-t-gold-400 rounded-full animate-spin" />
                {isSignUp ? 'Creating account...' : 'Signing in...'}
              </span>
            ) : (
              isSignUp ? 'Create account' : 'Sign in'
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="w-full flex items-center gap-3 my-6 animate-fade-up" style={{ animationDelay: '0.15s' }}>
          <div className="flex-1 h-px bg-gold-400/10" />
          <span className="font-mono text-[8px] text-parchment-500/30 tracking-widest uppercase">or</span>
          <div className="flex-1 h-px bg-gold-400/10" />
        </div>

        {/* Continue as guest */}
        <button
          onClick={handleGuest}
          className="w-full py-3 rounded-xl border border-parchment-500/15 font-display italic text-base
                     text-parchment-500 hover:text-parchment-300 hover:border-parchment-500/30
                     transition-colors duration-200 animate-fade-up"
          style={{ animationDelay: '0.2s' }}
        >
          Continue as guest
        </button>
        <p className="font-mono text-[9px] text-parchment-500/30 tracking-wide mt-2 text-center animate-fade-up"
           style={{ animationDelay: '0.22s' }}>
          Progress saved locally — sign in anytime to sync across devices
        </p>
      </div>
    </div>
  )
}
