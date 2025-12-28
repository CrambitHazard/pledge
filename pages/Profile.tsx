import React, { useState, useEffect } from 'react';
import { api } from '../services/supabaseService';
import { Award, Target, LogOut, Copy, Users, FileText, ArrowRight, Calendar, Archive, Medal, Tag, ArrowLeft, Globe, Flame, CheckSquare, Link as LinkIcon, X, Shield } from 'lucide-react';
import Button from '../components/Button';
import { useNavigate, useParams } from 'react-router-dom';
import { User, Resolution } from '../types';

const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string }>();
  
  // State
  const [user, setUser] = useState<User | null>(null);
  const [publicResolutions, setPublicResolutions] = useState<Resolution[]>([]);
  const [breakdown, setBreakdown] = useState<{ title: string, points: number, days: number, difficulty: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [groupMembers, setGroupMembers] = useState<User[]>([]);

  // Derivations
  const currentUser = api.getUser();
  const isOwnProfile = !userId || userId === currentUser.id;
  const group = api.getGroup();
  const isAdmin = api.isGroupAdmin();

  useEffect(() => {
      let targetUser: User | undefined;
      
      if (isOwnProfile) {
          targetUser = currentUser;
      } else {
          targetUser = api.getUserById(userId!);
      }

      if (targetUser) {
          setUser(targetUser);
          setBreakdown(api.getScoreBreakdown(targetUser.id));
          if (!isOwnProfile) {
              setPublicResolutions(api.getPublicResolutions(targetUser.id));
          }
          
          // Load group members if viewing own profile and user is admin
          if (isOwnProfile && group) {
              const members = group.memberIds
                  .map(id => api.getUserById(id))
                  .filter((u): u is User => u !== undefined);
              setGroupMembers(members);
          }
      } else {
          // If user not found, redirect to own profile or dashboard
          navigate('/profile');
      }
      setLoading(false);
  }, [userId, group, isOwnProfile]);

  const handleLogout = () => {
      api.logout();
      navigate('/auth', { replace: true });
  };

  const copyInviteCode = async () => {
    if (group?.inviteCode) {
        try {
            // Use modern clipboard API with fallback for older browsers/mobile
            if (navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(group.inviteCode);
            } else {
                // Fallback for older browsers/mobile
                const textArea = document.createElement('textarea');
                textArea.value = group.inviteCode;
                textArea.style.position = 'fixed';
                textArea.style.opacity = '0';
                document.body.appendChild(textArea);
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
            }
        } catch (e: any) {
            console.error('Failed to copy invite code:', e);
            // Fallback: show code in alert for manual copy
            alert(`Invite Code: ${group.inviteCode}\n\nPlease copy this code manually.`);
        }
    }
  };

  const copyInviteLink = async () => {
    try {
        const link = api.getInviteLink();
        // Use modern clipboard API with fallback for older browsers/mobile
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(link);
        } else {
            // Fallback for older browsers/mobile
            const textArea = document.createElement('textarea');
            textArea.value = link;
            textArea.style.position = 'fixed';
            textArea.style.opacity = '0';
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
        }
    } catch (e: any) {
        console.error('Failed to copy invite link:', e);
        // Fallback: show link in alert for manual copy
        try {
            const link = api.getInviteLink();
            alert(`Invite Link: ${link}\n\nPlease copy this link manually.`);
        } catch {
            alert('Failed to generate invite link. Please try again.');
        }
    }
  };

  const handleRemoveMember = (memberId: string) => {
    if (!confirm('Are you sure you want to remove this member from the group?')) {
        return;
    }
    
    try {
        api.removeMember(memberId);
        // Refresh group and members
        const updatedGroup = api.getGroup();
        if (updatedGroup) {
            const members = updatedGroup.memberIds
                .map(id => api.getUserById(id))
                .filter((u): u is User => u !== undefined);
            setGroupMembers(members);
        }
    } catch (e: any) {
        alert(e.message || 'Failed to remove member');
    }
  };

  const handleLeaveGroup = () => {
    if (!confirm('Are you sure you want to leave this group? You will need an invite code to rejoin.')) {
        return;
    }
    try {
        api.leaveGroup();
        navigate('/group-entry', { replace: true });
    } catch (err: any) {
        alert(err.message || 'Failed to leave group');
    }
  };

  if (loading || !user) return <div className="p-10 text-center text-slate-400">Loading Profile...</div>;

  return (
    <div className="max-w-2xl mx-auto space-y-10 pb-10">
      
      {!isOwnProfile && (
          <div>
              <Button variant="ghost" onClick={() => navigate(-1)} className="pl-0 hover:bg-transparent hover:text-violet-600">
                <ArrowLeft size={20} className="mr-2" /> Back
              </Button>
          </div>
      )}

      <header className="flex flex-col items-center text-center space-y-6 py-8">
        <div className="relative">
            <div className={`absolute inset-0 rounded-full blur-xl opacity-50 transform scale-110 ${isOwnProfile ? 'bg-violet-200' : 'bg-slate-200'}`}></div>
            <div className="w-36 h-36 rounded-full bg-slate-900 text-white flex items-center justify-center text-5xl font-black ring-8 ring-white shadow-2xl relative z-10">
                {user.avatarInitials}
            </div>
            {/* Identity Label Badge */}
            <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 z-20">
                <div className="bg-slate-800 text-white px-4 py-1.5 rounded-full border-2 border-white shadow-lg flex items-center gap-2 whitespace-nowrap">
                    <Tag size={14} className="text-violet-300" />
                    <span className="text-xs font-bold uppercase tracking-wider">{user.seasonalLabel || 'New Recruit'}</span>
                </div>
            </div>
        </div>
        <div className="pt-4">
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">{user.name}</h1>
            {isOwnProfile && <p className="text-slate-500 font-medium mt-2">{user.email}</p>}
        </div>
        
        {/* Badges Section */}
        {user.badges && user.badges.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2 animate-in fade-in slide-in-from-bottom-2">
                {user.badges.map((badge, i) => (
                    <div key={i} className="bg-yellow-100 text-yellow-800 px-3 py-1.5 rounded-full text-xs font-bold border border-yellow-200 flex items-center gap-1.5 shadow-sm">
                        <Medal size={14} /> {badge}
                    </div>
                ))}
            </div>
        )}
      </header>
      
      {/* Stats Overview */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center transition-all duration-300 group">
            <div className="bg-violet-50 p-4 rounded-2xl mb-4">
                <Award size={32} className="text-violet-600" />
            </div>
            <span className="text-5xl font-black text-slate-900 mb-2">{user.score}</span>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Total Score</span>
        </div>
        <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center transition-all duration-300 group">
            <div className="bg-orange-50 p-4 rounded-2xl mb-4">
                <Target size={32} className="text-orange-600" />
            </div>
            <span className="text-5xl font-black text-slate-900 mb-2">{user.streak}</span>
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Day Streak</span>
        </div>
      </div>
      
      {/* --- OWN PROFILE EXCLUSIVE SECTIONS --- */}
      {isOwnProfile && (
        <>
            {/* Reports Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button 
                    onClick={() => navigate('/reports?type=WEEKLY')}
                    className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-lg hover:scale-[1.02] transition-all text-left group"
                >
                    <div className="bg-indigo-50 text-indigo-600 w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        <Calendar size={24} />
                    </div>
                    <h3 className="font-bold text-lg text-slate-900">Weekly Report</h3>
                    <p className="text-slate-400 text-sm">Review this week's progress</p>
                </button>
                
                <button 
                    onClick={() => navigate('/reports?type=MONTHLY')}
                    className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-lg hover:scale-[1.02] transition-all text-left group"
                >
                    <div className="bg-emerald-50 text-emerald-600 w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                        <FileText size={24} />
                    </div>
                    <h3 className="font-bold text-lg text-slate-900">Monthly Report</h3>
                    <p className="text-slate-400 text-sm">See the bigger picture</p>
                </button>
            </div>

            {/* Year In Review Banner */}
            <div 
                onClick={() => navigate('/year-in-review')}
                className="bg-gradient-to-r from-violet-600 to-indigo-600 p-1 rounded-3xl cursor-pointer hover:scale-[1.01] transition-transform shadow-lg shadow-violet-200"
            >
                <div className="bg-slate-900/10 rounded-[1.3rem] p-6 flex items-center justify-between text-white backdrop-blur-sm">
                    <div className="flex items-center gap-4">
                        <div className="bg-white/20 p-3 rounded-xl">
                            <Award size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg">2024 Year in Review</h3>
                            <p className="text-violet-200 text-sm">View your full summary report</p>
                        </div>
                    </div>
                    <ArrowRight className="text-white/50" />
                </div>
            </div>
            
            {/* Group Invite Card */}
            {group && (
                <div className="bg-slate-900 rounded-[2rem] p-8 text-white shadow-xl shadow-slate-200 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600 rounded-full blur-[100px] opacity-40 -mr-16 -mt-16 pointer-events-none"></div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-start mb-6">
                                <div>
                                    <div className="flex items-center gap-2 text-violet-200 mb-1">
                                        <Users size={18} />
                                        <span className="text-sm font-bold uppercase tracking-wide">Your Group</span>
                                    </div>
                                    <h2 className="text-3xl font-black">{group.name}</h2>
                                </div>
                        </div>
                        
                        <div className="space-y-3">
                            {/* Invite Code */}
                            <div className="bg-white/10 p-4 rounded-xl flex items-center justify-between border border-white/10">
                                <div>
                                    <p className="text-xs text-violet-200 font-bold uppercase tracking-wider mb-1">Invite Code</p>
                                    <p className="text-2xl font-mono font-bold tracking-widest">{group.inviteCode}</p>
                                </div>
                                <button 
                                    onClick={copyInviteCode}
                                    className="p-3 bg-white text-slate-900 rounded-lg hover:bg-violet-100 transition-colors font-bold flex items-center gap-2"
                                >
                                    <Copy size={18} /> Copy
                                </button>
                            </div>

                            {/* Invite Link */}
                            <div className="bg-white/10 p-4 rounded-xl flex items-center justify-between border border-white/10">
                                <div className="flex-1 min-w-0 mr-3">
                                    <p className="text-xs text-violet-200 font-bold uppercase tracking-wider mb-1">Invite Link</p>
                                    <p className="text-sm font-mono truncate" title={api.getInviteLink()}>
                                        {api.getInviteLink()}
                                    </p>
                                </div>
                                <button 
                                    onClick={copyInviteLink}
                                    className="p-3 bg-white text-slate-900 rounded-lg hover:bg-violet-100 transition-colors font-bold flex items-center gap-2 flex-shrink-0"
                                >
                                    <LinkIcon size={18} /> Copy
                                </button>
                            </div>
                        </div>

                        {/* Group Members (Admin View) */}
                        {isAdmin && groupMembers.length > 0 && (
                            <div className="mt-6 pt-6 border-t border-white/10">
                                <div className="flex items-center gap-2 mb-4">
                                    <Shield size={18} className="text-violet-200" />
                                    <p className="text-sm font-bold uppercase tracking-wide text-violet-200">Group Members</p>
                                </div>
                                <div className="space-y-2">
                                    {groupMembers.map(member => (
                                        <div key={member.id} className="bg-white/5 p-3 rounded-lg flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-white/10 text-white flex items-center justify-center text-xs font-bold">
                                                    {member.avatarInitials}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-sm">{member.name}</p>
                                                    {member.id === group.creatorId && (
                                                        <p className="text-xs text-violet-300">Creator</p>
                                                    )}
                                                    {member.id !== group.creatorId && (group.adminIds || []).includes(member.id) && (
                                                        <p className="text-xs text-violet-300">Admin</p>
                                                    )}
                                                </div>
                                            </div>
                                            {member.id !== currentUser.id && member.id !== group.creatorId && (
                                                <button
                                                    onClick={() => handleRemoveMember(member.id)}
                                                    className="p-2 hover:bg-white/10 rounded-lg transition-colors text-red-300 hover:text-red-200"
                                                    title="Remove member"
                                                >
                                                    <X size={18} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Leave Group Button */}
                        {isOwnProfile && group && group.creatorId !== currentUser.id && (
                            <div className="mt-6 pt-6 border-t border-white/10">
                                <button
                                    onClick={handleLeaveGroup}
                                    className="w-full p-3 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded-xl transition-colors font-bold flex items-center justify-center gap-2 border border-red-500/30"
                                >
                                    <X size={18} /> Leave Group
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
            
            {/* Graveyard Link */}
            <div 
                onClick={() => navigate('/graveyard')}
                className="bg-slate-50 p-5 rounded-2xl border border-slate-100 flex items-center justify-center gap-2 text-slate-400 font-bold text-sm cursor-pointer hover:bg-slate-100 hover:text-slate-600 transition-colors"
            >
                <Archive size={18} /> View Graveyard
            </div>
        </>
      )}

      {/* --- PEER PROFILE EXCLUSIVE SECTIONS --- */}
      {!isOwnProfile && (
          <div className="space-y-4">
              <h3 className="font-black text-lg text-slate-900 px-2">Public Resolutions</h3>
              {publicResolutions.length === 0 ? (
                  <div className="p-8 text-center bg-white rounded-3xl border border-slate-100 shadow-sm">
                      <p className="text-slate-400 font-bold text-sm">No public goals set yet.</p>
                  </div>
              ) : (
                  <div className="grid grid-cols-1 gap-4">
                      {publicResolutions.map(res => (
                          <div 
                             key={res.id}
                             onClick={() => navigate(`/resolutions/${res.id}`)}
                             className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer flex justify-between items-center group"
                          >
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-50 px-2 py-0.5 rounded-md">{res.category}</span>
                                        <span className="flex items-center gap-1 text-[10px] font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-md">
                                            <Globe size={10} /> Public
                                        </span>
                                    </div>
                                    <h4 className="font-bold text-slate-800 text-lg">{res.title}</h4>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    <span className="text-xs font-bold px-2 py-1 rounded-full bg-violet-50 text-violet-600">Lvl {res.difficulty}</span>
                                    {res.currentStreak > 0 && (
                                        <div className="flex items-center gap-1 text-orange-500 font-bold text-sm">
                                            <Flame size={14} fill="currentColor" /> {res.currentStreak}
                                        </div>
                                    )}
                                </div>
                          </div>
                      ))}
                  </div>
              )}
          </div>
      )}

      {/* Score Breakdown Table */}
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-50 bg-slate-50/50">
              <h3 className="font-black text-lg text-slate-900">Score Breakdown</h3>
              <p className="text-sm text-slate-500">How points are calculated.</p>
          </div>
          {breakdown.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-sm">
                  No points recorded yet.
              </div>
          ) : (
              <div className="divide-y divide-slate-50">
                  {breakdown.map((item, idx) => (
                      <div key={idx} className="p-5 flex items-center justify-between hover:bg-slate-50 transition-colors">
                          <div className="flex-1">
                              <p className="font-bold text-slate-800">{item.title}</p>
                              <div className="flex items-center gap-2 mt-1">
                                  <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">Lvl {item.difficulty}</span>
                                  <span className="text-xs font-medium text-slate-400">× {item.days} days done</span>
                              </div>
                          </div>
                          <div className="text-right">
                              <span className="block font-black text-xl text-violet-600">+{item.points}</span>
                              <span className="text-[10px] font-bold text-slate-400 uppercase">pts</span>
                          </div>
                      </div>
                  ))}
                  <div className="p-4 bg-slate-50 text-center text-xs text-slate-400 font-medium">
                      Private resolutions do not contribute to public score.
                  </div>
              </div>
          )}
      </div>

      {isOwnProfile && (
        <div className="pt-4 flex justify-center pb-8">
            <Button 
                variant="outline" 
                onClick={handleLogout}
                className="text-rose-600 hover:text-rose-700 border-rose-100 hover:border-rose-200 hover:bg-rose-50 px-10 py-4 gap-2 rounded-full font-bold"
            >
                <LogOut size={20} />
                Log Out
            </Button>
        </div>
      )}
    </div>
  );
};

export default Profile;