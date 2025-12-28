import React, { useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
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

/**
 * Extracts invite code from URL query parameters
 * Mobile messaging apps preserve query params (unlike hash fragments)
 */
const getInviteCodeFromQuery = (): string | null => {
  const urlParams = new URLSearchParams(window.location.search);
  const inviteCode = urlParams.get('invite');
  return inviteCode ? inviteCode.trim().toUpperCase() : null;
};

/**
 * Clears the invite query param from URL without page reload
 * Keeps the URL clean after processing the invite
 */
const clearInviteQueryParam = (): void => {
  const url = new URL(window.location.href);
  url.searchParams.delete('invite');
  window.history.replaceState({}, '', url.toString());
};

/**
 * Component that handles invite code from query params
 * Redirects to group-entry with the code if present
 */
const InviteCodeHandler: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const [handled, setHandled] = useState(false);

  useEffect(() => {
    const inviteCode = getInviteCodeFromQuery();
    if (inviteCode && !handled) {
      // Clear the query param to keep URL clean
      clearInviteQueryParam();
      // Navigate to the join route with the invite code
      navigate(`/join/${inviteCode}`, { replace: true });
      setHandled(true);
    } else {
      setHandled(true);
    }
  }, [navigate, handled]);

  // Wait until we've checked for invite code before rendering
  if (!handled) {
    return null;
  }

  return <>{children}</>;
};

const ProtectedRoute = ({ children }: { children?: React.ReactNode }) => {
  const isAuth = api.isAuthenticated();
  const location = useLocation();

  if (!isAuth) {
    // Preserve invite link in state so user can join after login
    const inviteCodeMatch = location.pathname.match(/^\/join\/(.+)$/);
    const inviteCode = inviteCodeMatch ? inviteCodeMatch[1] : null;
    return <Navigate to="/auth" replace state={{ from: location, inviteCode }} />;
  }
  
  // Check if user has a group
  let user;
  try {
     user = api.getUser();
  } catch(e) {
      api.logout();
      return <Navigate to="/auth" replace />;
  }

  // Allow access to group-entry and join routes even without a group
  const isGroupEntryRoute = location.pathname === '/group-entry' || location.pathname.startsWith('/join/');

  if (!user.groupId && !isGroupEntryRoute) {
      return <Navigate to="/group-entry" replace />;
  }

  if (user.groupId && location.pathname === '/group-entry') {
      return <Navigate to="/" replace />;
  }

  // If user has a group and tries to join another, redirect to home
  if (user.groupId && location.pathname.startsWith('/join/')) {
      return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <Router>
      <InviteCodeHandler>
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

        <Route path="/join/:inviteCode" element={
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
      </InviteCodeHandler>
    </Router>
  );
};

export default App;
