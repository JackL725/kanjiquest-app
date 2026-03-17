import { supabase } from '@/lib/supabase'

const STORAGE_KEY = 'kq-srs-progress'
const STREAK_KEY  = 'kq-study-dates'

// ─── Upload local progress to Supabase ───────────────────────────────────
// Uses upsert so it merges with any existing cloud data.
// Conflict resolution: most recent updated_at wins.
export async function pushProgressToCloud(userId) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { pushed: 0 }

    const progress = JSON.parse(raw)
    const rows = []

    for (const deckId of Object.keys(progress)) {
      const deckProg = progress[deckId]
      if (!deckProg || typeof deckProg !== 'object') continue

      for (const cardId of Object.keys(deckProg)) {
        const p = deckProg[cardId]
        if (!p || !('stability' in p)) continue

        rows.push({
          user_id:        userId,
          deck_id:        deckId,
          card_id:        cardId,
          due:            p.due,
          stability:      p.stability,
          difficulty:     p.difficulty,
          elapsed_days:   p.elapsed_days || 0,
          scheduled_days: p.scheduled_days || 0,
          reps:           p.reps || 0,
          lapses:         p.lapses || 0,
          learning_steps: p.learning_steps || 0,
          state:          p.state || 0,
          last_review:    p.last_review || null,
          first_studied:  p.firstStudied || null,
        })
      }
    }

    if (rows.length === 0) return { pushed: 0 }

    // Batch upsert in chunks of 500
    const CHUNK = 500
    let pushed = 0
    for (let i = 0; i < rows.length; i += CHUNK) {
      const chunk = rows.slice(i, i + CHUNK)
      const { error } = await supabase
        .from('srs_progress')
        .upsert(chunk, { onConflict: 'user_id,deck_id,card_id' })

      if (error) throw error
      pushed += chunk.length
    }

    return { pushed }
  } catch (err) {
    console.error('Push progress failed:', err)
    throw err
  }
}

// ─── Pull cloud progress into localStorage ───────────────────────────────
// Merges with local data — cloud wins if cloud.updated_at > local.last_review
export async function pullProgressFromCloud(userId) {
  try {
    const { data, error } = await supabase
      .from('srs_progress')
      .select('*')
      .eq('user_id', userId)

    if (error) throw error
    if (!data || data.length === 0) return { pulled: 0 }

    const raw = localStorage.getItem(STORAGE_KEY)
    const local = raw ? JSON.parse(raw) : {}

    let pulled = 0
    for (const row of data) {
      const deckProg = local[row.deck_id] || {}
      const existing = deckProg[row.card_id]

      // Cloud wins if local doesn't exist or cloud is newer
      const cloudTime = new Date(row.updated_at).getTime()
      const localTime = existing?.last_review ? new Date(existing.last_review).getTime() : 0

      if (!existing || cloudTime > localTime) {
        deckProg[row.card_id] = {
          due:            row.due,
          stability:      row.stability,
          difficulty:     row.difficulty,
          elapsed_days:   row.elapsed_days,
          scheduled_days: row.scheduled_days,
          reps:           row.reps,
          lapses:         row.lapses,
          learning_steps: row.learning_steps,
          state:          row.state,
          last_review:    row.last_review,
          firstStudied:   row.first_studied,
        }
        local[row.deck_id] = deckProg
        pulled++
      }
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(local))
    return { pulled }
  } catch (err) {
    console.error('Pull progress failed:', err)
    throw err
  }
}

// ─── Full sync (pull then push) ──────────────────────────────────────────
export async function syncProgress(userId) {
  const pullResult = await pullProgressFromCloud(userId)
  const pushResult = await pushProgressToCloud(userId)
  return { ...pullResult, ...pushResult }
}

// ─── Sync study dates ────────────────────────────────────────────────────
export async function syncStudyDates(userId) {
  try {
    // Push local dates
    const raw = localStorage.getItem(STREAK_KEY)
    const localDates = raw ? JSON.parse(raw) : []

    if (localDates.length > 0) {
      const rows = localDates.map(date => ({
        user_id: userId,
        date,
      }))

      await supabase
        .from('study_dates')
        .upsert(rows, { onConflict: 'user_id,date' })
    }

    // Pull cloud dates
    const { data, error } = await supabase
      .from('study_dates')
      .select('date')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(365)

    if (error) throw error

    if (data) {
      const cloudDates = data.map(r => r.date)
      const merged = [...new Set([...localDates, ...cloudDates])].sort().slice(-365)
      localStorage.setItem(STREAK_KEY, JSON.stringify(merged))
    }
  } catch (err) {
    console.error('Sync study dates failed:', err)
  }
}

// ─── Fetch owned decks ───────────────────────────────────────────────────
export async function fetchOwnedDecks(userId) {
  try {
    const { data, error } = await supabase
      .from('owned_decks')
      .select('deck_id')
      .eq('user_id', userId)

    if (error) throw error
    return data?.map(r => r.deck_id) || []
  } catch (err) {
    console.error('Fetch owned decks failed:', err)
    return []
  }
}
