import React, { useEffect, useState } from 'react';
import { api } from '../services/supabaseService';
import { User } from '../types';
import { TrendingUp, TrendingDown, Minus, Trophy, Crown, CheckCircle2, XCircle, Circle, Calendar, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Leaderboard: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [view, setView] = useState<'ALL' | 'MONTHLY'>('ALL');
  const monthName = new Date().toLocaleString('default', { month: 'long' });

  useEffect(() => {
    const loadData = async () => {
      const data = await api.getLeaderboard(view);
      setUsers(data || []);
    };
    loadData();
  }, [view]);

  const getStatusIcon = (user: User) => {
      // For now, just show based on streak
      if (user.streak > 0) {
          return <div title="Active Streak" className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center"><CheckCircle2 size={18} /></div>;
      }
      return <div title="Pending" className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center"><Circle size={18} /></div>;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header className="flex flex-col md:flex-row justify-between items-center gap-6 pb-6 border-b border-slate-200/50">
        <div className="text-center md:text-left">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">The Pack</h2>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">Leaderboard</h1>
        </div>
        
        <div className="flex bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm">
            <button 
                onClick={() => setView('ALL')}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    view === 'ALL' 
                    ? 'bg-violet-600 text-white shadow-md' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
            >
                <Globe size={16} /> All Time
            </button>
            <button 
                onClick={() => setView('MONTHLY')}
                className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                    view === 'MONTHLY' 
                    ? 'bg-violet-600 text-white shadow-md' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
            >
                <Calendar size={16} /> {monthName}
            </button>
        </div>
      </header>

      {view === 'MONTHLY' && (
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 text-center">
              <p className="text-sm text-blue-800 font-bold">
                  Mini-League Active! Scores reset every month.
              </p>
          </div>
      )}

      <div className="space-y-4">
        {/* Header Row */}
        <div className="hidden md:grid grid-cols-12 gap-6 px-8 text-xs font-bold text-slate-400 uppercase tracking-wider">
            <div className="col-span-1 text-center">Rank</div>
            <div className="col-span-1"></div>
            <div className="col-span-5">Member</div>
            <div className="col-span-2 text-center">Score</div>
            <div className="col-span-1 text-center">Today</div>
            <div className="col-span-2 text-right">Streak</div>
        </div>
        
        {/* Rows as Cards */}
        {users.map((user) => {
            const isFirst = user.rank === 1;
            const isTopThree = user.rank <= 3;
            const displayScore = view === 'MONTHLY' ? user.monthlyScore : user.score;
            
            return (
                <div 
                    key={user.id} 
                    onClick={() => navigate(`/profile/${user.id}`)}
                    className={`
                        grid grid-cols-12 gap-4 md:gap-6 p-6 items-center rounded-3xl transition-all duration-300 cursor-pointer
                        ${isFirst 
                            ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-xl shadow-violet-200 scale-105 z-10' 
                            : 'bg-white border border-slate-100 hover:shadow-lg hover:border-slate-200 hover:scale-[1.01]'
                        }
                    `}
                >
                    <div className="col-span-2 md:col-span-1 flex flex-col items-center justify-center">
                        {isFirst ? (
                             <Crown size={32} className="text-yellow-300 fill-yellow-300 drop-shadow-sm mb-1" />
                        ) : (
                            <span className={`text-2xl font-black ${isTopThree ? 'text-slate-900' : 'text-slate-400'}`}>
                                #{user.rank}
                            </span>
                        )}
                    </div>
                     <div className="col-span-2 md:col-span-1 flex justify-center">
                         {view === 'ALL' && (
                            <>
                                {user.rankChange === 'up' && <TrendingUp size={20} className={isFirst ? "text-emerald-300" : "text-emerald-500"} />}
                                {user.rankChange === 'down' && <TrendingDown size={20} className={isFirst ? "text-rose-300" : "text-rose-500"} />}
                                {user.rankChange === 'same' && <Minus size={20} className={isFirst ? "text-white/50" : "text-slate-300"} />}
                            </>
                         )}
                     </div>
                    
                    <div className="col-span-8 md:col-span-5 flex items-center gap-5">
                        <div className={`
                            w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold border-4
                            ${isFirst 
                                ? 'bg-white text-violet-700 border-white/20' 
                                : 'bg-slate-100 text-slate-600 border-white'
                            }
                        `}>
                            {user.avatarInitials}
                        </div>
                        <div>
                            <p className={`font-bold text-lg ${isFirst ? 'text-white' : 'text-slate-900'}`}>
                                {user.name}
                            </p>
                            {isFirst && (
                                <div className="flex items-center gap-1 text-xs text-violet-100 font-bold bg-white/20 px-2 py-0.5 rounded-full w-fit mt-1">
                                    <Trophy size={10} className="fill-current" />
                                    <span>Current Leader</span>
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <div className="col-span-6 md:col-span-2 text-center flex flex-col justify-center">
                        <span className={`text-3xl font-black ${isFirst ? 'text-white' : 'text-violet-600'}`}>
                            {displayScore}
                        </span>
                        <span className={`text-[10px] font-bold uppercase tracking-wide ${isFirst ? 'text-violet-200' : 'text-slate-400'}`}>
                            pts
                        </span>
                    </div>

                    <div className="col-span-6 md:col-span-1 flex justify-center items-center">
                        <div className={isFirst ? "bg-white/20 p-1 rounded-full backdrop-blur-sm" : ""}>
                            {getStatusIcon(user)}
                        </div>
                    </div>
                    
                    <div className="col-span-12 md:col-span-2 text-right flex items-center justify-end gap-2 md:block">
                        <span className={`font-bold text-xl block ${isFirst ? 'text-violet-100' : 'text-slate-900'}`}>{user.streak}</span>
                        <span className={`text-[10px] font-bold uppercase tracking-wide ${isFirst ? 'text-violet-200' : 'text-slate-400'}`}>day streak</span>
                    </div>
                </div>
            );
        })}
      </div>
    </div>
  );
};

export default Leaderboard;
