import React, { useState } from 'react';
import { Shield, Mail, Lock, Sparkles, UserPlus, LogIn, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { auth, isFirebasePlaceholder } from '../lib/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInAnonymously } from 'firebase/auth';

interface AuthScreenProps {
  onAuthSuccess: (user: any) => void;
}

export default function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [isRegistering, setIsAdding] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [errorMsg, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setError(null);
    setLoading(true);

    try {
      if (isFirebasePlaceholder) {
        // Local sandbox auth mock
        console.warn("Operating in Local Persistence sandbox mode. Mocking authenticated user.");
        const mockUser = {
          uid: 'sandbox_user_jf9320e',
          email,
          displayName: isRegistering ? fullName : 'Jane Doe',
          emailVerified: true
        };
        onAuthSuccess(mockUser);
        return;
      }

      if (isRegistering) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        onAuthSuccess(userCredential.user);
      } else {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        onAuthSuccess(userCredential.user);
      }
    } catch (err: any) {
      console.error(err);
      let friendlyError = err.message || 'Authentication failed.';
      if (err.code === 'auth/invalid-credential') friendlyError = 'Invalid email or password credential.';
      if (err.code === 'auth/weak-password') friendlyError = 'Password should be at least 6 characters.';
      if (err.code === 'auth/email-already-in-use') friendlyError = 'Email address is already in use by another user.';
      setError(friendlyError);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoSignIn = () => {
    // Immediate bypass sign-in for preview testing
    const demoUser = {
      uid: 'jane_sandbox_911',
      email: 'verified-guardian@guardianx.io',
      displayName: 'Jane Doe',
      emailVerified: true
    };
    onAuthSuccess(demoUser);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden select-none">
      {/* Decorative Blur Spheres */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 rounded-full bg-rose-500/10 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 rounded-full bg-violet-600/10 blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md bg-slate-900 border border-slate-850 rounded-3xl p-6 md:p-8 text-white relative z-10 shadow-2xl animate-fade-in">
        
        {/* Branding header */}
        <div className="text-center mb-6">
          <div className="w-16 h-18 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-black text-slate-100 tracking-tighter">GuardianX</h1>
          <p className="text-slate-400 text-xs mt-1.5 leading-relaxed">
            Women Safety & Emergency Network Support. SOS sirens, live location sharing, and AI-led backup.
          </p>
        </div>

        {/* Local sandbox flag info */}
        {isFirebasePlaceholder && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400 font-medium rounded-2xl mb-5 text-center leading-tight">
            ⚠️ Standard Firebase is unconfigured. Working in Local Persistence Sandbox Mode. Feel free to use any dummy email.
          </div>
        )}

        {/* Forms box */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Email */}
          <div>
            <label className="text-[10px] text-slate-400 uppercase tracking-widest font-black block mb-1">Email Coordinates</label>
            <div className="flex items-center gap-2 bg-slate-950 px-3 py-2 border border-slate-850 rounded-xl focus-within:border-slate-700">
              <Mail className="w-4 h-4 text-slate-500 shrink-0" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane.doe@example.com"
                className="bg-transparent border-none outline-none text-xs text-slate-200 placeholder-slate-700 w-full"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="text-[10px] text-slate-400 uppercase tracking-widest font-black block mb-1">Pass-key</label>
            <div className="flex items-center gap-2 bg-slate-950 px-3 py-2 border border-slate-850 rounded-xl focus-within:border-slate-700">
              <Lock className="w-4 h-4 text-slate-500 shrink-0" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                className="bg-transparent border-none outline-none text-xs text-slate-200 placeholder-slate-700 w-full"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-slate-500 hover:text-slate-300 transition-all cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Error panel */}
          {errorMsg && (
            <p className="text-[11px] text-red-400 leading-tight bg-red-500/10 border border-red-500/20 py-2 px-3.5 rounded-xl text-center font-medium">
              {errorMsg}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3.5 rounded-2xl bg-rose-500 hover:bg-rose-600 text-slate-100 font-bold uppercase transition-all transform active:scale-95 shadow-glow cursor-pointer flex items-center justify-center gap-2 text-xs"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin text-white" />
            ) : isRegistering ? (
              <>
                <UserPlus className="w-4 h-4" />
                Register Safety Card
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                Sign In Shield
              </>
            )}
          </button>
        </form>

        {/* Change auth mode */}
        <div className="text-center mt-5 text-xs text-slate-500">
          {isRegistering ? 'Already hold an account?' : 'New in our network?'}
          <button
            onClick={() => setIsAdding(!isRegistering)}
            className="ml-1 font-bold text-rose-400 hover:underline cursor-pointer"
          >
            {isRegistering ? 'Sign In' : 'Create an Account'}
          </button>
        </div>

        {/* Demo separator */}
        <div className="relative flex py-5 items-center font-bold text-[9px] uppercase tracking-widest text-slate-600">
          <div className="flex-grow border-t border-slate-850"></div>
          <span className="flex-shrink mx-4">or</span>
          <div className="flex-grow border-t border-slate-850"></div>
        </div>

        {/* Fast Bypass button */}
        <button
          onClick={handleDemoSignIn}
          className="w-full py-3 rounded-2xl bg-slate-950 hover:bg-slate-800 border border-slate-850 hover:border-slate-700 text-slate-100 font-extrabold uppercase transition-all transform active:scale-95 flex items-center justify-center gap-2 text-xs cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-violet-400 animate-pulse" />
          Sandbox Demo Quick Access
        </button>

      </div>
    </div>
  );
}
