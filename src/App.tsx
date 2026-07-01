import { Routes, Route, Navigate } from 'react-router-dom'
import SubmissionListPage from './pages/SubmissionListPage'
import IntakePage from './pages/IntakePage'
import SubmissionDetailPage from './pages/SubmissionDetailPage'
import CopeReviewPage from './pages/CopeReviewPage'
import RiskDossierPage from './pages/RiskDossierPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/submissions" replace />} />
      <Route path="/submissions" element={<SubmissionListPage />} />
      <Route path="/submissions/new" element={<IntakePage />} />
      <Route path="/submissions/:id" element={<SubmissionDetailPage />} />
      <Route path="/submissions/:id/review" element={<CopeReviewPage />} />
      <Route path="/submissions/:id/dossier" element={<RiskDossierPage />} />
    </Routes>
  )
}
