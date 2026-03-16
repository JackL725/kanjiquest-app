import { Routes, Route, Navigate } from 'react-router-dom'
import AppShell from '@/components/layout/AppShell'
import LibraryScreen   from '@/screens/LibraryScreen'
import BrowseScreen    from '@/screens/BrowseScreen'
import ProfileScreen   from '@/screens/ProfileScreen'
import RadicalsScreen  from '@/screens/RadicalsScreen'
import StudyScreen     from '@/screens/StudyScreen'
import DeckScreen      from '@/screens/DeckScreen'

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate to="/library" replace />} />
        <Route path="library"  element={<LibraryScreen />} />
        <Route path="browse"   element={<BrowseScreen />} />
        <Route path="profile"  element={<ProfileScreen />} />
        <Route path="radicals" element={<RadicalsScreen />} />
        <Route path="deck/:id" element={<DeckScreen />} />
        <Route path="study/:id" element={<StudyScreen />} />
      </Route>
    </Routes>
  )
}
