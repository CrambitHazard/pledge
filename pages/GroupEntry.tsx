
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '../components/Button';
import Input from '../components/Input';
import Logo from '../components/Logo';
import { api } from '../services/mockService';
import { Users, UserPlus, ArrowRight } from 'lucide-react';

const GroupEntry: React.FC = () => {
  const navigate = useNavigate();
  const { inviteCode: urlInviteCode } = useParams<{ inviteCode?: string }>();
  const [groupName, setGroupName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');

  // Extract invite code from URL params or hash (mobile fallback)
  const extractInviteCode = React.useCallback((): string | null => {
    // First try URL params (works on desktop)
    if (urlInviteCode) {
      return urlInviteCode;
    }
    
    // Fallback: read directly from hash (more reliable on mobile)
    const hash = window.location.hash;
    const hashMatch = hash.match(/\/join\/([^\/\?#]+)/);
    if (hashMatch && hashMatch[1]) {
      return hashMatch[1];
    }
    
    return null;
  }, [urlInviteCode]);

  // Auto-fill invite code from URL if present
  useEffect(() => {
    const codeFromUrl = extractInviteCode();
    if (codeFromUrl) {
      // Normalize the invite code (handle URL encoding and case)
      let normalizedCode: string;
      try {
        normalizedCode = decodeURIComponent(codeFromUrl).trim().toUpperCase();
      } catch {
        // If decode fails, just uppercase
        normalizedCode = codeFromUrl.trim().toUpperCase();
      }
      
      // Remove any non-alphanumeric characters
      normalizedCode = normalizedCode.replace(/[^A-Z0-9]/g, '');
      
      if (!normalizedCode) {
        setError('Invalid invite code format');
        return;
      }
      
      setInviteCode(normalizedCode);
      
      // Try auto-join after a delay (mobile browsers may need more time)
      const timer = setTimeout(() => {
        setError('');
        try {
          // Check if user already has a group
          const user = api.getUser();
          if (user.groupId) {
            setError('You are already in a group. Leave your current group first to join another.');
            return;
          }
          
          // Attempt to join
          api.joinGroup(normalizedCode);
          navigate('/', { replace: true });
        } catch (err: any) {
          // Don't auto-join on error, let user manually click the button
          setError(err.message || 'Failed to join group. Please try clicking "Join Group" button.');
        }
      }, 800); // Increased delay for mobile browsers
      return () => clearTimeout(timer);
    }
  }, [urlInviteCode, navigate, extractInviteCode]);

  // Listen for hash changes (mobile browser navigation)
  useEffect(() => {
    const handleHashChange = () => {
      const codeFromUrl = extractInviteCode();
      if (codeFromUrl && !inviteCode) {
        let normalizedCode: string;
        try {
          normalizedCode = decodeURIComponent(codeFromUrl).trim().toUpperCase();
        } catch {
          normalizedCode = codeFromUrl.trim().toUpperCase();
        }
        normalizedCode = normalizedCode.replace(/[^A-Z0-9]/g, '');
        if (normalizedCode) {
          setInviteCode(normalizedCode);
        }
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [extractInviteCode, inviteCode]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      api.createGroup(groupName);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Failed to create group');
    }
  };

  const handleJoin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');
    
    // Use URL code if present, otherwise use input
    const codeFromUrl = extractInviteCode();
    let codeToUse = codeFromUrl || inviteCode;
    
    if (!codeToUse || !codeToUse.trim()) {
      setError('Please enter an invite code');
      return;
    }
    
    // Normalize the code
    try {
      codeToUse = decodeURIComponent(codeToUse).trim().toUpperCase();
    } catch {
      codeToUse = codeToUse.trim().toUpperCase();
    }
    codeToUse = codeToUse.replace(/[^A-Z0-9]/g, '');
    
    if (!codeToUse) {
      setError('Invalid invite code format');
      return;
    }
    
    try {
      // Service now handles normalization, but we'll normalize here too for mobile compatibility
      api.joinGroup(codeToUse);
      navigate('/', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Failed to join group. Please check the invite code and try again.');
    }
  };


  const user = api.getUser();

  return (
    <div className="min-h-screen bg-[#FFFBF5] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        
        {/* Left Side: Context */}
        <div className="space-y-6 text-center md:text-left">
          <div className="inline-block bg-violet-600 p-3 rounded-2xl shadow-lg shadow-violet-200 mb-2">
            <Logo className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">
            Welcome, {user.name.split(' ')[0]}.
          </h1>
          <p className="text-xl text-slate-500 font-medium leading-relaxed">
            Pledge is a group-based accountability system. You must be part of a pack to continue.
          </p>
          <div className="flex flex-col gap-4 text-sm font-bold text-slate-400 uppercase tracking-wider pt-4">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">1</span>
              <span>Join or Create a Group</span>
            </div>
            <div className="flex items-center gap-3 opacity-50">
              <span className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">2</span>
              <span>Make your Pledge</span>
            </div>
            <div className="flex items-center gap-3 opacity-50">
              <span className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center">3</span>
              <span>Compete daily</span>
            </div>
          </div>
        </div>

        {/* Right Side: Action Cards */}
        <div className="space-y-6">
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-600 text-sm font-bold text-center">
              {error}
            </div>
          )}

          {/* Create Group Card */}
          <div className="bg-white p-8 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 transition-all hover:border-violet-200">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-violet-50 rounded-xl text-violet-600">
                <Users size={24} />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Start a New Group</h2>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <Input 
                placeholder="Group Name (e.g. The Spartans)" 
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                required
              />
              <Button type="submit" fullWidth disabled={!groupName.trim()}>
                Create Group <ArrowRight size={18} className="ml-2" />
              </Button>
            </form>
          </div>

          <div className="relative flex items-center py-2">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink-0 mx-4 text-slate-400 text-sm font-bold uppercase">OR</span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          {/* Join Group Card */}
          <div className="bg-white p-8 rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 transition-all hover:border-orange-200">
            <div className="flex items-center gap-3 mb-6">
               <div className="p-2 bg-orange-50 rounded-xl text-orange-600">
                <UserPlus size={24} />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Join Existing Group</h2>
            </div>
            <form onSubmit={handleJoin} className="space-y-4">
              <Input 
                placeholder="Enter Invite Code" 
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                autoComplete="off"
                autoCapitalize="characters"
                required
              />
              {(urlInviteCode || extractInviteCode()) && (
                <div className="text-xs text-slate-500 font-medium text-center">
                  Invite code detected from link. Click below to join.
                </div>
              )}
              <Button 
                type="submit" 
                variant="secondary" 
                fullWidth 
                disabled={!inviteCode.trim() && !extractInviteCode()}
                onClick={() => handleJoin()}
              >
                {(urlInviteCode || extractInviteCode()) ? 'Join Group Now' : 'Join Group'}
              </Button>
            </form>
          </div>
        </div>

      </div>
      
      <div className="mt-12">
        <button 
          onClick={() => { api.logout(); navigate('/auth'); }}
          className="text-slate-400 hover:text-slate-600 font-bold text-sm"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
};

export default GroupEntry;
