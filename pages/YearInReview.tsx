
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/supabaseService';
import { Resolution, User } from '../types';
import Button from '../components/Button';
import { ArrowLeft, Trophy, Calendar, Target, Award, Crown, Zap, TrendingUp } from 'lucide-react';

interface ReportData {
    user: User;
    consistency: number;
    totalCompleted: number;
    bestRes: Resolution | null;
    worstRes: Resolution | null;
    topPerformer: User;
    groupSize: number;
}

const YearInReview: React.FC = () => {
  const navigate = useNavigate();
  const [data, setData] = useState<ReportData | null>(null);

  useEffect(() => {
      try {
          const user = api.getUser();
          const report = api.getYearInReview(user.id);
          setData(report);
      } catch (e) {
          navigate('/');
      }
  }, []);

  if (!data) return <div className="p-10 text-center text-slate-400">Loading Report...</div>;

  return (
    <div className="max-w-2xl mx-auto pb-10">
      <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate('/profile')} className="pl-0 hover:bg-transparent hover:text-violet-600">
            <ArrowLeft size={20} className="mr-2" /> Back to Profile
          </Button>
      </div>

      <div className="bg-slate-900 rounded-[2.5rem] text-white p-8 md:p-12 shadow-2xl shadow-slate-300 relative overflow-hidden">
          {/* Decorative Background */}
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-violet-600 rounded-full blur-[120px] opacity-40 -mr-20 -mt-20 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-emerald-500 rounded-full blur-[100px] opacity-20 -ml-20 -mb-20 pointer-events-none"></div>

          <div className="relative z-10 text-center space-y-2 mb-10">
              <span className="inline-block py-1 px-3 rounded-full bg-white/10 border border-white/10 text-xs font-bold uppercase tracking-widest text-violet-200 mb-2">
                  End of Year Report
              </span>
              <h1 className="text-4xl md:text-6xl font-black tracking-tight">{new Date().getFullYear()} Summary</h1>
              <p className="text-slate-400 font-medium text-lg">Your year in discipline.</p>
          </div>

          <div className="relative z-10 grid grid-cols-2 gap-4 md:gap-8 mb-12">
               <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 text-center border border-white/10">
                   <div className="text-emerald-400 mb-2 flex justify-center"><Target size={32} /></div>
                   <p className="text-4xl font-black mb-1">{data.consistency}%</p>
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Consistency</p>
               </div>
               <div className="bg-white/10 backdrop-blur-md rounded-3xl p-6 text-center border border-white/10">
                   <div className="text-yellow-400 mb-2 flex justify-center"><Trophy size={32} /></div>
                   <p className="text-4xl font-black mb-1">#{data.user.rank}</p>
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Group Rank</p>
               </div>
          </div>

          <div className="relative z-10 space-y-8">
              {data.bestRes && (
                  <div className="bg-gradient-to-br from-violet-600 to-indigo-700 rounded-3xl p-6 border border-white/20">
                      <div className="flex items-center gap-3 mb-2 opacity-80">
                          <Crown size={18} />
                          <span className="text-xs font-bold uppercase tracking-wide">Your MVP Goal</span>
                      </div>
                      <h3 className="text-2xl font-bold mb-2">"{data.bestRes.title}"</h3>
                      <p className="text-sm opacity-70">You crushed this. The highest completion rate of all your goals.</p>
                  </div>
              )}

              {data.worstRes && data.worstRes.id !== data.bestRes?.id && (
                  <div className="bg-white/5 rounded-3xl p-6 border border-white/10">
                      <div className="flex items-center gap-3 mb-2 text-rose-300">
                          <TrendingUp size={18} />
                          <span className="text-xs font-bold uppercase tracking-wide">The Struggle</span>
                      </div>
                      <h3 className="text-2xl font-bold mb-2">"{data.worstRes.title}"</h3>
                      <p className="text-sm text-slate-400">The hardest battle this year. Next year, we adapt.</p>
                  </div>
              )}
          </div>
      </div>

      <div className="mt-8 bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <h2 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-2">
              <UsersIcon /> Group Snapshot
          </h2>
          
          <div className="flex items-center justify-between p-6 bg-slate-50 rounded-2xl mb-4">
               <div>
                   <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Top Performer</p>
                   <p className="text-xl font-bold text-slate-900">{data.topPerformer.name}</p>
                   <p className="text-sm text-slate-500">{data.topPerformer.score} points</p>
               </div>
               <div className="w-12 h-12 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center">
                   <Crown size={24} />
               </div>
          </div>
          
          <div className="p-6 text-center border-t border-slate-100 pt-6">
              <p className="text-slate-500 font-medium">
                  You competed against <span className="text-slate-900 font-bold">{data.groupSize - 1} others</span> this year.
              </p>
              <div className="flex justify-center gap-2 mt-2">
                 <span className="inline-block w-2 h-2 rounded-full bg-violet-500"></span>
                 <span className="inline-block w-2 h-2 rounded-full bg-slate-300"></span>
                 <span className="inline-block w-2 h-2 rounded-full bg-slate-300"></span>
              </div>
          </div>
      </div>
      
      <div className="text-center mt-10">
          <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">Pledge • {new Date().getFullYear()}</p>
      </div>
    </div>
  );
};

const UsersIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-violet-600"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
);

export default YearInReview;
