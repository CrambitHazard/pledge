import React, { useState, useEffect } from 'react';
import { api } from '../services/supabaseService';
import { Resolution, ResolutionStatus } from '../types';
import { Circle, CheckCircle2, XCircle, Lock, Globe, Flame, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const DailyCheckIn: React.FC = () => {
  const [resolutions, setResolutions] = useState<Resolution[]>([]);
  const [currentDate, setCurrentDate] = useState<string>('');
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
    setCurrentDate(now.toLocaleDateString('en-US', options));
  }, []);

  const loadData = async () => {
    const data = await api.getMyResolutions();
    setResolutions(data || []);
  };

  const handleCheckIn = async (id: string, status: ResolutionStatus, e: React.MouseEvent) => {
    e.stopPropagation();
    await api.checkIn(id, status);
    await loadData();
  };

  const getCardStyles = (status: ResolutionStatus) => {
      switch (status) {
          case ResolutionStatus.COMPLETED:
              return "bg-violet-600 border-violet-600 text-white shadow-xl shadow-violet-200 transform scale-[1.01]";
          case ResolutionStatus.MISSED:
              return "bg-slate-100 border-slate-100 text-slate-400 opacity-90";
          default:
              return "bg-white border-slate-100 text-slate-900 shadow-sm hover:border-violet-200";
      }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
            <div className="flex items-center gap-3 mb-2">
                <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide">Daily Check-In</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight">{currentDate}</h1>
        </div>
        <div className="text-right hidden md:block">
            <p className="text-slate-500 font-medium text-lg">Did you do what you promised today?</p>
        </div>
      </header>

      {resolutions.length === 0 ? (
          <div className="bg-white p-12 rounded-[2.5rem] border border-slate-100 text-center shadow-sm">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">No Active Resolutions</h2>
              <p className="text-slate-500 mb-6">You haven't set any goals for yourself yet.</p>
              <button 
                onClick={() => navigate('/resolutions')}
                className="bg-violet-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-violet-700 transition-colors"
              >
                  Create Goals
              </button>
          </div>
      ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {resolutions.map(res => {
                const isDone = res.todayStatus === ResolutionStatus.COMPLETED;
                const isMissed = res.todayStatus === ResolutionStatus.MISSED;

                return (
                    <div 
                      key={res.id}
                      onClick={(e) => !isMissed ? handleCheckIn(res.id, isDone ? ResolutionStatus.UNCHECKED : ResolutionStatus.COMPLETED, e) : null}
                      className={`
                          relative p-7 rounded-[2rem] border-2 flex flex-col justify-between min-h-[240px] transition-all duration-300 cursor-pointer group
                          ${getCardStyles(res.todayStatus)}
                      `}
                    >
                      {/* Streak Badge */}
                      {res.currentStreak > 0 && (
                          <div className={`absolute top-6 right-6 flex items-center gap-1 font-black text-lg ${isDone ? 'text-violet-200' : 'text-orange-500'}`}>
                              <Flame size={20} className="fill-current" />
                              <span>{res.currentStreak}</span>
                          </div>
                      )}

                      <div className="flex flex-col items-start h-full">
                          <span className={`text-xs font-bold uppercase tracking-wide mb-3 px-2 py-1 rounded-md w-fit ${isDone ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                              {res.category}
                          </span>
                          <h3 className={`text-2xl font-bold leading-tight mb-4 ${isMissed ? 'line-through decoration-2 decoration-slate-300' : ''}`}>
                              {res.title}
                          </h3>
                          
                          <div className="mt-auto w-full flex items-center justify-between pt-4 border-t border-current/10">
                              <div className="flex items-center gap-2">
                                  {isDone && (
                                      <span className="flex items-center gap-1.5 font-bold text-sm">
                                          <CheckCircle2 size={18} /> Done
                                      </span>
                                  )}
                                  {isMissed && (
                                      <span className="flex items-center gap-1.5 font-bold text-sm">
                                          <XCircle size={18} /> Missed
                                      </span>
                                  )}
                                  {!isDone && !isMissed && (
                                      <span className="flex items-center gap-1.5 font-bold text-sm opacity-50">
                                          <Circle size={18} /> Tap to Complete
                                      </span>
                                  )}
                              </div>

                              {/* Action Buttons Layer (Stop Propagation) */}
                              <div className="flex items-center gap-2">
                                  {!isDone && !isMissed && (
                                      <button 
                                          onClick={(e) => handleCheckIn(res.id, ResolutionStatus.MISSED, e)}
                                          className="p-2 rounded-full hover:bg-rose-100 text-slate-300 hover:text-rose-500 transition-colors"
                                          title="Mark as Missed"
                                      >
                                          <XCircle size={24} />
                                      </button>
                                  )}
                                  {isMissed && (
                                       <button 
                                          onClick={(e) => handleCheckIn(res.id, ResolutionStatus.UNCHECKED, e)}
                                          className="text-xs underline font-bold"
                                       >
                                           Undo
                                       </button>
                                  )}
                              </div>
                          </div>
                      </div>
                    </div>
                );
            })}
          </div>
      )}
    </div>
  );
};

export default DailyCheckIn;