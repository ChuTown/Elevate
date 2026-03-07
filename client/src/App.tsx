import { Routes, Route } from 'react-router-dom'
import HomePage from './pages/HomePage'
import CreateProfile from './pages/CreateProfile'

export default function App() {
  return (
    <div id="app-root">
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/create-profile" element={<CreateProfile />} />
      </Routes>
    </div>
  )
}

