import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/supabaseService';
import { Resolution, User } from '../types';
import { Users, Globe, ArrowRight } from 'lucide-react';

const GroupResolutions: React.FC = () => {
  const navigate = useNavigate();
  const [groupData, setGroupData] = useState<{ user: User, resolutions: Resolution[] }[]>([]);

  useEffect(() => {
    const loadData = async () => {
      const data = await api.getPublicResolutionsForGroup();
      setGroupData(data || []);
    };
    loadData();
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header className="pb-6 border-b border-slate-200/50">
        <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-sky-100 text-sky-700 rounded-xl">
                <Users size={24} />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Group Goals</h1>
        </div>
        <p className="text-slate-500 text-lg">Public commitments from your pack.</p>
      </header>

      {groupData.length === 0 ? (
          <div className="p-10 text-center bg-white rounded-3xl border border-slate-100">
              <p className="text-slate-400 font-bold">No public resolutions found in this group yet.</p>
          </div>
      ) : (
          <div className="grid grid-cols-1 gap-8">
              {groupData.map((data) => (
                  <div key={data.user.id} className="space-y-4">
                      <div 
                        onClick={() => navigate(`/profile/${data.user.id}`)}
                        className="flex items-center gap-3 cursor-pointer hover:opacity-75 transition-opacity w-fit"
                      >
                          <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold text-sm">
                              {data.user.avatarInitials}
                          </div>
                          <h2 className="text-xl font-bold text-slate-900">{data.user.name}</h2>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {data.resolutions.map(res => (
                              <div 
                                key={res.id} 
                                onClick={() => navigate(`/resolutions/${res.id}`)}
                                className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between h-full hover:shadow-md hover:scale-[1.02] hover:border-violet-200 transition-all cursor-pointer group"
                              >
                                  <div>
                                      <div className="flex items-center justify-between mb-2">
                                          <div className="flex items-center gap-2">
                                              <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-50 px-2 py-0.5 rounded-md">{res.category}</span>
                                              <Globe size={12} className="text-sky-400" />
                                          </div>
                                          <ArrowRight size={16} className="text-slate-300 group-hover:text-violet-500 transition-colors" />
                                      </div>
                                      <h3 className="font-bold text-slate-800 text-lg leading-snug mb-1">{res.title}</h3>
                                  </div>
                                  <div className="mt-4 pt-3 border-t border-slate-50 flex justify-between items-center text-xs font-bold text-slate-400">
                                      <span>{res.type}</span>
                                      <span className="bg-violet-50 text-violet-600 px-2 py-0.5 rounded-md">Lvl {res.difficulty}</span>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>
              ))}
          </div>
      )}
    </div>
  );
};

export default GroupResolutions;
