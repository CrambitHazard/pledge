import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/supabaseService';
import { Resolution, ResolutionType, Difficulty } from '../types';
import Button from '../components/Button';
import Input from '../components/Input';
import { Plus, Lock, Globe, ArrowRight, Activity, Flame, CheckSquare, AlertTriangle, Archive } from 'lucide-react';

const Resolutions: React.FC = () => {
  const navigate = useNavigate();
  const [resolutions, setResolutions] = useState<Resolution[]>([]);
  const [isCreating, setIsCreating] = useState(false);

  // New Resolution Form State
  const [formData, setFormData] = useState({
    title: '',
    category: '',
    type: ResolutionType.BINARY as ResolutionType,
    difficulty: 3 as Difficulty,
    isPrivate: false,
    targetCount: 3,
    subGoal1: '',
    subGoal2: '',
    subGoal3: ''
  });

  useEffect(() => {
    setResolutions(api.getMyResolutions());
  }, []);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;
    
    const subGoals = [formData.subGoal1, formData.subGoal2, formData.subGoal3].filter(s => s.trim() !== '');

    api.addResolution({
        title: formData.title,
        category: formData.category || 'General',
        type: formData.type,
        difficulty: formData.difficulty,
        isPrivate: formData.isPrivate,
        targetCount: formData.type === ResolutionType.FREQUENCY ? formData.targetCount : undefined,
        subGoals: subGoals
    });
    
    setResolutions(api.getMyResolutions());
    
    // Reset form
    setFormData({
        title: '',
        category: '',
        type: ResolutionType.BINARY,
        difficulty: 3,
        isPrivate: false,
        targetCount: 3,
        subGoal1: '',
        subGoal2: '',
        subGoal3: ''
    });
    setIsCreating(false);
  };

  const getDifficultyColor = (diff: Difficulty) => {
      if (diff <= 2) return 'bg-emerald-100 text-emerald-700';
      if (diff === 3) return 'bg-amber-100 text-amber-700';
      return 'bg-rose-100 text-rose-700';
  };

  const getTypeIcon = (type: ResolutionType) => {
      switch(type) {
          case ResolutionType.STREAK: return <Flame size={14} />;
          case ResolutionType.FREQUENCY: return <Activity size={14} />;
          default: return <CheckSquare size={14} />;
      }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-10">
      <header className="flex justify-between items-center pb-6">
        <div>
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">My Goals</h2>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Your Resolutions</h1>
        </div>
        {!isCreating && (
            <Button onClick={() => setIsCreating(true)} className="rounded-full px-8 bg-violet-600 hover:bg-violet-700 shadow-violet-200">
                <Plus size={24} className="mr-2" /> New Goal
            </Button>
        )}
      </header>

      {/* Creation Modal / Inline Form */}
      {isCreating && (
        <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[2rem] shadow-2xl shadow-violet-100 border border-white animate-in fade-in slide-in-from-top-4 relative z-10">
            <h3 className="text-2xl font-black text-slate-900 mb-6 border-b border-slate-100 pb-4">Define a New Commitment</h3>
            <form onSubmit={handleCreate} className="space-y-8">
                <Input 
                    placeholder="E.g., Read 10 pages daily" 
                    label="Resolution Title" 
                    value={formData.title}
                    onChange={(e) => setFormData({...formData, title: e.target.value})}
                    autoFocus
                    required
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <Input 
                        placeholder="E.g., Intellect" 
                        label="Category" 
                        value={formData.category}
                        onChange={(e) => setFormData({...formData, category: e.target.value})}
                    />
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Difficulty (1-5)</label>
                        <div className="flex justify-between gap-2">
                            {[1, 2, 3, 4, 5].map((level) => (
                                <button
                                    key={level}
                                    type="button"
                                    onClick={() => setFormData({...formData, difficulty: level as Difficulty})}
                                    className={`flex-1 py-3 rounded-xl font-black text-lg transition-all ${
                                        formData.difficulty === level 
                                        ? 'bg-violet-600 text-white shadow-lg shadow-violet-200 scale-105' 
                                        : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                                    }`}
                                >
                                    {level}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Tracking Type</label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[
                            { id: ResolutionType.BINARY, label: 'Standard', desc: 'Done / Not Done', icon: CheckSquare },
                            { id: ResolutionType.STREAK, label: 'Streak', desc: 'Don\'t break the chain', icon: Flame },
                            { id: ResolutionType.FREQUENCY, label: 'Frequency', desc: 'X times per week', icon: Activity }
                        ].map((type) => (
                            <button
                                key={type.id}
                                type="button"
                                onClick={() => setFormData({...formData, type: type.id as ResolutionType})}
                                className={`text-left p-4 rounded-2xl border-2 transition-all flex flex-col gap-2 ${
                                    formData.type === type.id 
                                    ? 'border-violet-500 bg-violet-50 text-violet-900 ring-1 ring-violet-500' 
                                    : 'border-slate-100 bg-white hover:border-slate-300'
                                }`}
                            >
                                <div className={`p-2 rounded-lg w-fit ${formData.type === type.id ? 'bg-violet-200' : 'bg-slate-100 text-slate-500'}`}>
                                    <type.icon size={20} />
                                </div>
                                <div>
                                    <p className="font-bold text-sm">{type.label}</p>
                                    <p className="text-xs opacity-70">{type.desc}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Sub-Goals Section */}
                <div>
                     <label className="block text-sm font-bold text-slate-700 mb-2">Sub-goals (Optional)</label>
                     <p className="text-xs text-slate-400 mb-2">Specific criteria for completion. These cannot be changed later.</p>
                     <div className="space-y-3">
                         <Input 
                            placeholder="e.g. No skimming" 
                            value={formData.subGoal1}
                            onChange={(e) => setFormData({...formData, subGoal1: e.target.value})}
                         />
                         <Input 
                            placeholder="e.g. Must take notes" 
                            value={formData.subGoal2}
                            onChange={(e) => setFormData({...formData, subGoal2: e.target.value})}
                         />
                         <Input 
                            placeholder="e.g. Before 9pm" 
                            value={formData.subGoal3}
                            onChange={(e) => setFormData({...formData, subGoal3: e.target.value})}
                         />
                     </div>
                </div>

                {formData.type === ResolutionType.FREQUENCY && (
                     <div className="max-w-xs">
                        <Input 
                            type="number"
                            min="1"
                            max="20"
                            label="Target: Times per week" 
                            value={formData.targetCount}
                            onChange={(e) => setFormData({...formData, targetCount: parseInt(e.target.value)})}
                        />
                     </div>
                )}

                <div className="flex items-center gap-3 pt-2 bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <input 
                        type="checkbox" 
                        id="isPrivate"
                        checked={formData.isPrivate}
                        onChange={(e) => setFormData({...formData, isPrivate: e.target.checked})}
                        className="w-5 h-5 rounded-md border-slate-300 text-violet-600 focus:ring-violet-500 cursor-pointer"
                    />
                    <label htmlFor="isPrivate" className="text-sm font-bold text-slate-700 cursor-pointer select-none flex items-center gap-2">
                        <Lock size={16} className="text-slate-400" /> Private Goal (Visible only to you)
                    </label>
                </div>

                <div className="flex justify-end gap-4 pt-4 border-t border-slate-100">
                    <Button type="button" variant="ghost" onClick={() => setIsCreating(false)}>Cancel</Button>
                    <Button type="submit" className="min-w-[140px]">Create Goal</Button>
                </div>
            </form>
        </div>
      )}

      {/* List of Resolutions */}
      <div className="grid grid-cols-1 gap-4">
        {resolutions.length === 0 && !isCreating && (
             <div className="text-center py-20 bg-white rounded-[2rem] border border-slate-100 shadow-sm">
                 <p className="text-slate-400 font-medium">You haven't defined any resolutions yet.</p>
                 <button onClick={() => setIsCreating(true)} className="text-violet-600 font-bold mt-2 hover:underline">Create your first goal</button>
             </div>
        )}
        
        {resolutions.map(res => {
            const health = api.getResolutionHealth(res);
            const isLocked = api.isResolutionLocked(res);
            
            return (
              <div 
                key={res.id} 
                onClick={() => navigate(`/resolutions/${res.id}`)}
                className="bg-white p-6 rounded-[1.5rem] border border-slate-100 shadow-sm hover:shadow-lg hover:scale-[1.01] transition-all cursor-pointer group relative overflow-hidden"
              >
                {/* Health Banners */}
                {health === 'slipping' && (
                    <div className="absolute top-0 left-0 right-0 bg-orange-100 text-orange-700 text-[10px] font-bold uppercase tracking-widest text-center py-1">
                        This resolution is slipping
                    </div>
                )}
                {health === 'at-risk' && (
                    <div className="absolute top-0 left-0 right-0 bg-rose-100 text-rose-700 text-[10px] font-bold uppercase tracking-widest text-center py-1">
                        At Risk • Missed 2+ times this week
                    </div>
                )}
                
                <div className={health !== 'healthy' ? 'mt-4' : ''}>
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide bg-slate-100 px-2 py-0.5 rounded-md">{res.category}</span>
                                {res.isPrivate ? (
                                     <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                                        <Lock size={10} /> Private
                                     </span>
                                ) : (
                                     <span className="flex items-center gap-1 text-[10px] font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-100">
                                        <Globe size={10} /> Public
                                     </span>
                                )}
                                {isLocked && (
                                    <span className="flex items-center gap-1 text-[10px] font-bold text-slate-400 border border-slate-100 px-2 py-0.5 rounded-md">
                                        <Lock size={10} /> Locked
                                    </span>
                                )}
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 group-hover:text-violet-700 transition-colors">{res.title}</h3>
                        </div>
                        <div className="flex items-center gap-4">
                             <div className="text-right hidden sm:block">
                                <span className={`text-xs font-bold px-2 py-1 rounded-full ${getDifficultyColor(res.difficulty)}`}>
                                    Lvl {res.difficulty}
                                </span>
                             </div>
                             <div className="bg-slate-50 p-2 rounded-full text-slate-400 group-hover:bg-violet-100 group-hover:text-violet-600 transition-colors">
                                <ArrowRight size={20} />
                             </div>
                        </div>
                    </div>
                    
                    <div className="mt-4 flex items-center gap-4 text-xs font-bold text-slate-500 border-t border-slate-50 pt-4">
                         <div className="flex items-center gap-1.5">
                            {getTypeIcon(res.type)}
                            <span>{res.type}</span>
                         </div>
                         {res.targetCount && (
                             <span>• {res.targetCount}x / week</span>
                         )}
                         {res.subGoals && res.subGoals.length > 0 && (
                             <span>• {res.subGoals.length} sub-goals</span>
                         )}
                    </div>
                </div>
              </div>
            );
        })}
        
        {/* Graveyard Link */}
        <div className="pt-4 text-center">
            <button 
                onClick={() => navigate('/graveyard')}
                className="inline-flex items-center gap-2 text-slate-400 font-bold text-sm hover:text-slate-600 transition-colors"
            >
                <Archive size={16} /> View Archived Goals
            </button>
        </div>
      </div>
    </div>
  );
};

export default Resolutions;
