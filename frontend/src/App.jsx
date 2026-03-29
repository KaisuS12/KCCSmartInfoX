import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import ChatPage from './pages/user/ChatPage'
import AdminLogin from './pages/admin/AdminLogin'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminKnowledge from './pages/admin/AdminKnowledge'
import AdminAnnouncements from './pages/admin/AdminAnnouncements'
import AdminAnalytics from './pages/admin/AdminAnalytics'
import AdminSubscribers from './pages/admin/AdminSubscribers'
import AdminSchoolInfo from './pages/admin/AdminSchoolInfo'
import AdminQRCode from './pages/admin/AdminQRCode'
import ProtectedRoute from './components/shared/ProtectedRoute'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing page */}
        <Route path="/" element={<LandingPage />} />

        {/* Chat */}
        <Route path="/chat" element={<ChatPage />} />

        {/* Admin Auth */}
        <Route path="/admin/login" element={<AdminLogin />} />

        {/* Protected Admin Routes */}
        <Route path="/admin" element={<ProtectedRoute />}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard"     element={<AdminDashboard />} />
          <Route path="knowledge"     element={<AdminKnowledge />} />
          <Route path="announcements" element={<AdminAnnouncements />} />
          <Route path="analytics"     element={<AdminAnalytics />} />
          <Route path="subscribers"   element={<AdminSubscribers />} />
          <Route path="school-info"   element={<AdminSchoolInfo />} />
          <Route path="qrcode"        element={<AdminQRCode />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
