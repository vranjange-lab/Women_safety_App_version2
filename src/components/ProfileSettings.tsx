import React, { useState } from 'react';
import { User, Phone, Mail, Droplet, Heart, MessageSquare, ShieldCheck, UserCheck, Key, LogOut } from 'lucide-react';
import { isFirebasePlaceholder } from '../lib/firebase';
import { UserProfile } from '../types';

interface ProfileSettingsProps {
  userProfile: UserProfile;
  onSaveProfile: (profile: UserProfile) => Promise<void>;
  onLogOut?: () => void;
  currentUser: any; // User object containing email, displayName etc.
}

export default function ProfileSettings({ userProfile, onSaveProfile, onLogOut, currentUser }: ProfileSettingsProps) {
  const [name, setName] = useState(userProfile.name);
  const [phone, setPhone] = useState(userProfile.phone);
  const [bloodGroup, setBloodGroup] = useState(userProfile.bloodGroup);
  const [medicalConditions, setMedicalConditions] = useState(userProfile.medicalConditions);
  const [emergencyNotes, setEmergencyNotes] = useState(userProfile.emergencyNotes);
  const [triggerMessage, setTriggerMessage] = useState(userProfile.triggerMessage);
  
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim() || !triggerMessage.trim()) return;

    setIsSaving(true);
    setSuccess(false);

    const updated: UserProfile = {
      ...userProfile,
      name,
      phone,
      bloodGroup,
      medicalConditions,
      emergencyNotes,
      triggerMessage
    };

    await onSaveProfile(updated);
    setIsSaving(false);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  };

  return (
    <div id="profile_settings_panel" className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      
      {/* 2/3 Column Form Settings content */}
      <form
        onSubmit={handleSave}
        className="xl:col-span-2 p-4 md:p-6 bg-slate-900 border border-slate-800 rounded-3xl text-white shadow-xl space-y-5"
      >
        <div>
          <h3 className="font-extrabold text-sm tracking-tight text-slate-100 flex items-center gap-1.5">
            Safety Particulars & Profile Settings
            {success && (
              <span className="inline-block py-0.5 px-2 text-[9px] uppercase bg-emerald-500/20 text-emerald-300 font-black rounded-full animate-pulse">Saved Successfully</span>
            )}
          </h3>
          <p className="text-[10px] text-slate-400">Prefilled parameters for medical alerts and SMS broadcast dispatches</p>
        </div>

        {/* Input Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* User Name */}
          <div>
            <label className="text-[10px] text-slate-400 uppercase tracking-widest font-black block mb-1">Your Full Name</label>
            <div className="flex items-center gap-2 bg-slate-950 px-3 py-2 border border-slate-850 rounded-xl">
              <User className="w-4 h-4 text-rose-500" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                className="bg-transparent border-none outline-none text-xs text-slate-200 placeholder-slate-700 w-full"
                required
              />
            </div>
          </div>

          {/* User Phone */}
          <div>
            <label className="text-[10px] text-slate-400 uppercase tracking-widest font-black block mb-1">Your Handset Phone</label>
            <div className="flex items-center gap-2 bg-slate-950 px-3 py-2 border border-slate-850 rounded-xl">
              <Phone className="w-4 h-4 text-rose-500" />
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 777-1212"
                className="bg-transparent border-none outline-none text-xs text-slate-200 placeholder-slate-700 w-full"
                required
              />
            </div>
          </div>

          {/* Blood Group */}
          <div>
            <label className="text-[10px] text-slate-400 uppercase tracking-widest font-black block mb-1">Blood Group Type</label>
            <div className="flex items-center gap-2 bg-slate-950 px-3 py-2 border border-slate-850 rounded-xl">
              <Droplet className="w-4 h-4 text-emerald-400" />
              <select
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                className="bg-transparent border-none outline-none text-xs text-slate-200 w-full cursor-pointer"
              >
                <option value="Unknown" className="bg-slate-950">Unknown / Prefer blank</option>
                <option value="A+" className="bg-slate-950">A+ (A Positive)</option>
                <option value="A-" className="bg-slate-950">A- (A Negative)</option>
                <option value="B+" className="bg-slate-950">B+ (B Positive)</option>
                <option value="B-" className="bg-slate-950">B- (B Negative)</option>
                <option value="O+" className="bg-slate-950">O+ (O Positive)</option>
                <option value="O-" className="bg-slate-950">O- (O Negative)</option>
                <option value="AB+" className="bg-slate-950">AB+ (AB Positive)</option>
                <option value="AB-" className="bg-slate-950">AB- (AB Negative)</option>
              </select>
            </div>
          </div>

          {/* Medical Conditions */}
          <div>
            <label className="text-[10px] text-slate-400 uppercase tracking-widest font-black block mb-1">Critical Conditions / Allergies</label>
            <div className="flex items-center gap-2 bg-slate-950 px-3 py-2 border border-slate-850 rounded-xl">
              <Heart className="w-4 h-4 text-rose-500 animate-pulse" />
              <input
                type="text"
                value={medicalConditions}
                onChange={(e) => setMedicalConditions(e.target.value)}
                placeholder="e.g. Asthma, Penicillin allergy"
                className="bg-transparent border-none outline-none text-xs text-slate-200 placeholder-slate-700 w-full"
              />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="text-[10px] text-slate-400 uppercase tracking-widest font-black block mb-1">E.R. Responder Medical Notes</label>
          <textarea
            value={emergencyNotes}
            onChange={(e) => setEmergencyNotes(e.target.value)}
            placeholder="Write details like medication timings, contacts, or emergency dispatch directives..."
            className="w-full bg-slate-950 border border-slate-850 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 outline-none focus:border-slate-800 min-h-[70px]"
          />
        </div>

        {/* SOS SMS text template */}
        <div>
          <label className="text-[10px] text-slate-400 uppercase tracking-widest font-black block mb-1">Custom SOS Broadcast SMS trigger text</label>
          <div className="flex items-start gap-2 bg-slate-950 px-3 py-2.5 border border-slate-850 rounded-xl">
            <MessageSquare className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <textarea
              value={triggerMessage}
              onChange={(e) => setTriggerMessage(e.target.value)}
              placeholder="e.g. Help! I'm in danger. Here is my current coordinates..."
              className="bg-transparent border-none outline-none text-xs text-slate-200 placeholder-slate-700 w-full min-h-[50px] resize-none"
              required
            />
          </div>
          <p className="text-[9px] text-slate-500 italic mt-1 leading-tight">
            * GPS location link is automatically appended when distress dial activates.
          </p>
        </div>

        {/* Save button */}
        <div className="flex justify-end pt-3">
          <button
            type="submit"
            disabled={isSaving}
            className="py-3 px-8 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-black uppercase transition-all transform active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
          >
            {isSaving ? 'Updating...' : 'Save Particulars'}
          </button>
        </div>
      </form>

      {/* 1/3 User Auth session column details */}
      <div className="p-4 md:p-6 bg-slate-900 border border-slate-800 rounded-3xl text-white shadow-xl flex flex-col justify-between">
        <div className="space-y-4">
          <div>
            <h3 className="font-extrabold text-sm tracking-tight text-slate-100 flex items-center gap-1.5">
              Secure Safety Shield
              <span className="inline-block py-0.5 px-2 text-[9px] uppercase bg-blue-500/20 text-blue-300 font-black rounded-full">Secured</span>
            </h3>
            <p className="text-[10px] text-slate-400">Auditing verified account authentication parameters</p>
          </div>

          {/* User display session details */}
          <div className="bg-slate-950 border border-slate-850 rounded-2xl p-4 space-y-3.5 text-xs">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-900">
              <UserCheck className="w-4 h-4 text-emerald-400" />
              <span className="font-bold text-slate-300">Identity Verified</span>
            </div>

            <div>
              <p className="text-[9px] text-slate-500 uppercase tracking-widest font-black">Authorized Email</p>
              <p className="text-slate-200 mt-0.5 truncate font-semibold">{currentUser?.email || 'guest-user@guardianx.io'}</p>
            </div>

            <div>
              <p className="text-[9px] text-slate-500 uppercase tracking-widest font-black">Authentication Engine</p>
              <p className="text-slate-200 mt-0.5 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                {isFirebasePlaceholder ? 'Sandbox Local Shield' : 'Firebase Authenticated'}
              </p>
            </div>

            <div>
              <p className="text-[9px] text-slate-500 uppercase tracking-widest font-black">Distress Key UID</p>
              <p className="text-[10px] text-slate-400 mt-0.5 font-mono truncate bg-slate-900 p-1 px-2 border border-slate-950 rounded-lg">
                {currentUser?.uid || 'guest_sandbox_8e3d0fa'}
              </p>
            </div>
          </div>
        </div>

        {/* Log out option */}
        {onLogOut && (
          <button
            onClick={onLogOut}
            className="w-full py-3 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-850 hover:border-slate-700 text-rose-400 hover:text-white font-bold text-xs uppercase transition-all flex items-center justify-center gap-2 cursor-pointer mt-6"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out Session
          </button>
        )}
      </div>

    </div>
  );
}
