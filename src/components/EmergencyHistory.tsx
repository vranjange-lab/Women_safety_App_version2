import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, CheckCircle, Slash, FileText, Check, Award } from 'lucide-react';
import { dbService } from '../lib/dbService';
import { AlertHistory } from '../types';

interface EmergencyHistoryProps {
  userId: string;
  key?: any;
}

export default function EmergencyHistory({ userId }: EmergencyHistoryProps) {
  const [history, setHistory] = useState<AlertHistory[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');

  // Load history log
  useEffect(() => {
    let active = true;
    const fetchHistory = async () => {
      const list = await dbService.getEmergencyHistory(userId);
      if (active) setHistory(list);
    };
    fetchHistory();
    return () => { active = false; };
  }, [userId]);

  const loadHistory = async () => {
    const list = await dbService.getEmergencyHistory(userId);
    setHistory(list);
  };

  const handleUpdateNotes = async (id: string) => {
    if (!notes.trim()) return;
    await dbService.updateEmergencyAlert(userId, id, { notes });
    setExpandedId(null);
    setNotes('');
    await loadHistory();
  };

  const getStatusStyle = (status: 'active' | 'resolved' | 'cancelled') => {
    switch (status) {
      case 'active':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'resolved':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'cancelled':
        return 'bg-slate-800 text-slate-400 border-slate-700/50';
    }
  };

  return (
    <div id="emergency_history" className="p-4 md:p-6 bg-slate-900 border border-slate-800 rounded-3xl text-white shadow-xl">
      {/* Header */}
      <div className="pb-4 border-b border-slate-800 mb-6">
        <h3 className="font-extrabold text-sm tracking-tight text-slate-100 flex items-center gap-1.5">
          Emergency Distress History Logs
          <span className="inline-block py-0.5 px-2 text-[9px] uppercase bg-slate-800 text-slate-300 font-black rounded-full">{history.length} Logs</span>
        </h3>
        <p className="text-[10px] text-slate-400">Chronological list of triggered SOS alarms and resolution audits</p>
      </div>

      {/* Incident List */}
      <div className="space-y-4">
        {history.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-slate-850 rounded-2xl bg-slate-950/20">
            <Award className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-xs text-slate-500">Your emergency timeline is clear.</p>
          </div>
        ) : (
          history.map((item, idx) => {
            const dateObj = new Date(item.timestamp);
            const formattedDate = dateObj.toLocaleDateString(undefined, { 
              year: 'numeric', month: 'short', day: 'numeric' 
            });
            const formattedTime = dateObj.toLocaleTimeString([], { 
              hour: '2-digit', minute: '2-digit' 
            });

            const isExpanded = expandedId === item.id;

            return (
              <div
                key={item.id}
                className="rounded-2xl border border-slate-850 bg-slate-950 p-4 transition-all hover:border-slate-800 flex flex-col gap-3 relative overflow-hidden"
              >
                {/* Visual timeline link wire */}
                {idx < history.length - 1 && (
                  <div className="absolute left-[29px] top-12 bottom-[-16px] w-[1px] bg-slate-850 z-0 hidden md:block" />
                )}

                {/* Main Card row */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 z-10">
                  <div className="flex items-start md:items-center gap-3">
                    <div className="p-2.5 rounded-full bg-slate-900 border border-slate-850 text-slate-400 shrink-0 select-none">
                      <Clock className="w-4 h-4 text-rose-400" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-black text-slate-100 uppercase tracking-tight">SOS Triggered</span>
                        <span className={`py-0.5 px-2 text-[8px] uppercase font-black rounded-full border ${getStatusStyle(item.status)}`}>
                          {item.status}
                        </span>
                      </div>
                      
                      <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-500" />
                        {formattedDate} at {formattedTime}
                      </p>
                    </div>
                  </div>

                  {/* Actions column */}
                  <button
                    onClick={() => {
                      setExpandedId(isExpanded ? null : item.id);
                      setNotes(item.notes || '');
                    }}
                    className="py-1.5 px-3 rounded-xl bg-slate-900 border border-slate-850 hover:bg-slate-800 text-[10px] font-black uppercase text-slate-300 transition-all flex items-center gap-1 ml-auto cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    {isExpanded ? 'Collapse' : 'Audit Details'}
                  </button>
                </div>

                {/* Sub-row Location */}
                <div className="flex items-start gap-1 px-1 bg-slate-950 text-[11px] text-slate-400 uppercase tracking-tight py-2 border-t border-b border-slate-900/60 z-10 leading-tight">
                  <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                  <span className="truncate">{item.locationAddress}</span>
                </div>

                {/* Expanded Details and Resolution Modifiers */}
                {isExpanded && (
                  <div className="bg-slate-900/40 p-3 rounded-xl border border-slate-850/60 animate-slide-down space-y-3 mt-1.5 text-xs text-slate-300">
                    <div>
                      <p className="font-bold text-slate-200">Incident Resolution Notes:</p>
                      <p className="mt-1 leading-relaxed text-[11px] text-slate-400 italic font-medium">
                        {item.notes || 'No custom notes provided for this occurance yet.'}
                      </p>
                    </div>

                    {/* Add/Edit Notes Input */}
                    <div className="pt-2 border-t border-slate-850/40 space-y-2">
                      <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest block">Update Resolution audit details</p>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          placeholder="e.g. Police reached. Escorted safely to base."
                          className="bg-slate-950 border border-slate-850 rounded-xl px-3 py-2 text-xs text-slate-200 outline-none w-full focus:border-slate-700"
                        />
                        <button
                          onClick={() => handleUpdateNotes(item.id)}
                          className="p-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold active:scale-95 transition-all cursor-pointer flex items-center justify-center shrink-0"
                          title="Save note"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
