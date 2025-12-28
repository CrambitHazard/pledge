import React, { useState, useEffect } from 'react';
import { api } from '../services/supabaseService';
import { FeedEvent, Confession, User } from '../types';
import { Zap, Clock, CheckCircle2, XCircle, Flame, Sparkles, Trophy, AlertTriangle, EyeOff, Send, Crown, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const GroupFeed: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'activity' | 'confessions'>('activity');
  const [feed, setFeed] = useState<FeedEvent[]>([]);
  const [confessions, setConfessions] = useState<Confession[]>([]);
  const [hero, setHero] = useState<User | null>(null);
  
  // Confession Form
  const [confessionText, setConfessionText] = useState('');

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    const feedData = await api.getFeed();
    setFeed(feedData || []);
    const confessionData = await api.getConfessions();
    setConfessions(confessionData || []);
    const group = await api.getGroup();
    if (group?.dailyHeroId) {
        const heroUser = await api.getUserById(group.dailyHeroId);
        setHero(heroUser || null);
    }
  };

  const handleConfessionSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!confessionText.trim()) return;

      await api.addConfession(confessionText);
      setConfessionText('');
      await loadData();
  };

  const getIcon = (type: FeedEvent['type']) => {
      switch (type) {
          case 'check-in': return <CheckCircle2 size={20} className="text-emerald-500" />;
          case 'miss': return <XCircle size={20} className="text-rose-500" />;
          case 'streak': return <Flame size={20} className="text-orange-500" />;
          case 'bet-won': return <Trophy size={20} className="text-yellow-500" />;
          case 'bet-lost': return <AlertTriangle size={20} className="text-rose-600" />;
          case 'hero': return <Crown size={20} className="text-yellow-500" />;
          case 'comeback': return <TrendingUp size={20} className="text-emerald-500" />;
          default: return <Sparkles size={20} className="text-violet-500" />;
      }
  };

  const getTimeAgo = (isoDate: string) => {
      const date = new Date(isoDate);
      const now = new Date();
      const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
      
      if (seconds < 60) return 'Just now';
      const minutes = Math.floor(seconds / 60);
      if (minutes < 60) return `${minutes}m ago`;
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return `${hours}h ago`;
      return date.toLocaleDateString();
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-200/50 pb-6">
        <div className="flex items-center gap-3">
            <div className={`p-3 rounded-2xl transition-colors ${activeTab === 'activity' ? 'bg-violet-100 text-violet-600' : 'bg-slate-100 text-slate-500'}`}>
                {activeTab === 'activity' ? <Zap fill="currentColor" size={24} /> : <EyeOff size={24} />}
            </div>
            <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                    {activeTab === 'activity' ? 'Group Pulse' : 'Confessions'}
                </h1>
                <p className="text-slate-500 font-medium">
                    {activeTab === 'activity' ? 'Real-time activity from your pack.' : 'Anonymous thoughts. No names attached.'}
                </p>
            </div>
        </div>
        
        <div className="flex bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm w-full md:w-auto">
            <button 
                onClick={() => setActiveTab('activity')}
                className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    activeTab === 'activity' 
                    ? 'bg-violet-50 text-violet-700 shadow-sm' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
            >
                Activity
            </button>
            <button 
                onClick={() => setActiveTab('confessions')}
                className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    activeTab === 'confessions' 
                    ? 'bg-slate-800 text-white shadow-sm' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
            >
                Confessions
            </button>
        </div>
      </div>

      {/* --- ACTIVITY TAB --- */}
      {activeTab === 'activity' && (
          <>
            {/* Daily Hero Banner */}
            {hero && (
                <div 
                    onClick={() => navigate(`/profile/${hero.id}`)}
                    className="bg-gradient-to-r from-yellow-100 to-amber-100 p-1 rounded-[2rem] shadow-sm mb-6 animate-in fade-in slide-in-from-top-4 cursor-pointer hover:scale-[1.01] transition-transform"
                >
                    <div className="bg-white/50 backdrop-blur-sm rounded-[1.8rem] p-6 flex items-center justify-between">
                         <div className="flex items-center gap-4">
                             <div className="relative">
                                 <div className="w-14 h-14 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold border-4 border-white shadow-sm">
                                     {hero.avatarInitials}
                                 </div>
                                 <div className="absolute -top-3 -right-2 bg-yellow-400 text-white p-1.5 rounded-full border-2 border-white shadow-sm">
                                     <Crown size={14} fill="currentColor" />
                                 </div>
                             </div>
                             <div>
                                 <h3 className="font-black text-slate-900 text-lg">Daily Hero</h3>
                                 <p className="text-slate-600 font-medium text-sm">{hero.name} crushed it yesterday.</p>
                             </div>
                         </div>
                         <div className="hidden sm:block text-right">
                             <p className="text-3xl font-black text-slate-900">{hero.score}</p>
                             <p className="text-[10px] font-bold text-slate-400 uppercase">pts</p>
                         </div>
                    </div>
                </div>
            )}

            {feed.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Zap size={32} className="text-slate-300" />
                    </div>
                    <p className="text-slate-400 font-bold">No activity yet. Be the first to check in!</p>
                </div>
            ) : (
                <div className="relative pl-8 space-y-8 before:absolute before:left-[15px] before:top-4 before:bottom-4 before:w-[2px] before:bg-slate-100 before:rounded-full animate-in fade-in">
                    {feed.map((event) => {
                        const isMiss = event.type === 'miss' || event.type === 'bet-lost';
                        const isWin = event.type === 'streak' || event.type === 'bet-won' || event.type === 'hero' || event.type === 'comeback';
                        
                        let containerClass = "bg-white border-slate-100";
                        if (isMiss) containerClass = "bg-rose-50/50 border-rose-100";
                        if (isWin) containerClass = "bg-orange-50/50 border-orange-100";
                        if (event.type === 'bet-won' || event.type === 'hero' || event.type === 'comeback') containerClass = "bg-yellow-50/50 border-yellow-100";
                        if (event.type === 'comeback') containerClass = "bg-emerald-50/50 border-emerald-100";

                        return (
                            <div key={event.id} className="relative group">
                                <div 
                                    onClick={() => event.userId && navigate(`/profile/${event.userId}`)}
                                    className={`absolute -left-[27px] top-6 w-6 h-6 rounded-full border-4 border-[#FFFBF5] shadow-sm z-10 flex items-center justify-center bg-white cursor-pointer hover:scale-110 transition-transform`}
                                >
                                {event.userAvatar ? (
                                    <div className="w-full h-full rounded-full bg-slate-900 text-[8px] text-white flex items-center justify-center font-bold">
                                        {event.userAvatar}
                                    </div>
                                ) : (
                                    <div className="w-2 h-2 rounded-full bg-slate-200"></div>
                                )}
                                </div>

                                <div className={`p-6 rounded-[2rem] border transition-all duration-300 hover:shadow-lg shadow-sm ${containerClass}`}>
                                    <div className="flex items-start gap-4">
                                        <div className={`p-3 rounded-2xl bg-white shadow-sm shrink-0`}>
                                            {getIcon(event.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className={`text-lg font-bold leading-snug break-words ${isMiss ? 'text-rose-900' : 'text-slate-800'}`}>
                                                {event.message}
                                            </p>
                                            <div className="flex items-center gap-2 mt-2">
                                                <p className="text-xs font-bold text-slate-400 flex items-center gap-1 uppercase tracking-wide">
                                                    <Clock size={12} /> {getTimeAgo(event.timestamp)}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
          </>
      )}

      {/* --- CONFESSIONS TAB --- */}
      {activeTab === 'confessions' && (
          <div className="animate-in fade-in slide-in-from-right-4 duration-300">
             {/* Submission Area */}
             <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-slate-200 mb-10 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-slate-800 rounded-full blur-[80px] opacity-50 -mr-16 -mt-16 pointer-events-none"></div>
                <div className="relative z-10">
                    <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                        <EyeOff size={20} className="text-slate-400" />
                        Unburden Yourself
                    </h3>
                    <p className="text-slate-400 text-sm mb-6">Anything you write here is completely anonymous. No name, no tracking, no judgment.</p>
                    
                    <form onSubmit={handleConfessionSubmit} className="relative">
                        <textarea 
                            value={confessionText}
                            onChange={(e) => setConfessionText(e.target.value)}
                            placeholder="I broke my streak because..."
                            className="w-full bg-slate-800 border border-slate-700 rounded-2xl p-5 pr-14 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-600 focus:border-transparent resize-none h-32 text-lg font-medium"
                        />
                        <button 
                            type="submit"
                            disabled={!confessionText.trim()}
                            className="absolute bottom-4 right-4 p-2 bg-white text-slate-900 rounded-xl hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            <Send size={20} />
                        </button>
                    </form>
                </div>
             </div>

             {/* Confession Stream */}
             {confessions.length === 0 ? (
                 <div className="text-center py-16">
                     <p className="text-slate-400 font-medium">The silence is loud. No confessions yet.</p>
                 </div>
             ) : (
                 <div className="grid grid-cols-1 gap-6">
                     {confessions.map((confession) => (
                         <div key={confession.id} className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                             <p className="text-xl font-medium text-slate-800 leading-relaxed font-serif italic">
                                "{confession.text}"
                             </p>
                             <div className="mt-6 flex items-center gap-2">
                                 <div className="w-1.5 h-1.5 rounded-full bg-slate-300"></div>
                                 <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">
                                     Anonymous • {getTimeAgo(confession.timestamp)}
                                 </p>
                             </div>
                         </div>
                     ))}
                 </div>
             )}
          </div>
      )}
    </div>
  );
};

export default GroupFeed;
