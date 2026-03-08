import { Routes, Route } from 'react-router-dom'
import HomePage from '../pages/HomePage'
import CreateProfile from '../pages/CreateProfile'
import ProfileBuilder from '../pages/ProfileBuilder'
import AvailabilityPage from '../pages/AvailabilityPage'
import LoginPage from '../pages/LoginPage'
import ProfileDetailsPage from '../pages/ProfileDetailsPage'
import ChatPage from '../pages/ChatPage'
import AllProfessionalsPage from '../pages/AllProfessionalsPage'
import ProtectedRoute from '../components/ProtectedRoute'
import GuestOnlyRoute from '../components/GuestOnlyRoute'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/professionals" element={<AllProfessionalsPage />} />
      <Route path="/profiles/:userId" element={<ProfileDetailsPage />} />
      <Route path="/chat/:professionalId" element={<ChatPage />} />
      <Route
        path="/create-profile"
        element={
          <ProtectedRoute>
            <CreateProfile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile-builder"
        element={
          <ProtectedRoute>
            <ProfileBuilder />
          </ProtectedRoute>
        }
      />
      <Route
        path="/availability"
        element={
          <ProtectedRoute>
            <AvailabilityPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/login"
        element={
          <GuestOnlyRoute>
            <LoginPage />
          </GuestOnlyRoute>
        }
      />
    </Routes>
  )
}
