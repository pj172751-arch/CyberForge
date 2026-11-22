import React, { useState } from 'react';
import FallingPhysics from './components/FallingPhysics';
import { ChevronDown, Eye, EyeOff, X, Shield, Swords } from 'lucide-react';

export default function App() {
  const [isSignUp, setIsSignUp] = useState(true);
  const [fullName, setFullName] = useState('Amélie Laurent');
  const [email, setEmail] = useState('amelielaurent7622@gmail.com');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState('attacker'); // 'attacker' | 'defender'
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

  return (
    <div className="min-h-screen w-screen bg-[#1c1d22] flex items-center justify-center p-4 sm:p-6 md:p-10 font-sans selection:bg-amber-400/30 selection:text-amber-200">
      {/* Outer Modal Container (Replicating the reference card layout) */}
      <div className="relative w-full max-w-[1040px] min-h-[660px] md:h-[660px] bg-[#f5f5f7] rounded-[32px] shadow-2xl overflow-hidden flex flex-col md:flex-row border border-white/20">
        
        {/* Close Button at top-right (like reference image) */}
        <button
          type="button"
          className="absolute top-5 right-5 z-40 w-8 h-8 rounded-full bg-white/60 hover:bg-white text-zinc-600 hover:text-black flex items-center justify-center transition-colors shadow-sm backdrop-blur-sm"
          title="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* LEFT COLUMN: Login / Sign Up Form */}
        <div className="w-full md:w-[48%] p-8 sm:p-10 md:p-12 flex flex-col justify-between bg-gradient-to-b from-[#f9f9fb] via-[#f7f6f2] to-[#f4edd9]/50 relative z-10 overflow-y-auto">
          {/* Top Brand Pill */}
          <div>
            <div className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white/90 border border-zinc-200/80 shadow-sm text-xs font-semibold text-zinc-700 tracking-wide mb-6">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span>CyberForge</span>
            </div>

            {/* Title & Subtitle */}
            <div className="space-y-1 mb-6">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900">
                {isSignUp ? 'Create an account' : 'Welcome back'}
              </h1>
              <p className="text-xs text-zinc-500 font-medium">
                {isSignUp
                  ? 'Sign up and get 30 day free trial'
                  : 'Log in to access your cyber training range'}
              </p>
            </div>

            {/* The Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {/* Full Name (Sign up only) */}
              {isSignUp && (
                <div>
                  <label className="block text-[11px] font-medium text-zinc-500 mb-1 ml-1">
                    Full name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    placeholder="Enter your name"
                    className="w-full h-11 px-4 text-xs font-medium text-zinc-800 bg-white/90 border border-zinc-200/90 rounded-2xl focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 shadow-sm transition-all"
                  />
                </div>
              )}

              {/* Email */}
              <div>
                <label className="block text-[11px] font-medium text-zinc-500 mb-1 ml-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="name@example.com"
                  className="w-full h-11 px-4 text-xs font-medium text-zinc-800 bg-white/90 border border-zinc-200/90 rounded-2xl focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 shadow-sm transition-all"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-[11px] font-medium text-zinc-500 mb-1 ml-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="••••••••••••"
                    className="w-full h-11 px-4 pr-10 text-xs font-medium text-zinc-800 bg-white/90 border border-zinc-200/90 rounded-2xl focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 shadow-sm transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Role Dropdown: Attacker & Defender (Strictly per user instruction) */}
              <div>
                <label className="block text-[11px] font-medium text-zinc-500 mb-1 ml-1">
                  Designated Role
                </label>
                <div className="relative">
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full h-11 pl-4 pr-10 text-xs font-semibold text-zinc-800 bg-white/90 border border-zinc-200/90 rounded-2xl focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-amber-400 shadow-sm appearance-none cursor-pointer transition-all"
                  >
                    <option value="attacker">Attacker (Red Team)</option>
                    <option value="defender">Defender (Blue Team)</option>
                  </select>
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-400 flex items-center gap-1">
                    {role === 'attacker' ? (
                      <span className="w-2 h-2 rounded-full bg-rose-500" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-sky-500" />
                    )}
                    <ChevronDown className="w-4 h-4 text-zinc-400" />
                  </div>
                </div>
              </div>

              {/* Submit Button (Amber/Gold matching reference image) */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full h-11 bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-zinc-900 font-semibold text-xs rounded-2xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  {submitted ? (
                    <span>Session Initialized ✓</span>
                  ) : (
                    <span>Submit</span>
                  )}
                </button>
              </div>

              {/* Social login buttons (Apple & Google as in reference picture) */}
              <div className="grid grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  className="h-10 px-3 bg-white/90 hover:bg-white border border-zinc-200/80 rounded-2xl text-[11px] font-medium text-zinc-700 flex items-center justify-center gap-2 shadow-sm transition-all"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 170 170">
                    <path fill="currentColor" d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.7-7.91-12-14.61-6.1-9.47-10.85-20.48-14.24-33.02-3.4-12.54-5.09-23.77-5.09-33.69 0-14.27 3.52-25.96 10.56-35.08 7.03-9.12 16.03-13.79 26.99-14.01 4.58 0 9.87 1.25 15.88 3.75 6 2.5 10.05 3.75 12.14 3.75 1.74 0 5.89-1.25 12.44-3.75 6.55-2.5 12.19-3.64 16.92-3.41 12.63.65 22.84 5.23 30.64 13.74-11.09 6.75-16.52 16.09-16.3 28.02.22 9.35 3.81 17.18 10.78 23.49 6.96 6.31 15.22 10.01 24.77 11.09-2.18 6.53-4.8 13.06-7.84 19.59zm-29.6-104.38c0 6.53-2.39 12.62-7.18 18.27-4.79 5.65-10.77 9.03-17.94 10.12-.22-.87-.33-1.85-.33-2.94 0-6.31 2.5-12.4 7.51-18.27 5.01-5.87 11.09-9.25 18.27-10.12.11 1.09.17 2.08.17 2.94z"/>
                  </svg>
                  <span>Apple</span>
                </button>

                <button
                  type="button"
                  className="h-10 px-3 bg-white/90 hover:bg-white border border-zinc-200/80 rounded-2xl text-[11px] font-medium text-zinc-700 flex items-center justify-center gap-2 shadow-sm transition-all"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                  </svg>
                  <span>Google</span>
                </button>
              </div>
            </form>
          </div>

          {/* Bottom Switcher: Already have account? Sign in */}
          <div className="pt-6 flex items-center justify-between text-[11px] text-zinc-500 border-t border-zinc-200/60 mt-4">
            <div>
              <span>{isSignUp ? 'Already have account? ' : "Don't have an account? "}</span>
              <button
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="font-semibold text-zinc-800 hover:text-amber-600 underline"
              >
                {isSignUp ? 'Sign in' : 'Sign up'}
              </button>
            </div>
            <a href="#terms" className="hover:underline text-zinc-400">
              Terms & Conditions
            </a>
          </div>
        </div>

        {/* RIGHT COLUMN: The Matter.js Falling Physics Playground (Replaces people in reference image) */}
        <div className="w-full md:w-[52%] h-[380px] md:h-full relative overflow-hidden bg-black flex flex-col justify-end">
          {/* Falling Physics Engine */}
          <FallingPhysics mode="both" />

          {/* Subtle Top-Left Info Tag inside Physics Stage */}
          <div className="absolute top-4 left-4 z-20 pointer-events-none flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-black/60 border border-white/10 text-[10px] font-mono text-zinc-400 backdrop-blur-md flex items-center gap-1.5 shadow-sm">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              <span>Attacker vs Defender • Interactive Physics</span>
            </span>
          </div>

          {/* Interactive Hint at the bottom */}
          <div className="absolute bottom-9 left-1/2 -translate-x-1/2 z-20 pointer-events-none text-center">
            <span className="text-[10px] font-mono text-zinc-500/80 bg-black/40 px-3 py-1 rounded-full border border-white/5 backdrop-blur-sm">
              Drag elements with mouse or touch
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
