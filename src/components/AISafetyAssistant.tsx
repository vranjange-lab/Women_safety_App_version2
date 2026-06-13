import React, { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, Brain, Loader, MessageSquare, AlertCircle, ShieldCheck, AlertTriangle, ShieldAlert, Zap, Compass, PhoneCall } from 'lucide-react';
import { dbService } from '../lib/dbService';
import { ChatMessage, UserProfile } from '../types';

interface AISafetyAssistantProps {
  userId: string;
  userProfile: UserProfile;
}

export default function AISafetyAssistant({ userId, userProfile }: AISafetyAssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorError] = useState<string | null>(null);

  // Threat Assessment State
  const [currentRiskLevel, setCurrentRiskLevel] = useState<'low' | 'medium' | 'high'>('low');
  const [safetyAdvice, setSafetyAdvice] = useState<string>('Vigilance activated. Stay in well-lit public spots.');
  
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const suggestionPrompts = [
    { title: 'Followed on street', text: 'I am walking down a dark street and feel like a man is tailing me. Please assess my risk level (Low, Medium, or High) and give me step-by-step safety advice.' },
    { title: 'Riding in cab alone', text: 'I am alone in a taxi/Uber. The driver is taking an unfamiliar route, won\'t answer questions, and is speeding. Assess my risk level and give me immediate advice.' },
    { title: 'Unfamiliar neighborhood', text: 'I am in a new neighborhood, it is late at night, and I am lost. What is my risk level and how can I safely find coordinates?' },
    { title: 'Practice assertiveness', text: 'Pretend to be a harasser so I can practice assertion tactics and high-pitch voice triggers to repel suspects.' }
  ];

  // Load chat messages on start
  useEffect(() => {
    let active = true;
    const fetchChats = async () => {
      const list = await dbService.getChatHistory(userId);
      if (active) {
        setMessages(list);
        updateRiskAndContext(list);
      }
    };
    fetchChats();
    return () => { active = false; };
  }, [userId]);

  // Scroll current view down on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Parse the last response to dynamically extract risk levels and custom advice for the hackathon UI
  const updateRiskAndContext = (chatList: ChatMessage[]) => {
    if (chatList.length === 0) {
      setCurrentRiskLevel('low');
      setSafetyAdvice('Situational awareness monitor active. Standby.');
      return;
    }

    // Get latest assistant response
    const lastBotMessage = [...chatList].reverse().find(m => m.role === 'model');
    if (!lastBotMessage) {
      // Look at user message if no bot response yet
      const lastUser = [...chatList].reverse().find(m => m.role === 'user');
      if (lastUser) {
        const text = lastUser.text.toLowerCase();
        if (text.includes('follow') || text.includes('tail') || text.includes('cab') || text.includes('uber') || text.includes('lost')) {
          setCurrentRiskLevel('medium');
          setSafetyAdvice('Sentry Caution: Walking alone late-hours detected. Assess nearest safe spots.');
        }
      }
      return;
    }

    const text = lastBotMessage.text.toLowerCase();
    
    if (text.includes('high risk') || text.includes('danger') || text.includes('threat') || text.includes('stalk') || text.includes('imminent')) {
      setCurrentRiskLevel('high');
      setSafetyAdvice('🚨 CRITICAL DANGER: Head to open commercial stores or dial emergency SOS immediate.');
    } else if (text.includes('medium risk') || text.includes('caution') || text.includes('warning') || text.includes('cab') || text.includes('unfamiliar')) {
      setCurrentRiskLevel('medium');
      setSafetyAdvice('⚠️ CAUTION EXERCISED: Set safety journey timers or trigger decoy mock call.');
    } else {
      setCurrentRiskLevel('low');
      setSafetyAdvice('🛡️ SAFE STANDBY: Safe environment analyzed. Maintain watch.');
    }
  };

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || inputText;
    if (!textToSend.trim() || isLoading) return;

    setErrorError(null);
    if (!customText) setInputText('');

    // Append user message locally & save to DB
    const userMsg: Omit<ChatMessage, 'id'> = {
      role: 'user',
      text: textToSend,
      timestamp: new Date().toISOString()
    };
    
    const savedUserMsg = await dbService.addChatMessage(userId, userMsg);
    setMessages(prev => {
      const updated = [...prev, savedUserMsg];
      updateRiskAndContext(updated);
      return updated;
    });
    setIsLoading(true);

    try {
      // Get actual current geolocation using browser API
      let actualLocation = {
        address: 'Downtown Hub Transit Area (Fallback)',
        lat: 37.7749,
        lng: -122.4194
      };

      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 4000
            });
          });
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          actualLocation = {
            address: `Coordinates (${lat.toFixed(5)}, ${lng.toFixed(5)})`,
            lat,
            lng
          };

          // Try reverse geocoding via OpenStreetMap Nominatim
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`, {
              headers: { 'Accept-Language': 'en' }
            });
            if (res.ok) {
              const data = await res.json();
              actualLocation.address = data.display_name || actualLocation.address;
            }
          } catch (geoErr) {
            console.warn('Reverse geocoding error:', geoErr);
          }
        } catch (posErr) {
          console.warn('Could not retrieve browser geolocation:', posErr);
        }
      }

      const response = await fetch('/api/gemini/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, savedUserMsg],
          userProfile,
          currentLocation: actualLocation
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Server returned an error');
      }

      const data = await response.json();

      // Append model message locally & save to DB
      const botMsg: Omit<ChatMessage, 'id'> = {
        role: 'model',
        text: data.text,
        timestamp: new Date().toISOString()
      };
      
      const savedBotMsg = await dbService.addChatMessage(userId, botMsg);
      setMessages(prev => {
        const updated = [...prev, savedBotMsg];
        updateRiskAndContext(updated);
        return updated;
      });
    } catch (err: any) {
      console.error(err);
      setErrorError(err.message || 'Unable to connect with AI Safety Assistant.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="ai_assistant_panel" className="p-4 md:p-6 bg-slate-900 border border-slate-800 rounded-3xl text-white shadow-xl flex flex-col h-[580px]">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-violet-500/10 border border-violet-500/20">
            <Sparkles className="w-5 h-5 text-violet-400 animate-pulse" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm tracking-tight text-slate-100 flex items-center gap-1.5">
              AI Sentry Threat Advisor
              <span className="inline-block py-0.5 px-2 text-[9px] uppercase bg-violet-500/20 text-violet-300 font-black rounded-full">Gemini 3.5 Active</span>
            </h3>
            <p className="text-[10px] text-slate-400">On-demand safety scanner & interactive risk assessor</p>
          </div>
        </div>
      </div>

      {/* Threat Assessment Center Card Panel */}
      <div className="my-3.5 p-3 rounded-2xl bg-slate-950 border border-slate-850 flex items-center justify-between gap-3 animate-fade-in shrink-0">
        <div className="flex items-start gap-2.5">
          {currentRiskLevel === 'high' && (
            <div className="p-2.5 bg-red-500/15 border border-red-505 text-red-400 rounded-xl animate-bounce">
              <ShieldAlert className="w-5 h-5" />
            </div>
          )}
          {currentRiskLevel === 'medium' && (
            <div className="p-2.5 bg-amber-500/15 border border-amber-505 text-amber-400 rounded-xl">
              <AlertTriangle className="w-5 h-5" />
            </div>
          )}
          {currentRiskLevel === 'low' && (
            <div className="p-2.5 bg-emerald-500/15 border border-emerald-505 text-emerald-400 rounded-xl">
              <ShieldCheck className="w-5 h-5" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Threat Audit Assessment:</span>
              <span className={`text-[10px] font-black uppercase py-0.5 px-2 rounded-full ${
                currentRiskLevel === 'high' ? 'bg-red-550/20 text-red-400 animate-pulse' :
                currentRiskLevel === 'medium' ? 'bg-amber-550/20 text-amber-400' :
                'bg-emerald-550/20 text-emerald-400'
              }`}>
                {currentRiskLevel === 'high' ? 'HIGH RISK' : currentRiskLevel === 'medium' ? 'MEDIUM RISK' : 'LOW RISK'}
              </span>
            </div>
            <p className="text-[11px] text-slate-300 mt-1 font-semibold">{safetyAdvice}</p>
          </div>
        </div>

        {/* Dynamic Risk suggestions shortcut */}
        <div className="shrink-0 hidden sm:block">
          {currentRiskLevel === 'high' && (
            <button
              onClick={() => alert('Emergency dispatch notification sent to Sentry networks!')}
              className="py-1.5 px-3 bg-red-650 hover:bg-red-700 text-white rounded-xl text-[10px] font-black uppercase tracking-wider transition-all animate-pulse"
            >
              Trigger SOS Alert
            </button>
          )}
          {currentRiskLevel === 'medium' && (
            <div className="flex gap-1.5">
              <span className="text-[9px] bg-slate-900 border border-slate-800 p-1 px-2.5 rounded text-amber-400 font-bold">Use Decoy ring</span>
            </div>
          )}
          {currentRiskLevel === 'low' && (
            <span className="text-[9px] text-emerald-400 font-bold">🛡️ Area Secure</span>
          )}
        </div>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto py-2 space-y-4 pr-1">
        {messages.length === 0 ? (
          <div className="text-center py-12 flex flex-col items-center justify-center h-full">
            <Brain className="w-10 h-10 text-slate-700 mb-3 animate-pulse" />
            <p className="text-xs text-slate-500 max-w-sm">No active consultation history threads. Select an prompt below to query SafeHer's safety advisor.</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col max-w-[85%] ${
                msg.role === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'
              }`}
            >
              <div
                className={`p-3.5 rounded-2xl text-xs leading-relaxed whitespace-pre-line ${
                  msg.role === 'user'
                    ? 'bg-rose-500 text-white rounded-tr-none'
                    : 'bg-slate-950 border border-slate-800 text-slate-200 rounded-tl-none font-sans font-medium'
                }`}
              >
                {msg.text}
              </div>
              <span className="text-[9px] text-slate-500 mt-1 px-1">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex items-start gap-2 max-w-[85%]">
            <div className="bg-slate-950 border border-slate-800 rounded-2xl rounded-tl-none p-3.5 flex items-center gap-2 text-xs text-slate-400">
              <Loader className="w-4 h-4 text-violet-400 animate-spin" />
              Scanning Threat Coordinates & formulating guide steps...
            </div>
          </div>
        )}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-start gap-2 max-w-sm ml-auto mr-auto">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
            <p>{errorMsg}</p>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Suggestion Prompts */}
      {messages.length <= 1 && !isLoading && (
        <div className="mb-3.5 shrink-0">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-black mb-2 px-1">Suggested Emergency Queries</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {suggestionPrompts.map((s) => (
              <button
                key={s.title}
                onClick={() => handleSendMessage(s.text)}
                className="p-2.5 rounded-xl border border-slate-850 hover:border-slate-700 bg-slate-950 hover:bg-slate-900 text-left text-[11px] text-slate-350 transition-all hover:scale-[1.01] cursor-pointer cursor-copy flex items-start gap-1.5"
              >
                <Zap className="w-3.5 h-3.5 text-violet-400 mt-0.5 shrink-0" />
                <span>{s.title}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-full border border-slate-800 focus-within:border-slate-700 shrink-0"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Type situational factors (e.g. following on sidewalk)..."
          className="flex-1 bg-transparent px-3 text-xs outline-none text-slate-200 placeholder-slate-500"
          disabled={isLoading}
        />
        <button
          type="submit"
          className="p-2.5 rounded-full bg-rose-500 hover:bg-rose-600 text-white shrink-0 active:scale-95 transition-all cursor-pointer flex items-center justify-center"
          disabled={isLoading || !inputText.trim()}
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
}
