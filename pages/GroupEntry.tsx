
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Button from '../components/Button';
import Input from '../components/Input';
import Logo from '../components/Logo';
import { api } from '../services/supabaseService';
import { User } from '../types';
import { Users, UserPlus, ArrowRight } from 'lucide-react';

const GroupEntry: React.FC = () => {
  const navigate = useNavigate();
  const { inviteCode: urlInviteCode } = useParams<{ inviteCode?: string }>();
  
  const [user, setUser] = useState<User | null>(null);
  const [groupName, setGroupName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Get cached user
    try {
      const cachedUser = api.getUser();
      setUser(cachedUser);
    } catch {
      // Not logged in
    }
  }, []);

  // Normalize invite code - handle mobile input issues
  const normalizeInviteCode = (code: string): string => {
    if (!code) return '';
    
    let normalized = String(code).trim();
    if (!normalized) return '';
    
    // Handle URL-encoded characters
    let decodeAttempts = 0;
    while (decodeAttempts < 3) {
      try {
        const decoded = decodeURIComponent(normalized);
        if (decoded === normalized) break;
        normalized = decoded;
        decodeAttempts++;
      } catch {
        break;
      }
    }
    
    // Remove whitespace and special characters
    normalized = normalized.replace(/[\s\u200B-\u200D\uFEFF]/g, '');
    normalized = normalized.toUpperCase();
    normalized = normalized.replace(/[^A-Z0-9]/g, '');
    
    return normalized;
  };

  // Extract invite code from URL
  useEffect(() => {
    const extractAndSetCode = () => {
      if (urlInviteCode) {
        const normalized = normalizeInviteCode(urlInviteCode);
        if (normalized) {
          setInviteCode(normalized);
        }
        return;
      }
      
      // Check query parameters (mobile-friendly)
      const urlParams = new URLSearchParams(window.location.search);
      const queryInviteCode = urlParams.get('invite');
      if (queryInviteCode) {
        const normalized = normalizeInviteCode(queryInviteCode);
        if (normalized) {
          setInviteCode(normalized);
        }
        return;
      }
      
      // Fallback: check hash directly
      const hash = window.location.hash;
      const hashMatch = hash.match(/\/join\/([^\/\?#]+)/);
      if (hashMatch && hashMatch[1]) {
        const normalized = normalizeInviteCode(hashMatch[1]);
        if (normalized) {
          setInviteCode(normalized);
        }
      }
    };

    extractAndSetCode();

    window.addEventListener('hashchange', extractAndSetCode);
    return () => window.removeEventListener('hashchange', extractAndSetCode);
  }, [urlInviteCode]);

  const handleInviteCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInviteCode(e.target.value);
    setError('');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      await api.createGroup(groupName);
      // Force reload to pick up new group state
      window.location.href = '/';
    } catch (err: any) {
      setError(err.message || 'Failed to create group');
      setIsLoading(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!inviteCode) {
      setError('Please enter an invite code');
      return;
    }
    
    const finalCode = normalizeInviteCode(inviteCode);
    
    if (!finalCode || finalCode.length < 4) {
      setError('Invalid invite code format. Code should be alphanumeric and at least 4 characters.');
      return;
    }
    
    setInviteCode(finalCode);
    setIsLoading(true);
    
    try {
      await api.joinGroup(finalCode);
      // Force reload to pick up new group state
      window.location.href = '/';
    } catch (err: any) {
      const errorMsg = err.message || 'Failed to join group. Please check the invite code and try again.';
      setError(errorMsg);
      console.error('Join group error:', {
        error: err.message,
        normalizedCode: finalCode,
        codeLength: finalCode.length,
        originalInput: inviteCode,
        userAgent: navigator.userAgent
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await api.logout();
    navigate('/auth');
  };

  const userName = user?.name?.split(' ')[0] || 'there';

  return (
    <div className="min-h-screen bg-[#FFFBF5] flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        
        {/* Left Side: Context */}
        <div className="space-y-6 text-center md:text-left">
          <div className="inline-block bg-violet-600 p-3 rounded-2xl shadow-lg shadow-violet-200 mb-2">
            <Logo className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">
            Welcome, {userName}.
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
              <Button type="submit" fullWidth disabled={!groupName.trim() || isLoading}>
                {isLoading ? 'Creating...' : <>Create Group <ArrowRight size={18} className="ml-2" /></>}
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
                onChange={handleInviteCodeChange}
                autoCapitalize="characters"
                autoCorrect="off"
                autoComplete="off"
                spellCheck="false"
                inputMode="text"
                maxLength={20}
                required
              />
              {urlInviteCode && (
                <div className="text-xs text-slate-500 font-medium text-center">
                  Invite code detected from link. Click below to join.
                </div>
              )}
              <Button type="submit" variant="secondary" fullWidth disabled={!inviteCode.trim() || isLoading}>
                {isLoading ? 'Joining...' : (urlInviteCode ? 'Join Group Now' : 'Join Group')}
              </Button>
            </form>
          </div>
        </div>

      </div>
      
      <div className="mt-12">
        <button 
          onClick={handleLogout}
          className="text-slate-400 hover:text-slate-600 font-bold text-sm"
        >
          Sign Out
        </button>
      </div>
    </div>
  );
};

export default GroupEntry;
