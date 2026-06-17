import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import NotFound from './pages/NotFound'
import LandingPage from './pages/LandingPage'
import ChatPage from './pages/user/ChatPage'
import AdminLogin from './pages/admin/AdminLogin'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminKnowledge from './pages/admin/AdminKnowledge'
import AdminAnnouncements from './pages/admin/AdminAnnouncements'
import AdminAnalytics from './pages/admin/AdminAnalytics'
import AdminSubscribers from './pages/admin/AdminSubscribers'
import AdminQRCode from './pages/admin/AdminQRCode'
import AdminOfficeProcesses from './pages/admin/AdminOfficeProcesses'
import AdminChatLogs from './pages/admin/AdminChatLogs'
import AdminSettings from './pages/admin/AdminSettings'
import AdminConcerns from './pages/admin/AdminConcerns'
import AdminLiveChats from './pages/admin/AdminLiveChats'
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
          <Route path="qrcode"           element={<AdminQRCode />} />
          <Route path="office-processes" element={<AdminOfficeProcesses />} />
          <Route path="chatlogs"         element={<AdminChatLogs />} />
          <Route path="settings"         element={<AdminSettings />} />
          <Route path="concerns"         element={<AdminConcerns />} />
          <Route path="live-chats"       element={<AdminLiveChats />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}
