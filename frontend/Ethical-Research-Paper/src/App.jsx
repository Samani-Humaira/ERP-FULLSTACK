import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import DashboardLayout from "./components/layout/DashboardLayout";
import LoginPage from "./pages/auth/LoginPage";
import SignUpPage from "./pages/auth/SignUpPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import DashboardPage from "./pages/DashboardPage";
import ResearchInputPage from "./pages/ResearchInputPage";
import PapersPage from "./pages/PapersPage";
import ProjectsPage from "./pages/ProjectsPage";
import GapAnalysisPage from "./pages/GapAnalysisPage";
import ProposalPage from "./pages/ProposalPage";
import PaperPage from "./pages/PaperPage";
import ProjectDetailPage from "./pages/ProjectDetailPage";
import ProfilePage from "./pages/ProfilePage";
import AllVersions from "./pages/allVersion";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Auth routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        {/* App routes with dashboard layout */}
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/research" element={<ResearchInputPage />} />
          <Route path="/papers" element={<PapersPage />} />
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:id" element={<ProjectDetailPage />} />
          <Route path="/gap-analysis" element={<GapAnalysisPage />} />
          <Route path="/proposal" element={<ProposalPage />} />
          <Route path="/paper" element={<PaperPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/projects/:projectId/versions" element={<AllVersions />} />
        </Route>

        {/* Default redirect */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
