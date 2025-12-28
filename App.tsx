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
import { api, supabase } from './services/supabaseService';
import { Group } from './types';

/**
 * Extracts invite code from URL query parameters
 */
const getInviteCodeFromQuery = (): string | null => {
  const urlParams = new URLSearchParams(window.location.search);
  const inviteCode = urlParams.get('invite');
  return inviteCode ? inviteCode.trim().toUpperCase() : null;
};

/**
 * Clears the invite query param from URL without page reload
 */
const clearInviteQueryParam = (): void => {
  const url = new URL(window.location.href);
  url.searchParams.delete('invite');
  window.history.replaceState({}, '', url.toString());
};

/**
 * Component that handles invite code from query params
 */
const InviteCodeHandler: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const [handled, setHandled] = useState(false);

  useEffect(() => {
    const inviteCode = getInviteCodeFromQuery();
    if (inviteCode && !handled) {
      clearInviteQueryParam();
      navigate(`/join/${inviteCode}`, { replace: true });
      setHandled(true);
    } else {
      setHandled(true);
    }
  }, [navigate, handled]);

  if (!handled) return null;
  return <>{children}</>;
};

const ProtectedRoute = ({ children }: { children?: React.ReactNode }) => {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [group, setGroup] = useState<Group | null>(null);
  const location = useLocation();

  useEffect(() => {
    const checkAuth = async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          setIsAuthenticated(true);
          localStorage.setItem('sb-session-user-id', session.user.id);
          
          // Cache user data
          await api._cacheCurrentUser(session.user.id);
          
          // Check for group
          const userGroup = await api.getGroup();
          setGroup(userGroup);
        } else {
          setIsAuthenticated(false);
          setGroup(null);
        }
      } catch (e) {
        console.error('Auth check error:', e);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setIsAuthenticated(true);
        localStorage.setItem('sb-session-user-id', session.user.id);
        await api._cacheCurrentUser(session.user.id);
        const userGroup = await api.getGroup();
        setGroup(userGroup);
      } else {
        setIsAuthenticated(false);
        setGroup(null);
        localStorage.removeItem('sb-session-user-id');
        localStorage.removeItem('sb-cached-user');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FFFBF5] flex items-center justify-center">
        <div className="text-slate-500 font-medium">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    const inviteCodeMatch = location.pathname.match(/^\/join\/(.+)$/);
    const inviteCode = inviteCodeMatch ? inviteCodeMatch[1] : null;
    return <Navigate to="/auth" replace state={{ from: location, inviteCode }} />;
  }

  const isGroupEntryRoute = location.pathname === '/group-entry' || location.pathname.startsWith('/join/');

  if (!group && !isGroupEntryRoute) {
    return <Navigate to="/group-entry" replace />;
  }

  if (group && location.pathname === '/group-entry') {
    return <Navigate to="/" replace />;
  }

  if (group && location.pathname.startsWith('/join/')) {
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
