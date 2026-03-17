import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://zgawhdlwfwjpsdwtbowg.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpnYXdoZGx3ZndqcHNkd3Rib3dnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3NjQ4MjcsImV4cCI6MjA4OTM0MDgyN30.JQh4xjsR1MIWceZ0JK-ONagOC3u99pBriVW8JrKFGZ8'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})
