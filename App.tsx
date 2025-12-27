import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import Auth from './pages/Auth';
import DailyCheckIn from './pages/DailyCheckIn';
import Resolutions from './pages/Resolutions';
import ResolutionDetail from './pages/ResolutionDetail';
import GroupResolutions from './pages/GroupResolutions';
import Leaderboard from './pages/Leaderboard';
import GroupFeed from './pages/GroupFeed';
import Profile from './pages/Profile';
import GroupEntry from './pages/GroupEntry';
import YearInReview from './pages/YearInReview';
import PeriodicReportPage from './pages/PeriodicReport';
import Graveyard from './pages/Graveyard';
import { api } from './services/mockService';

const ProtectedRoute = ({ children }: { children?: React.ReactNode }) => {
  const isAuth = api.isAuthenticated();
  const location = useLocation();

  if (!isAuth) {
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }
  
  // Check if user has a group
  let user;
  try {
     user = api.getUser();
  } catch(e) {
      api.logout();
      return <Navigate to="/auth" replace />;
  }

  if (!user.groupId && location.pathname !== '/group-entry') {
      return <Navigate to="/group-entry" replace />;
  }

  if (user.groupId && location.pathname === '/group-entry') {
      return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/auth" element={
            <Layout>
                <Auth />
            </Layout>
        } />
        
        <Route path="/group-entry" element={
            <ProtectedRoute>
                <Layout>
                    <GroupEntry />
                </Layout>
            </ProtectedRoute>
        } />

        <Route path="/" element={
          <ProtectedRoute>
            <Layout>
              <DailyCheckIn />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/resolutions" element={
          <ProtectedRoute>
            <Layout>
              <Resolutions />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/resolutions/:id" element={
          <ProtectedRoute>
            <Layout>
              <ResolutionDetail />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/group-resolutions" element={
          <ProtectedRoute>
            <Layout>
              <GroupResolutions />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/leaderboard" element={
          <ProtectedRoute>
            <Layout>
              <Leaderboard />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/feed" element={
          <ProtectedRoute>
            <Layout>
              <GroupFeed />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/profile" element={
          <ProtectedRoute>
            <Layout>
              <Profile />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/profile/:userId" element={
          <ProtectedRoute>
            <Layout>
              <Profile />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/reports" element={
          <ProtectedRoute>
            <Layout>
              <PeriodicReportPage />
            </Layout>
          </ProtectedRoute>
        } />

        <Route path="/year-in-review" element={
          <ProtectedRoute>
            <Layout>
              <YearInReview />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="/graveyard" element={
          <ProtectedRoute>
            <Layout>
              <Graveyard />
            </Layout>
          </ProtectedRoute>
        } />
        
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default App;
