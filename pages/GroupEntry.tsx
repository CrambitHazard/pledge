
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

  // Normalize invite code - handle mobile input issues
  // MUST match the backend normalization exactly
  const normalizeInviteCode = (code: string): string => {
    if (!code) return '';
    
    // Convert to string and trim
    let normalized = String(code).trim();
    
    if (!normalized) return '';
    
    // Handle URL-encoded characters (may be double-encoded on mobile)
    let decodeAttempts = 0;
    while (decodeAttempts < 3) {
      try {
        const decoded = decodeURIComponent(normalized);
        if (decoded === normalized) break; // No more encoding to decode
        normalized = decoded;
        decodeAttempts++;
      } catch {
        break; // Can't decode further
      }
    }
    
    // Remove ALL whitespace (spaces, tabs, newlines, zero-width spaces)
    normalized = normalized.replace(/[\s\u200B-\u200D\uFEFF]/g, '');
    
    // Convert to uppercase
    normalized = normalized.toUpperCase();
    
    // Remove any non-alphanumeric characters
    normalized = normalized.replace(/[^A-Z0-9]/g, '');
    
    return normalized;
  };

  // Extract invite code from URL (for invite links)
  useEffect(() => {
    const extractAndSetCode = () => {
      // Try URL params first (from route)
      if (urlInviteCode) {
        const normalized = normalizeInviteCode(urlInviteCode);
        if (normalized) {
          setInviteCode(normalized);
        }
        return;
      }
      
      // Fallback 1: Check query parameters (mobile-friendly invite links)
      // Query params like ?invite=CODE are preserved by mobile messaging apps
      const urlParams = new URLSearchParams(window.location.search);
      const queryInviteCode = urlParams.get('invite');
      if (queryInviteCode) {
        const normalized = normalizeInviteCode(queryInviteCode);
        if (normalized) {
          setInviteCode(normalized);
        }
        return;
      }
      
      // Fallback 2: check hash directly (legacy support)
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

    // Listen for hash changes (browser navigation)
    const handleHashChange = () => {
      extractAndSetCode();
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [urlInviteCode]);

  // Handle input changes - normalize as user types but preserve their input visually
  const handleInviteCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    // Allow user to type freely, but normalize for storage
    // This prevents mobile keyboard interference
    setInviteCode(rawValue);
    setError(''); // Clear error when user types
  };

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

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!inviteCode) {
      setError('Please enter an invite code');
      return;
    }
    
    // Normalize the code - this handles all mobile input issues
    const finalCode = normalizeInviteCode(inviteCode);
    
    if (!finalCode || finalCode.length < 4) {
      setError('Invalid invite code format. Code should be alphanumeric and at least 4 characters.');
      return;
    }
    
    // Update the input field to show the normalized version
    setInviteCode(finalCode);
    
    try {
      // Double-check user isn't already in a group
      const user = api.getUser();
      if (user.groupId) {
        setError('You are already in a group. Leave your current group first to join another.');
        return;
      }
      
      // Pass the normalized code to the API
      // The API will normalize again, but that's fine - normalization is idempotent
      api.joinGroup(finalCode);
      navigate('/', { replace: true });
    } catch (err: any) {
      // Provide more helpful error messages
      const errorMsg = err.message || 'Failed to join group. Please check the invite code and try again.';
      setError(errorMsg);
      
      // Always log for debugging (helps identify mobile issues)
      console.error('Join group error:', {
        error: err.message,
        normalizedCode: finalCode,
        codeLength: finalCode.length,
        originalInput: inviteCode,
        userAgent: navigator.userAgent
      });
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
              <Button type="submit" variant="secondary" fullWidth disabled={!inviteCode.trim()}>
                {urlInviteCode ? 'Join Group Now' : 'Join Group'}
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