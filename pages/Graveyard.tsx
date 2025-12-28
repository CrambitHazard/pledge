import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/supabaseService';
import { Resolution } from '../types';
import Button from '../components/Button';
import { ArrowLeft, Archive, AlertCircle, Clock } from 'lucide-react';

const Graveyard: React.FC = () => {
    const navigate = useNavigate();
    const [archived, setArchived] = useState<Resolution[]>([]);

    useEffect(() => {
        setArchived(api.getGraveyard());
    }, []);

    return (
        <div className="max-w-2xl mx-auto space-y-6 pb-10">
            <Button variant="ghost" onClick={() => navigate(-1)} className="pl-0 hover:bg-transparent hover:text-violet-600">
                <ArrowLeft size={20} className="mr-2" /> Back
            </Button>

            <header className="space-y-2">
                <h1 className="text-4xl font-black text-slate-400 tracking-tight flex items-center gap-3">
                    <Archive size={32} /> The Graveyard
                </h1>
                <p className="text-slate-500 font-medium">Resolutions that have ended or were abandoned. Use this for reflection, not shame.</p>
            </header>

            {archived.length === 0 ? (
                <div className="text-center py-20 bg-slate-50 rounded-[2.5rem] border border-slate-100 border-dashed">
                    <p className="text-slate-400 font-bold">No resolutions in the graveyard yet.</p>
                    <p className="text-sm text-slate-400 mt-2">Keep your streaks alive!</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {archived.map(res => (
                        <div key={res.id} className="bg-slate-50 p-6 rounded-[2rem] border border-slate-200 grayscale hover:grayscale-0 transition-all">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <h3 className="text-xl font-bold text-slate-700 line-through decoration-slate-400 decoration-2">{res.title}</h3>
                                    <p className="text-xs font-bold text-slate-400 uppercase mt-1">Ended: {new Date(res.archivedAt!).toLocaleDateString()}</p>
                                </div>
                                <div className="bg-slate-200 text-slate-500 text-xs font-bold px-3 py-1 rounded-full uppercase">
                                    Streak: {res.currentStreak}
                                </div>
                            </div>
                            
                            <div className="bg-white p-4 rounded-xl border border-slate-100 flex items-start gap-3">
                                <AlertCircle size={18} className="text-slate-400 mt-0.5" />
                                <div>
                                    <p className="text-xs font-bold text-slate-400 uppercase mb-1">Reason for archiving</p>
                                    <p className="text-slate-600 font-medium text-sm italic">"{res.archivedReason}"</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Graveyard;
