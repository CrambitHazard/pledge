import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/supabaseService';
import { Resolution, ResolutionType, ResolutionStatus, Bet } from '../types';
import Button from '../components/Button';
import Input from '../components/Input';
import { ArrowLeft, Calendar, Flame, Activity, CheckSquare, Lock, Globe, Shield, CheckCircle2, XCircle, Minus, Trophy, AlertTriangle, ThumbsUp, ThumbsDown, BarChart2, User as UserIcon, Archive, AlertOctagon } from 'lucide-react';

const ResolutionDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [resolution, setResolution] = useState<Resolution | null>(null);
  const [currentUser, setCurrentUser] = useState(api.getUser());
  
  // Betting State
  const [showBetForm, setShowBetForm] = useState(false);
  const [betEndDate, setBetEndDate] = useState('');
  const [betStake, setBetStake] = useState('');
  const [betError, setBetError] = useState('');

  // Archive State
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [archiveReason, setArchiveReason] = useState('');

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = () => {
    if (id) {
        const res = api.getResolutionById(id);
        if (res) {
            const user = api.getUser();
            setCurrentUser(user);
            if (res.createdUserId === user.id || !res.isPrivate) {
                setResolution(res);
            } else {
                navigate('/resolutions');
            }
        } 
      }
  };

  const handleCreateBet = (e: React.FormEvent) => {
      e.preventDefault();
      setBetError('');
      if (!id || !betEndDate || !betStake) return;

      try {
          api.addBet(id, betEndDate, betStake);
          setShowBetForm(false);
          setBetEndDate('');
          setBetStake('');
          loadData();
      } catch (err: any) {
          setBetError(err.message);
      }
  };
  
  const handleArchive = () => {
      if(!id || !archiveReason) return;
      try {
          api.archiveResolution(id, archiveReason);
          navigate('/graveyard');
      } catch(e: any) {
          alert(e.message);
      }
  }

  const handleDifficultyVote = (vote: 1|2|3|4|5) => {
      if (!id) return;
      try {
          api.voteDifficulty(id, vote);
          loadData();
      } catch (e) {
          console.error(e);
      }
  };

  const handleCredibilityVote = (date: string, type: 'BELIEVE' | 'DOUBT') => {
      if (!id) return;
      try {
          api.voteCredibility(id, date, type);
          loadData();
      } catch (e) {
          console.error(e);
      }
  };

  if (!resolution) return <div className="p-10 text-center text-slate-400">Loading...</div>;

  const historyDays = [];
  for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      historyDays.push(d.toISOString().split('T')[0]);
  }

  const activeBet = resolution.bets?.find(b => b.status === 'ACTIVE');
  const pastBets = resolution.bets?.filter(b => b.status !== 'ACTIVE') || [];
  const isOwner = resolution.createdUserId === currentUser.id;
  const isPublic = !resolution.isPrivate;
  const health = api.getResolutionHealth(resolution);
  const isLocked = api.isResolutionLocked(resolution);

  // Credibility helpers
  const getCredibilityStatus = (date: string) => {
      const votes = resolution.credibility?.[date];
      if (!votes) return null;
      const believers = votes.believers.length;
      const doubters = votes.doubters.length;
      if (believers === 0 && doubters === 0) return null;
      return { believers, doubters };
  };

  const hasVotedCredibility = (date: string) => {
      const votes = resolution.credibility?.[date];
      if (!votes) return false;
      return votes.believers.includes(currentUser.id) || votes.doubters.includes(currentUser.id);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-10">
      <Button variant="ghost" onClick={() => navigate(-1)} className="pl-0 hover:bg-transparent hover:text-violet-600">
        <ArrowLeft size={20} className="mr-2" /> Back
      </Button>

      {/* Health Banner */}
      {isOwner && health !== 'healthy' && (
          <div className={`p-4 rounded-2xl flex items-center gap-3 ${health === 'at-risk' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}`}>
              <AlertTriangle size={20} />
              <p className="font-bold text-sm">
                  {health === 'at-risk' 
                     ? 'At Risk: You have missed 2+ days this week.' 
                     : 'This resolution is slipping. Get back on track.'}
              </p>
          </div>
      )}

      <div className="bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden relative">
        <div className="bg-slate-50 p-10 border-b border-slate-100 relative">
             {isOwner && (
                 <div className="absolute top-10 right-10">
                     <span className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-200 text-slate-500 rounded-full text-xs font-bold uppercase tracking-wider">
                        <UserIcon size={12} /> Owner View
                     </span>
                 </div>
             )}
             
             <div className="flex items-center gap-3 mb-4">
                <span className="px-3 py-1 bg-white border border-slate-200 rounded-full text-xs font-bold uppercase tracking-wider text-slate-500">
                    {resolution.category}
                </span>
                {resolution.isPrivate ? (
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-200/50 rounded-full text-xs font-bold uppercase tracking-wider text-slate-600">
                        <Lock size={12} /> Private
                    </div>
                ) : (
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-sky-100 rounded-full text-xs font-bold uppercase tracking-wider text-sky-700">
                        <Globe size={12} /> Public
                    </div>
                )}
                {isLocked && (
                    <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-100 rounded-full text-xs font-bold uppercase tracking-wider text-amber-600">
                        <Lock size={12} /> Locked
                    </div>
                )}
             </div>
             <h1 className="text-3xl font-black text-slate-900 leading-tight mb-6">{resolution.title}</h1>
             
             <div className="flex items-center gap-8">
                 <div className="flex items-center gap-2">
                     <Flame size={20} className="text-orange-500" />
                     <span className="text-2xl font-black text-slate-900">{resolution.currentStreak}</span>
                     <span className="text-xs font-bold text-slate-400 uppercase">Day Streak</span>
                 </div>
                 
                 {/* Effective Difficulty Display */}
                 <div className="flex items-center gap-2">
                     <BarChart2 size={20} className="text-violet-500" />
                     <div className="flex flex-col">
                        <span className="text-2xl font-black text-slate-900 leading-none">{resolution.effectiveDifficulty || resolution.difficulty}</span>
                        {resolution.effectiveDifficulty !== resolution.difficulty && (
                            <span className="text-[10px] font-bold text-slate-400 line-through leading-none">Declared: {resolution.difficulty}</span>
                        )}
                     </div>
                     <span className="text-xs font-bold text-slate-400 uppercase self-end mb-1 ml-1">Difficulty</span>
                 </div>
             </div>
        </div>

        <div className="p-10 space-y-10">
            
            {/* Sub-goals Display */}
            {resolution.subGoals && resolution.subGoals.length > 0 && (
                <div className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Sub-goals</h3>
                    <ul className="space-y-2">
                        {resolution.subGoals.map((goal, i) => (
                            <li key={i} className="flex items-center gap-2 text-sm font-bold text-slate-700">
                                <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                                {goal}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Peer Review Difficulty Section */}
            {isPublic && !isOwner && (
                <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Peer Review: Difficulty</h3>
                    <p className="text-sm text-slate-600 mb-4 font-medium">How hard do you think this goal is?</p>
                    <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((lvl) => (
                            <button
                                key={lvl}
                                onClick={() => handleDifficultyVote(lvl as any)}
                                className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${
                                    resolution.peerDifficultyVotes?.[currentUser.id] === lvl
                                    ? 'bg-violet-600 text-white shadow-md'
                                    : 'bg-white text-slate-400 hover:bg-slate-100 border border-slate-200'
                                }`}
                            >
                                {lvl}
                            </button>
                        ))}
                    </div>
                </div>
            )}
            
            {/* Owner Info for Public Goals */}
            {isPublic && isOwner && (
                 <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-center">
                     <p className="text-xs font-bold text-slate-400">Peer voting is enabled for this goal.</p>
                     <p className="text-xs text-slate-400 mt-1">Others can adjust the effective difficulty and verify your completions.</p>
                 </div>
            )}

            {/* Social Stakes Section */}
            <div>
                <div className="flex items-center justify-between mb-4">
                     <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                        <Shield size={16} /> Social Stakes
                     </h3>
                     {isOwner && !activeBet && !showBetForm && !resolution.isPrivate && (
                         <button 
                            onClick={() => setShowBetForm(true)}
                            className="text-xs font-bold text-violet-600 hover:text-violet-700 bg-violet-50 px-3 py-1.5 rounded-lg transition-colors"
                         >
                            + Raise Stakes
                         </button>
                     )}
                </div>

                {showBetForm && (
                    <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 mb-6 animate-in fade-in slide-in-from-top-2">
                        <h4 className="font-bold text-slate-900 mb-4">Make a Bet</h4>
                        {betError && <p className="text-xs font-bold text-rose-500 mb-3">{betError}</p>}
                        <form onSubmit={handleCreateBet} className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 mb-1 block">Maintain streak until</label>
                                <Input 
                                    type="date" 
                                    min={new Date(Date.now() + 86400000).toISOString().split('T')[0]}
                                    value={betEndDate}
                                    onChange={(e) => setBetEndDate(e.target.value)}
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-slate-500 mb-1 block">If I miss a day, I will...</label>
                                <Input 
                                    placeholder="e.g., Buy coffee for everyone" 
                                    value={betStake}
                                    onChange={(e) => setBetStake(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <Button type="button" variant="ghost" onClick={() => setShowBetForm(false)} className="py-2 text-sm">Cancel</Button>
                                <Button type="submit" className="py-2 text-sm">Confirm Bet</Button>
                            </div>
                        </form>
                    </div>
                )}

                {activeBet && (
                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 rounded-[2rem] text-white shadow-xl shadow-slate-200 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10"></div>
                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-xs font-bold uppercase tracking-widest text-slate-400 border border-slate-600 px-2 py-0.5 rounded-md">Active Bet</span>
                                <span className="text-xs font-bold text-slate-300">Until {new Date(activeBet.endDate).toLocaleDateString()}</span>
                            </div>
                            <p className="text-lg font-medium text-slate-300 mb-1">I promise to maintain my streak, or else:</p>
                            <p className="text-2xl font-black leading-tight text-white">"{activeBet.stake}"</p>
                        </div>
                    </div>
                )}

                {!activeBet && pastBets.length === 0 && !showBetForm && (
                     <div className="bg-slate-50 rounded-2xl p-6 text-center border border-slate-100">
                         <p className="text-slate-400 font-medium text-sm">No social stakes yet.</p>
                     </div>
                )}
            </div>

            {/* History Section with Peer Credibility */}
            <div className="pt-6 border-t border-slate-100">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Recent History</h3>
                <div className="flex flex-col gap-3">
                    {historyDays.slice(0, 5).map((dateStr) => {
                        const status = resolution.history[dateStr];
                        const date = new Date(dateStr);
                        const isToday = date.toDateString() === new Date().toDateString();
                        const isYesterday = new Date(Date.now() - 86400000).toDateString() === date.toDateString();
                        // Voting is allowed if: public, not owner, completed, and is today/yesterday
                        const canVote = isPublic && !isOwner && status === ResolutionStatus.COMPLETED && (isToday || isYesterday);
                        const votes = getCredibilityStatus(dateStr);
                        const voted = hasVotedCredibility(dateStr);

                        let Icon = Minus;
                        let color = "text-slate-300";
                        let bg = "bg-slate-100";

                        if (status === ResolutionStatus.COMPLETED) {
                            Icon = CheckCircle2;
                            color = "text-violet-600";
                            bg = "bg-violet-50 border-violet-100";
                        } else if (status === ResolutionStatus.MISSED) {
                            Icon = XCircle;
                            color = "text-rose-400";
                            bg = "bg-rose-50 border-rose-100";
                        }

                        return (
                            <div key={dateStr} className={`flex items-center justify-between p-4 rounded-2xl border ${bg} ${status === ResolutionStatus.UNCHECKED ? 'border-transparent bg-transparent' : ''}`}>
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-white ${color}`}>
                                        <Icon size={20} />
                                    </div>
                                    <div>
                                        <span className="text-xs font-bold text-slate-400 uppercase block">
                                            {date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                                        </span>
                                        <span className="font-bold text-slate-700 text-sm">
                                            {status === ResolutionStatus.COMPLETED ? 'Completed' : status === ResolutionStatus.MISSED ? 'Missed' : 'No Entry'}
                                        </span>
                                    </div>
                                </div>

                                {/* Credibility Voting */}
                                {status === ResolutionStatus.COMPLETED && (
                                    <div className="flex items-center gap-2">
                                        {canVote && !voted && (
                                            <>
                                                <button onClick={() => handleCredibilityVote(dateStr, 'BELIEVE')} className="p-2 hover:bg-emerald-100 text-slate-400 hover:text-emerald-600 rounded-lg transition-colors" title="Believe">
                                                    <ThumbsUp size={16} />
                                                </button>
                                                <button onClick={() => handleCredibilityVote(dateStr, 'DOUBT')} className="p-2 hover:bg-rose-100 text-slate-400 hover:text-rose-600 rounded-lg transition-colors" title="Doubt">
                                                    <ThumbsDown size={16} />
                                                </button>
                                            </>
                                        )}
                                        {/* Vote Display */}
                                        {(votes || voted) && (
                                            <div className="flex gap-2 text-xs font-bold bg-white px-2 py-1 rounded-md shadow-sm">
                                                <span className="text-emerald-600 flex items-center gap-1"><ThumbsUp size={12} /> {votes?.believers || 0}</span>
                                                <span className="text-rose-500 flex items-center gap-1"><ThumbsDown size={12} /> {votes?.doubters || 0}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
            
            {/* Archive / Give Up Section */}
            {isOwner && (
                <div className="pt-10 border-t border-slate-100">
                    {!showArchiveModal ? (
                         <div className="text-center">
                             {isLocked ? (
                                 <p className="text-sm text-slate-400 font-bold flex items-center justify-center gap-2">
                                     <Lock size={16} /> Resolution is locked for the first 7 days.
                                 </p>
                             ) : (
                                 <button 
                                    onClick={() => setShowArchiveModal(true)}
                                    className="text-rose-500 hover:text-rose-600 font-bold text-sm underline decoration-2 decoration-rose-200 hover:decoration-rose-500 transition-all"
                                 >
                                     End Resolution
                                 </button>
                             )}
                         </div>
                    ) : (
                        <div className="bg-rose-50 p-6 rounded-2xl border border-rose-100 animate-in fade-in slide-in-from-bottom-2">
                            <h4 className="font-bold text-rose-900 mb-2">End this resolution?</h4>
                            <p className="text-sm text-rose-700 mb-4">It will be moved to the Graveyard and cannot be restored.</p>
                            <div className="space-y-3">
                                <Input 
                                    placeholder="Reason (Optional)" 
                                    value={archiveReason}
                                    onChange={(e) => setArchiveReason(e.target.value)}
                                    className="border-rose-200 focus:border-rose-400 focus:ring-rose-200"
                                />
                                <div className="flex gap-3">
                                    <Button variant="ghost" onClick={() => setShowArchiveModal(false)} className="text-rose-700 hover:bg-rose-100">Cancel</Button>
                                    <button 
                                        onClick={handleArchive}
                                        className="bg-rose-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-rose-700 shadow-md shadow-rose-200"
                                    >
                                        Confirm End
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default ResolutionDetail;
