
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

  // Auto-fill invite code from URL if present and auto-join
  useEffect(() => {
    if (urlInviteCode) {
      setInviteCode(urlInviteCode);
      // Auto-submit if code is in URL (give it a moment for component to mount)
      const timer = setTimeout(() => {
        setError('');
        try {
          // Check if user already has a group
          const user = api.getUser();
          if (user.groupId) {
            setError('You are already in a group. Leave your current group first to join another.');
            return;
          }
          
          api.joinGroup(urlInviteCode);
          navigate('/', { replace: true });
        } catch (err: any) {
          setError(err.message || 'Failed to join group');
        }
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [urlInviteCode, navigate]);

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
    try {
      // Service now handles normalization, just pass the raw input
      api.joinGroup(inviteCode);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Failed to join group');
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
                onChange={(e) => setInviteCode(e.target.value)}
                required
              />
              <Button type="submit" variant="secondary" fullWidth disabled={!inviteCode.trim()}>
                Join Group
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
