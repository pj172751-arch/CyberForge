import React, { useState } from 'react';
import FallingPhysics from './components/FallingPhysics';
import RoleLandingPage from './components/RoleLandingPage';
import AdminConsole from './components/console/AdminConsole';
import ModeratorConsole from './components/console/ModeratorConsole';
import AttackerConsole from './components/console/AttackerConsole';
import DefenderConsole from './components/console/DefenderConsole';
import { CaretDown, Eye, EyeSlash, WarningCircle } from '@phosphor-icons/react';
import {
  registerUser,
  loginUser,
  getCurrentUser,
  clearCurrentUser
} from './utils/authStorage';

function viewForRole(userRole) {
  if (userRole === 'admin') return 'admin';
  if (userRole === 'moderator') return 'moderator';
  return 'landing';
}

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser());
  const [currentView, setCurrentView] = useState(() =>
    currentUser ? viewForRole(currentUser.role) : 'auth'
  ); // 'auth' | 'landing' | 'console' | 'admin' | 'moderator'
  const [isSignUp, setIsSignUp] = useState(true);
  const [fullName, setFullName] = useState(() => currentUser?.username || '');
  const [email, setEmail] = useState(() => currentUser?.email || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState('attacker'); // Sign-up role selector: 'attacker' | 'defender'
  const [authError, setAuthError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;
    setAuthError('');
    setIsSubmitting(true);

    try {
      const signupRole = role === 'defender' ? 'defender' : 'attacker';
      const res = isSignUp
        ? await registerUser({ fullName, email, password, role: signupRole })
        : await loginUser({ email, password });

      if (!res.success) {
        setAuthError(res.error);
        return;
      }

      const user = res.user;
      setCurrentUser(user);
      setEmail(user.email);
      setFullName(user.username || '');
      setPassword('');
      setCurrentView(viewForRole(user.role));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = () => {
    clearCurrentUser();
    setCurrentUser(null);
    setCurrentView('auth');
    setAuthError('');
    setFullName('');
    setEmail('');
    setPassword('');
    setRole('attacker');
  };

  const handleToggleMode = () => {
    setIsSignUp((prev) => !prev);
    setAuthError('');
    setFullName('');
    setEmail('');
    setPassword('');
    setRole('attacker');
  };

  // If in admin console
  if (currentView === 'admin' && currentUser) {
    return (
      <AdminConsole
        user={currentUser}
        onSignOut={handleLogout}
      />
    );
  }

  // If in moderator console
  if (currentView === 'moderator' && currentUser) {
    return (
      <ModeratorConsole
        user={currentUser}
        onSignOut={handleLogout}
      />
    );
  }

  // If in role landing page view (with scroll explosion and sticky task grid)
  if (currentView === 'landing' && currentUser) {
    return (
      <RoleLandingPage
        role={currentUser.role || role}
        email={currentUser.email || email}
        onSignOut={handleLogout}
        onNavigateToTasks={() => setCurrentView('console')}
      />
    );
  }

  // If in trainee console view (Attacker or Defender)
  if ((currentView === 'console' || currentView === 'tasks') && currentUser) {
    if (currentUser.role === 'defender') {
      return (
        <DefenderConsole
          user={currentUser}
          onSignOut={handleLogout}
          onOpenOverview={() => setCurrentView('landing')}
        />
      );
    }
    return (
      <AttackerConsole
        user={currentUser}
        onSignOut={handleLogout}
        onOpenOverview={() => setCurrentView('landing')}
      />
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#070709] flex items-center justify-center p-3 sm:p-6 md:p-8 font-sans selection:bg-[#2ab7ff]/30 selection:text-[#dbf5ff]">
      {/* Big Modal Container (Matching color with right half physics) */}
      <div className="relative w-[95vw] max-w-[1400px] h-[88vh] min-h-[700px] bg-[#0c0d12] rounded-[28px] shadow-[0_0_80px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col md:flex-row border border-[#1e202c]">
        {/* LEFT COLUMN: Login / Sign Up Form */}
        <div className="w-full md:w-[45%] lg:w-[42%] p-8 sm:p-10 md:p-12 lg:p-14 flex flex-col justify-between bg-gradient-to-b from-[#0e1017] via-[#0c0d12] to-[#090a0f] relative z-10 overflow-y-auto border-r border-[#181a24]">
          <div>
            {/* Top Brand Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#141620] border border-[#222536] shadow-inner text-xs font-semibold text-zinc-300 tracking-wider mb-6">
              <span className="w-2 h-2 rounded-full bg-[#2ab7ff] shadow-[0_0_8px_#2ab7ff]" />
              <span className="uppercase text-[11px] font-mono">CyberForge</span>
            </div>

            {/* Title & Subtitle */}
            <div className="space-y-1.5 mb-5">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white">
                {isSignUp ? 'Create an account' : 'Welcome back'}
              </h1>
              <p className="text-xs sm:text-sm text-zinc-400 font-normal">
                {isSignUp
                  ? 'Sign up to access the cyber training platform'
                  : 'Log in with your operator credentials'}
              </p>
            </div>

            {/* Auth Error Banner */}
            {authError && (
              <div className="mb-4 p-3 rounded-xl bg-red-950/70 border border-red-500/50 text-red-200 text-xs font-mono flex items-start gap-2 shadow-[0_0_20px_rgba(239,68,68,0.2)]">
                <WarningCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" weight="bold" />
                <span>{authError}</span>
              </div>
            )}

            {/* The Form with strict browser autofill blocking */}
            <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4">
              {/* Browser autofill traps */}
              <input
                type="text"
                name="fakeusernameremembered"
                style={{ display: 'none' }}
                tabIndex={-1}
                autoComplete="off"
              />
              <input
                type="password"
                name="fakepasswordremembered"
                style={{ display: 'none' }}
                tabIndex={-1}
                autoComplete="off"
              />

              {/* Full Name (Sign up only) */}
              {isSignUp && (
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5 ml-1">
                    Full name
                  </label>
                  <input
                    type="text"
                    name="cf_full_name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    placeholder="Enter your name"
                    autoComplete="off"
                    className="w-full h-12 px-4 text-xs sm:text-sm font-medium text-zinc-100 bg-[#141622] border border-[#232638] rounded-xl focus:outline-none focus:border-[#2ab7ff] focus:ring-1 focus:ring-[#2ab7ff] transition-all placeholder:text-zinc-600"
                  />
                </div>
              )}

              {/* Email / Username */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5 ml-1">
                  {isSignUp ? 'Email' : 'Username or Email'}
                </label>
                <input
                  type={isSignUp ? 'email' : 'text'}
                  name="cf_user_email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder={isSignUp ? 'name@example.com' : 'username or name@example.com'}
                  autoComplete="new-password"
                  className="w-full h-12 px-4 text-xs sm:text-sm font-medium text-zinc-100 bg-[#141622] border border-[#232638] rounded-xl focus:outline-none focus:border-[#2ab7ff] focus:ring-1 focus:ring-[#2ab7ff] transition-all placeholder:text-zinc-600"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1.5 ml-1">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="cf_user_password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={isSignUp ? 8 : undefined}
                    placeholder="••••••••••••"
                    autoComplete="new-password"
                    className="w-full h-12 px-4 pr-11 text-xs sm:text-sm font-medium text-zinc-100 bg-[#141622] border border-[#232638] rounded-xl focus:outline-none focus:border-[#2ab7ff] focus:ring-1 focus:ring-[#2ab7ff] transition-all placeholder:text-zinc-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    {showPassword ? <EyeSlash className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Role Dropdown: ONLY IN SIGN UP */}
              {isSignUp && (
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1.5 ml-1">
                    Designated Role
                  </label>
                  <div className="relative">
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full h-12 pl-4 pr-11 text-xs sm:text-sm font-semibold text-zinc-100 bg-[#141622] border border-[#232638] rounded-xl focus:outline-none focus:border-[#2ab7ff] focus:ring-1 focus:ring-[#2ab7ff] appearance-none cursor-pointer transition-all"
                    >
                      <option value="attacker" className="bg-[#141622] text-zinc-100">
                        Attacker
                      </option>
                      <option value="defender" className="bg-[#141622] text-zinc-100">
                        Defender
                      </option>
                    </select>
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none flex items-center gap-1.5">
                      {role === 'attacker' && (
                        <span className="w-2.5 h-2.5 rounded-full bg-[#ff2a3d] shadow-[0_0_8px_#ff2a3d]" />
                      )}
                      {role === 'defender' && (
                        <span className="w-2.5 h-2.5 rounded-full bg-[#2ab7ff] shadow-[0_0_8px_#2ab7ff]" />
                      )}
                      <CaretDown className="w-4 h-4 text-zinc-400" />
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-12 bg-gradient-to-r from-[#2ab7ff] to-[#1c98db] hover:from-[#3bc0ff] hover:to-[#2ab7ff] active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed text-[#001026] font-bold text-xs sm:text-sm rounded-xl shadow-[0_0_24px_rgba(42,183,255,0.35)] hover:shadow-[0_0_30px_rgba(42,183,255,0.5)] transition-all flex items-center justify-center tracking-wide"
                >
                  <span>
                    {isSubmitting
                      ? (isSignUp ? 'Creating account...' : 'Signing in...')
                      : (isSignUp ? 'Sign Up' : 'Log In')}
                  </span>
                </button>
              </div>
            </form>
          </div>

          {/* Bottom Switcher: Clean toggle between Sign Up and Log In */}
          <div className="pt-6 flex items-center justify-between text-xs text-zinc-400 border-t border-[#181a24] mt-6">
            <div>
              {isSignUp ? (
                <>
                  <span>Already have an account? </span>
                  <button
                    type="button"
                    onClick={handleToggleMode}
                    className="font-semibold text-[#2ab7ff] hover:text-[#7ad6ff] hover:underline transition-colors"
                  >
                    Log in
                  </button>
                </>
              ) : (
                <>
                  <span>Don't have an account? </span>
                  <button
                    type="button"
                    onClick={handleToggleMode}
                    className="font-semibold text-[#2ab7ff] hover:text-[#7ad6ff] hover:underline transition-colors"
                  >
                    Sign up
                  </button>
                </>
              )}
            </div>
            <a href="#terms" className="hover:underline text-zinc-500 hover:text-zinc-400 transition-colors">
              Terms & Conditions
            </a>
          </div>
        </div>

        {/* RIGHT COLUMN: The Matter.js Falling Physics Playground */}
        <div className="w-full md:w-[55%] lg:w-[58%] h-[380px] md:h-full relative overflow-hidden bg-black flex flex-col justify-end">
          <FallingPhysics mode="both" />
        </div>
      </div>
    </div>
  );
}
