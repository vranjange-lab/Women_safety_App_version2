import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, 
  Tv, 
  MapPin, 
  Compass, 
  Users, 
  History, 
  Settings, 
  Radio,
  Menu,
  X,
  Sparkles,
  Award,
  Lock,
  BarChart
} from 'lucide-react';

import AuthScreen from './components/AuthScreen';
import SOSDashboard from './components/SOSDashboard';
import AISafetyAssistant from './components/AISafetyAssistant';
import PlacesModule from './components/PlacesModule';
import ContactsManager from './components/ContactsManager';
import EmergencyHistory from './components/EmergencyHistory';
import ProfileSettings from './components/ProfileSettings';
import EvidenceVault from './components/EvidenceVault';
import AnalyticsDashboard from './components/AnalyticsDashboard';

import { dbService } from './lib/dbService';
import { isFirebasePlaceholder, auth } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { UserProfile } from './types';

export default function App() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [currentTab, setCurrentTab] = useState<'sos' | 'ai' | 'places' | 'contacts' | 'history' | 'settings' | 'vault' | 'analytics'>('sos');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Profile Context State
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: 'Jane Doe',
    phone: '+1 (555) 019-2834',
    email: 'jane.doe@example.com',
    bloodGroup: 'O+',
    medicalConditions: 'Asthma',
    emergencyNotes: 'Carries inhaler in purse. Sensitive to penicillin.',
    triggerMessage: 'Emergency! I need immediate help. Here is my live location: ',
    contactsShared: false
  });

  // Track active alarm counters so that widgets refresh on new registrations
  const [alertKeyCount, setAlertKeyCount] = useState(0);

  // Authenticated State Handler
  useEffect(() => {
    // If working in sandbox, skip Firebase session checks
    if (isFirebasePlaceholder) {
      const storedUser = localStorage.getItem('safeher_sandbox_session');
      if (storedUser) {
        setCurrentUser(JSON.parse(storedUser));
      }
      setAuthChecked(true);
      return;
    }

    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        // Load Profile
        const profile = await dbService.getUserProfile(user.uid);
        if (profile) setUserProfile(profile);
      } else {
        setCurrentUser(null);
      }
      setAuthChecked(true);
    });

    return () => unsub();
  }, []);

  // Update profile handler
  const handleSaveProfile = async (updatedProfile: UserProfile) => {
    setUserProfile(updatedProfile);
    await dbService.saveUserProfile(currentUser?.uid || 'guest', updatedProfile);
  };

  const handleAuthSuccess = async (user: any) => {
    setCurrentUser(user);
    if (isFirebasePlaceholder) {
      localStorage.setItem('safeher_sandbox_session', JSON.stringify(user));
    }
    const profile = await dbService.getUserProfile(user.uid);
    if (profile) setUserProfile(profile);
  };

  const handleLogOut = () => {
    if (isFirebasePlaceholder) {
      localStorage.removeItem('safeher_sandbox_session');
    } else {
      auth.signOut();
    }
    setCurrentUser(null);
    setCurrentTab('sos');
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center text-rose-500 font-bold">
        <div className="w-12 h-12 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm tracking-wider uppercase">Activating Protective Sentinel Shiled...</p>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }

  const tabList = [
    { id: 'sos', label: 'Distress Central', icon: Radio },
    { id: 'ai', label: 'AI Safety Advisor', icon: Sparkles },
    { id: 'places', label: 'Nearby Safe Zones', icon: Compass },
    { id: 'contacts', label: 'Guardians List', icon: Users },
    { id: 'history', label: 'distress logs', icon: History },
    { id: 'vault', label: 'Evidence Vault', icon: Lock },
    { id: 'analytics', label: 'Analytics', icon: BarChart },
    { id: 'settings', label: 'Safety Profile', icon: Settings }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col xl:flex-row pb-20 xl:pb-0">
      
      {/* ==========================================
          SIDEBAR DOCK (Desktop: Left | Mobile: Top)
          ========================================== */}
      <aside className="w-full xl:w-72 xl:min-h-screen bg-slate-900 border-b xl:border-b-0 xl:border-r border-slate-850 shrink-0 sticky top-0 z-40">
        <div className="h-16 xl:h-20 flex items-center justify-between px-6 border-b border-slate-850">
          
          {/* Brand Logo */}
          <div className="flex items-center gap-2.5 select-none">
            <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center">
              <Shield className="w-5 h-5 shrink-0" />
            </div>
            <div>
              <h2 className="font-black text-slate-200 tracking-tight leading-none text-base">GuardianX</h2>
              <span className="text-[9px] uppercase tracking-widest text-slate-500 font-black">Sentinel Network</span>
            </div>
          </div>

          {/* Mobile navigation toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="xl:hidden p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-100 hover:border-slate-700 transition"
          >
            {mobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>

        {/* Sidebar Nav anchors (Desktop) */}
        <nav className="hidden xl:flex flex-col gap-1.5 p-4">
          {tabList.map((tab) => {
            const Icon = tab.icon;
            const isSelected = currentTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setCurrentTab(tab.id as any)}
                className={`w-full py-3.5 px-4 rounded-2xl flex items-center gap-3.5 text-xs font-bold tracking-tight uppercase transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? 'bg-rose-500 text-slate-50 border-r-4 border-r-rose-700'
                    : 'bg-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-850/50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isSelected ? 'text-white shrink-0' : 'text-slate-500 shrink-0'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Mobile slide down navigation bar overlay drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="absolute left-0 right-0 bg-slate-900 border-b border-slate-850 shadow-2xl xl:hidden z-30 overflow-hidden"
            >
              <div className="flex flex-col gap-1 p-4">
                {tabList.map((tab) => {
                  const Icon = tab.icon;
                  const isSelected = currentTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setCurrentTab(tab.id as any);
                        setMobileMenuOpen(false);
                      }}
                      className={`w-full py-3 px-4 rounded-xl flex items-center gap-3 text-xs font-bold uppercase ${
                        isSelected
                          ? 'bg-rose-500 text-white'
                          : 'bg-transparent text-slate-400'
                      }`}
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </aside>

      {/* ==========================================
          MAIN CENTRAL VIEWPORT (Dyanmic tab views)
          ========================================== */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-4 md:p-6 lg:p-8 flex flex-col justify-start relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="w-full flex-1"
          >
            {/* Distress SOS Dashboard View */}
            {currentTab === 'sos' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <div className="lg:col-span-2">
                  <SOSDashboard 
                    userId={currentUser.uid} 
                    userProfile={userProfile}
                    onAlertTriggered={() => setAlertKeyCount(prev => prev + 1)}
                  />
                </div>
                {/* Secondary Dock: AI Safety Assistant quick tips */}
                <div className="space-y-6">
                  <div className="p-5 bg-slate-900 border border-slate-850 rounded-3xl text-xs space-y-4">
                    <h3 className="font-black text-rose-400 uppercase tracking-widest flex items-center gap-1.5 leading-none">
                      <Award className="w-4 h-4" />
                      Guardian Dispatch SMS Trigger
                    </h3>
                    <p className="text-slate-400 leading-relaxed font-semibold italic">
                      "{userProfile.triggerMessage} [Live coordinates link]"
                    </p>
                    <p className="text-[10px] text-slate-500 leading-tight">
                      To modify this trigger distress note, visit the Settings page. This message broadcasts immediately on SOS click.
                    </p>
                  </div>
                  
                  {/* Emergency history log list */}
                  <EmergencyHistory userId={currentUser.uid} key={alertKeyCount} />
                </div>
              </div>
            )}

            {/* AI Advisor Chat Assistance View */}
            {currentTab === 'ai' && (
              <div className="max-w-3xl mx-auto">
                <AISafetyAssistant userId={currentUser.uid} userProfile={userProfile} />
              </div>
            )}

            {/* Simulated Safe Zones Map View */}
            {currentTab === 'places' && (
              <PlacesModule />
            )}

            {/* Safety Guardians CRUD directory View */}
            {currentTab === 'contacts' && (
              <div className="max-w-3xl mx-auto">
                <ContactsManager userId={currentUser.uid} />
              </div>
            )}

            {/* Distress Timelines Logging view */}
            {currentTab === 'history' && (
              <div className="max-w-3xl mx-auto">
                <EmergencyHistory userId={currentUser.uid} key={alertKeyCount} />
              </div>
            )}

            {/* Secure Evidence Cryptographic Archive View */}
            {currentTab === 'vault' && (
              <div className="max-w-4xl mx-auto">
                <EvidenceVault userId={currentUser.uid} />
              </div>
            )}

            {/* Professional Analytics and Status Charts View */}
            {currentTab === 'analytics' && (
              <div className="max-w-5xl mx-auto">
                <AnalyticsDashboard userId={currentUser.uid} />
              </div>
            )}

            {/* User Profile and Preferences view */}
            {currentTab === 'settings' && (
              <ProfileSettings 
                userProfile={userProfile} 
                onSaveProfile={handleSaveProfile}
                onLogOut={handleLogOut}
                currentUser={currentUser}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* ==========================================
          MOBILE NAVIGATION TABS (Action Bar Bottom)
          ========================================== */}
      <footer className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-850 flex xl:hidden px-2 py-1.5 justify-around items-center z-40 select-none">
        {tabList.map((tab) => {
          const Icon = tab.icon;
          const isSelected = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setCurrentTab(tab.id as any)}
              className={`p-2 w-14 flex flex-col items-center justify-center gap-1 rounded-xl transition-all cursor-pointer ${
                isSelected ? 'text-rose-500 scale-105' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span className="text-[8px] uppercase tracking-tighter font-extrabold truncate w-full text-center">
                {tab.id}
              </span>
            </button>
          );
        })}
      </footer>

    </div>
  );
}
