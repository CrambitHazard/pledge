import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../services/supabaseService';
import { PeriodicReport } from '../types';
import Button from '../components/Button';
import { ArrowLeft, Calendar, TrendingUp, TrendingDown, Minus, Crown, Users } from 'lucide-react';

const PeriodicReportPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const type = searchParams.get('type') as 'WEEKLY' | 'MONTHLY';
    const [report, setReport] = useState<PeriodicReport | null>(null);

    useEffect(() => {
        try {
            const user = api.getUser();
            if (type === 'WEEKLY') {
                setReport(api.getWeeklyReport(user.id));
            } else if (type === 'MONTHLY') {
                setReport(api.getMonthlyReport(user.id));
            } else {
                navigate('/profile');
            }
        } catch (e) {
            navigate('/profile');
        }
    }, [type]);

    if (!report) return <div className="p-10 text-center text-slate-400">Generating Report...</div>;

    const isWeekly = report.type === 'WEEKLY';

    return (
        <div className="max-w-2xl mx-auto pb-10">
            <div className="mb-6">
                <Button variant="ghost" onClick={() => navigate('/profile')} className="pl-0 hover:bg-transparent hover:text-violet-600">
                    <ArrowLeft size={20} className="mr-2" /> Back
                </Button>
            </div>

            <div className={`rounded-[2.5rem] p-8 md:p-12 text-white shadow-2xl relative overflow-hidden mb-8 ${isWeekly ? 'bg-indigo-600' : 'bg-slate-900'}`}>
                <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full blur-[80px] -mr-16 -mt-16 pointer-events-none"></div>
                
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-4 opacity-80">
                        <Calendar size={18} />
                        <span className="text-xs font-bold uppercase tracking-widest">{report.type} REPORT</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-2">{report.periodLabel}</h1>
                    <p className="text-lg opacity-80 font-medium">Here is how you performed.</p>

                    <div className="grid grid-cols-2 gap-4 mt-8">
                        <div className="bg-white/10 rounded-2xl p-6 backdrop-blur-md">
                            <p className="text-3xl font-black">{report.consistency}%</p>
                            <p className="text-xs font-bold opacity-60 uppercase">Consistency</p>
                        </div>
                        <div className="bg-white/10 rounded-2xl p-6 backdrop-blur-md">
                            <p className="text-3xl font-black">+{report.pointsGained}</p>
                            <p className="text-xs font-bold opacity-60 uppercase">Points Added</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                {/* Highlights */}
                <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                    <h2 className="font-black text-xl text-slate-900 mb-6">Performance Highlights</h2>
                    
                    <div className="space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase">Rank Change</p>
                                <p className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    {report.rankChange > 0 && <span className="text-emerald-500 flex items-center gap-1"><TrendingUp size={18} /> Up {report.rankChange} spots</span>}
                                    {report.rankChange < 0 && <span className="text-rose-500 flex items-center gap-1"><TrendingDown size={18} /> Down {Math.abs(report.rankChange)} spots</span>}
                                    {report.rankChange === 0 && <span className="text-slate-400 flex items-center gap-1"><Minus size={18} /> No Change</span>}
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-50">
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase mb-1">Best Goal</p>
                                <p className="font-bold text-slate-800">{report.bestResolution}</p>
                            </div>
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase mb-1">Needs Work</p>
                                <p className="font-bold text-slate-800">{report.worstResolution}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Group Context */}
                <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100">
                     <h2 className="font-black text-xl text-slate-900 mb-6 flex items-center gap-2">
                         <Users size={20} /> Group Context
                     </h2>
                     <div className="flex items-center justify-between mb-6 bg-white p-4 rounded-xl border border-slate-100">
                         <div>
                             <p className="text-xs font-bold text-slate-400 uppercase">Top Performer</p>
                             <p className="font-bold text-slate-900 text-lg">{report.groupHero}</p>
                         </div>
                         <div className="bg-yellow-100 text-yellow-600 p-2 rounded-full">
                             <Crown size={20} />
                         </div>
                     </div>
                     <p className="text-center text-sm font-bold text-slate-400">
                         Group Average Consistency: <span className="text-slate-800">{report.groupConsistency}%</span>
                     </p>
                </div>
            </div>
        </div>
    );
};

export default PeriodicReportPage;