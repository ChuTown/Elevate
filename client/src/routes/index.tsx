import { Routes, Route } from 'react-router-dom'
import HomePage from '../pages/HomePage'
import CreateProfile from '../pages/CreateProfile'
import ProfileBuilder from '../pages/ProfileBuilder'
import LoginPage from '../pages/LoginPage'
import SignupPage from '../pages/SignupPage'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/create-profile" element={<CreateProfile />} />
      <Route path="/profile-builder" element={<ProfileBuilder />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
    </Routes>
  )
}
