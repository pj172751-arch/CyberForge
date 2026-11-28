import React, { useCallback, useEffect, useState } from 'react';
import FallingPhysics from './components/FallingPhysics';
import RoleLandingPage from './components/RoleLandingPage';
import AdminConsole from './components/console/AdminConsole';
import ModeratorConsole from './components/console/ModeratorConsole';
import AttackerConsole from './components/console/AttackerConsole';
import DefenderConsole from './components/console/DefenderConsole';
import { Button, Modal } from './components/ui/primitives';
import {
  Crosshair,
  Eye,
  EyeSlash,
  ShieldCheck,
  WarningCircle,
} from '@phosphor-icons/react';
import { setUnauthorizedHandler } from './utils/api';
import {
  clearCurrentUser,
  fetchSessionUser,
  loginUser,
  logoutUser,
  registerUser,
} from './utils/authStorage';

const ENTERED_CONSOLE_KEY = 'cyberforge_entered_console';

function hasEnteredConsoleFlag() {
  try {
    return window.sessionStorage?.getItem(ENTERED_CONSOLE_KEY) === '1';
  } catch {
    return false;
  }
}

function setEnteredConsoleFlag() {
  try {
    window.sessionStorage?.setItem(ENTERED_CONSOLE_KEY, '1');
  } catch {
    // Ignore storage restriction
  }
}

function clearEnteredConsoleFlag() {
  try {
    window.sessionStorage?.removeItem(ENTERED_CONSOLE_KEY);
  } catch {
    // Ignore storage restriction
  }
}

function viewForHydratedRole(userRole) {
  if (userRole === 'admin') return 'admin';
  if (userRole === 'moderator') return 'moderator';
  return hasEnteredConsoleFlag() ? 'console' : 'landing';
}

function viewForFreshLoginRole(userRole) {
  if (userRole === 'admin') return 'admin';
  if (userRole === 'moderator') return 'moderator';
  clearEnteredConsoleFlag();
  return 'landing';
}

function CyberForgeAuthMark() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="shrink-0"
    >
      <polygon
        points="14,2 25,8.25 25,19.75 14,26 3,19.75 3,8.25"
        stroke="#111317"
        strokeWidth="1.75"
        fill="#FAF8F3"
      />
      <polygon
        points="14,6 21,10 21,18 14,22 7,18 7,10"
        stroke="#111317"
        strokeWidth="1.25"
        fill="none"
      />
      <path d="M14 10L17.5 12V16L14 18L10.5 16V12L14 10Z" fill="#111317" />
    </svg>
  );
}

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [currentView, setCurrentView] = useState('auth'); // 'auth' | 'landing' | 'console' | 'admin' | 'moderator'
  const [initialChallengeId, setInitialChallengeId] = useState(null);
  const [isSignUp, setIsSignUp] = useState(true);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState('attacker'); // Sign-up role selector: 'attacker' | 'defender'
  const [authError, setAuthError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showEthicsModal, setShowEthicsModal] = useState(false);

  useEffect(() => {
    let mounted = true;
    setUnauthorizedHandler(() => {
      if (!mounted) return;
      clearEnteredConsoleFlag();
      setInitialChallengeId(null);
      setCurrentUser(null);
      setCurrentView('auth');
      setPassword('');
    });

    fetchSessionUser()
      .then((user) => {
        if (!mounted) return;
        setCurrentUser(user);
        if (!user) {
          clearEnteredConsoleFlag();
          setCurrentView('auth');
          return;
        }
        setCurrentView(viewForHydratedRole(user.role));
        setFullName(user.username || '');
        setEmail(user.email || '');
      })
      .finally(() => {
        if (mounted) {
          setIsCheckingSession(false);
        }
      });

    return () => {
      mounted = false;
      setUnauthorizedHandler(null);
    };
  }, []);

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
      setInitialChallengeId(null);
      setCurrentView(viewForFreshLoginRole(user.role));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async (options) => {
    clearEnteredConsoleFlag();
    setInitialChallengeId(null);
    if (options?.skipServerLogout === true) {
      clearCurrentUser();
    } else {
      await logoutUser();
    }
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

  const handleEnterConsole = useCallback((challenge = null) => {
    setEnteredConsoleFlag();
    setInitialChallengeId(challenge?.challenge_id ?? null);
    setCurrentView('console');
  }, []);

  const handleOpenOverview = useCallback(() => {
    clearEnteredConsoleFlag();
    setInitialChallengeId(null);
    setCurrentView('landing');
  }, []);

  const handleConsumeInitialChallenge = useCallback(() => {
    setInitialChallengeId(null);
  }, []);

  if (isCheckingSession) {
    return (
      <div className="min-h-[100dvh] w-full bg-[#F3EFE6] text-[#111317] flex items-center justify-center p-6 font-sans">
        <div className="flex flex-col items-center gap-3 px-6 py-5 rounded-lg bg-[#FAF8F3] border border-[#111317]/15">
          <div className="inline-flex items-center gap-2.5 text-sm font-bold tracking-[0.12em] uppercase text-[#111317]">
            <CyberForgeAuthMark />
            <span>CyberForge</span>
          </div>
          <div className="inline-flex items-center gap-2 text-sm font-mono text-[#4B5260]">
            <span className="w-2 h-2 rounded-full bg-[#1D4ED8] animate-pulse" />
            <span>Verifying active session...</span>
          </div>
        </div>
      </div>
    );
  }

  if (currentView === 'admin' && currentUser) {
    return (
      <AdminConsole
        user={currentUser}
        onSignOut={handleLogout}
      />
    );
  }

  if (currentView === 'moderator' && currentUser) {
    return (
      <ModeratorConsole
        user={currentUser}
        onSignOut={handleLogout}
      />
    );
  }

  if (currentView === 'landing' && currentUser) {
    return (
      <RoleLandingPage
        user={currentUser}
        role={currentUser.role || role}
        email={currentUser.email || email}
        onSignOut={handleLogout}
        onNavigateToTasks={() => handleEnterConsole(null)}
        onSelectChallenge={(challenge) => handleEnterConsole(challenge)}
      />
    );
  }

  if ((currentView === 'console' || currentView === 'tasks') && currentUser) {
    if (currentUser.role === 'defender') {
      return (
        <DefenderConsole
          user={currentUser}
          onSignOut={handleLogout}
          onOpenOverview={handleOpenOverview}
          initialChallengeId={initialChallengeId}
          onConsumeInitialChallenge={handleConsumeInitialChallenge}
        />
      );
    }
    return (
      <AttackerConsole
        user={currentUser}
        onSignOut={handleLogout}
        onOpenOverview={handleOpenOverview}
        initialChallengeId={initialChallengeId}
        onConsumeInitialChallenge={handleConsumeInitialChallenge}
      />
    );
  }

  const isAttackerRole = role === 'attacker';

  return (
    <div className="min-h-[100dvh] lg:h-[100dvh] lg:overflow-hidden w-full bg-[#F3EFE6] text-[#111317] flex flex-col lg:flex-row font-sans selection:bg-[#1D4ED8]/15 selection:text-[#111317]">
      {/* LEFT 45% COLUMN: Warm Archival Vellum Operator Dossier */}
      <section className="w-full lg:w-[45%] lg:h-full bg-[#F3EFE6] flex flex-col justify-between px-6 sm:px-10 lg:px-12 py-5 lg:py-6 lg:overflow-y-auto">
        {/* Top Archival Brand Bar */}
        <header className="flex items-center justify-between gap-3 pb-4 border-b border-[#111317]/15 shrink-0">
          <div className="inline-flex items-center gap-2.5">
            <CyberForgeAuthMark />
            <span className="text-sm font-bold tracking-[0.12em] uppercase text-[#111317]">
              CyberForge
            </span>
          </div>
          <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded bg-[#FAF8F3] border border-[#111317]/15 text-xs font-mono font-medium text-[#111317]">
            <span className="w-2 h-2 rounded-full bg-[#047857]" />
            <span>DVWA Target :8081</span>
          </span>
        </header>

        {/* Center Dossier Form */}
        <main className="my-auto py-4 space-y-4">
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-[34px] font-bold tracking-tight text-[#111317] leading-[1.1] text-balance">
              {isSignUp ? 'Enter the Cyber Range' : 'Resume Range Session'}
            </h1>
            <p className="text-[15px] text-[#1C1F26] leading-relaxed text-pretty">
              Train on live vulnerable PHP targets, inspect real HTTP wire traffic, and verify patches in real time.
            </p>
          </div>

          {/* 3-Signal Proof Bar */}
          <div className="bg-[#FAF8F3] border border-[#111317]/15 rounded-md px-3.5 py-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px] font-semibold text-[#111317]">
            <span>14 Live PHP Modules</span>
            <span className="text-[#4B5260]" aria-hidden="true">·</span>
            <span>4 OWASP Tracks</span>
            <span className="text-[#4B5260]" aria-hidden="true">·</span>
            <span>Real HTTP Wire Traces</span>
          </div>

          {authError && (
            <div
              role="alert"
              className="p-3 rounded-md bg-[#C81E1E]/10 border border-[#C81E1E]/35 text-[#991B1B] text-sm font-medium flex items-start gap-2.5"
            >
              <WarningCircle className="w-4 h-4 text-[#C81E1E] shrink-0 mt-0.5" weight="bold" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} autoComplete="off" className="space-y-3.5">
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

            {isSignUp ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="cf-full-name"
                    className="block text-[14px] font-semibold text-[#111317] mb-1.5"
                  >
                    Operator Name
                  </label>
                  <input
                    id="cf-full-name"
                    type="text"
                    name="cf_full_name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    minLength={2}
                    maxLength={50}
                    placeholder="e.g. Alex Rivera"
                    autoComplete="off"
                    className="w-full h-11 px-3.5 text-[15px] text-[#111317] bg-[#FAF8F3] border border-[#111317]/25 rounded-md focus:outline-none focus:border-[#111317] focus:ring-1 focus:ring-[#111317] transition-colors placeholder:text-[#4B5260]"
                  />
                </div>

                <div>
                  <label
                    htmlFor="cf-user-email"
                    className="block text-[14px] font-semibold text-[#111317] mb-1.5"
                  >
                    Email
                  </label>
                  <input
                    id="cf-user-email"
                    type="email"
                    name="cf_user_email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="operator@cyberforge.local"
                    autoComplete="new-password"
                    className="w-full h-11 px-3.5 text-[15px] text-[#111317] bg-[#FAF8F3] border border-[#111317]/25 rounded-md focus:outline-none focus:border-[#111317] focus:ring-1 focus:ring-[#111317] transition-colors placeholder:text-[#4B5260]"
                  />
                </div>
              </div>
            ) : (
              <div>
                <label
                  htmlFor="cf-user-email"
                  className="block text-[14px] font-semibold text-[#111317] mb-1.5"
                >
                  Username or Email
                </label>
                <input
                  id="cf-user-email"
                  type="text"
                  name="cf_user_email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="username or operator@cyberforge.local"
                  autoComplete="new-password"
                  className="w-full h-11 px-3.5 text-[15px] text-[#111317] bg-[#FAF8F3] border border-[#111317]/25 rounded-md focus:outline-none focus:border-[#111317] focus:ring-1 focus:ring-[#111317] transition-colors placeholder:text-[#4B5260]"
                />
              </div>
            )}

            <div>
              <label
                htmlFor="cf-user-password"
                className="block text-[14px] font-semibold text-[#111317] mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="cf-user-password"
                  type={showPassword ? 'text' : 'password'}
                  name="cf_user_password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={isSignUp ? 10 : undefined}
                  maxLength={isSignUp ? 72 : 256}
                  placeholder="Enter passphrase"
                  autoComplete="new-password"
                  className="w-full h-11 px-3.5 pr-11 text-[15px] text-[#111317] bg-[#FAF8F3] border border-[#111317]/25 rounded-md focus:outline-none focus:border-[#111317] focus:ring-1 focus:ring-[#111317] transition-colors placeholder:text-[#4B5260]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 rounded text-[#4B5260] hover:text-[#111317] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111317] transition-colors"
                >
                  {showPassword ? <EyeSlash className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {isSignUp && (
                <p className="mt-1 text-[13px] text-[#4B5260]">
                  Use 10–72 characters with letters and numbers or symbols.
                </p>
              )}
            </div>

            {isSignUp && (
              <div>
                <span
                  id="cf-role-label"
                  className="block text-[14px] font-semibold text-[#111317] mb-1.5"
                >
                  Select Training Role
                </span>
                <div
                  role="radiogroup"
                  aria-labelledby="cf-role-label"
                  className="grid grid-cols-2 gap-3"
                >
                  <button
                    type="button"
                    role="radio"
                    aria-checked={isAttackerRole}
                    onClick={() => setRole('attacker')}
                    className={[
                      'p-3 rounded-md border text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C81E1E]',
                      isAttackerRole
                        ? 'bg-[#FAF8F3] border-[#C81E1E] ring-1 ring-[#C81E1E]'
                        : 'bg-[#EAE4D7]/60 border-[#111317]/15 hover:border-[#111317]/35',
                    ].join(' ')}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="inline-flex items-center gap-1.5 text-[14px] font-bold text-[#111317]">
                        <Crosshair
                          className={['w-4 h-4', isAttackerRole ? 'text-[#C81E1E]' : 'text-[#4B5260]'].join(' ')}
                          weight="bold"
                        />
                        Attacker
                      </span>
                      <span
                        className={[
                          'w-2.5 h-2.5 rounded-full border',
                          isAttackerRole
                            ? 'bg-[#C81E1E] border-[#C81E1E]'
                            : 'border-[#111317]/30 bg-transparent',
                        ].join(' ')}
                      />
                    </div>
                    <p className="text-[13px] text-[#4B5260] leading-snug">
                      Exploit sinks, capture live proofs.
                    </p>
                  </button>

                  <button
                    type="button"
                    role="radio"
                    aria-checked={!isAttackerRole}
                    onClick={() => setRole('defender')}
                    className={[
                      'p-3 rounded-md border text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D4ED8]',
                      !isAttackerRole
                        ? 'bg-[#FAF8F3] border-[#1D4ED8] ring-1 ring-[#1D4ED8]'
                        : 'bg-[#EAE4D7]/60 border-[#111317]/15 hover:border-[#111317]/35',
                    ].join(' ')}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="inline-flex items-center gap-1.5 text-[14px] font-bold text-[#111317]">
                        <ShieldCheck
                          className={['w-4 h-4', !isAttackerRole ? 'text-[#1D4ED8]' : 'text-[#4B5260]'].join(' ')}
                          weight="bold"
                        />
                        Defender
                      </span>
                      <span
                        className={[
                          'w-2.5 h-2.5 rounded-full border',
                          !isAttackerRole
                            ? 'bg-[#1D4ED8] border-[#1D4ED8]'
                            : 'border-[#111317]/30 bg-transparent',
                        ].join(' ')}
                      />
                    </div>
                    <p className="text-[13px] text-[#4B5260] leading-snug">
                      Patch PHP, block live replays.
                    </p>
                  </button>
                </div>
              </div>
            )}

            <div className="pt-1">
              <button
                type="submit"
                disabled={isSubmitting}
                className={[
                  'w-full h-11 rounded-md font-semibold text-[15px] text-[#FAF8F3] transition-colors active:scale-[0.99]',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111317] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F3EFE6]',
                  'disabled:opacity-60 disabled:cursor-not-allowed',
                  isSignUp
                    ? isAttackerRole
                      ? 'bg-[#C81E1E] hover:bg-[#A61717]'
                      : 'bg-[#1D4ED8] hover:bg-[#1740B5]'
                    : 'bg-[#111317] hover:bg-[#1C1F26]',
                ].join(' ')}
              >
                {isSubmitting
                  ? isSignUp
                    ? 'Provisioning operator...'
                    : 'Verifying credentials...'
                  : isSignUp
                    ? isAttackerRole
                      ? 'Enter Range as Attacker'
                      : 'Enter Range as Defender'
                    : 'Sign In to CyberForge'}
              </button>
            </div>
          </form>
        </main>

        {/* Bottom Switcher & Real Scope Modal Trigger */}
        <footer className="pt-3 border-t border-[#111317]/15 flex flex-wrap items-center justify-between gap-2 text-sm text-[#4B5260] shrink-0">
          <div>
            {isSignUp ? (
              <>
                <span>Already registered? </span>
                <button
                  type="button"
                  onClick={handleToggleMode}
                  className="font-semibold text-[#111317] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111317] rounded"
                >
                  Log in
                </button>
              </>
            ) : (
              <>
                <span>New operator? </span>
                <button
                  type="button"
                  onClick={handleToggleMode}
                  className="font-semibold text-[#111317] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111317] rounded"
                >
                  Create account
                </button>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={() => setShowEthicsModal(true)}
            className="text-sm font-medium text-[#4B5260] hover:text-[#111317] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111317] rounded"
          >
            Training Scope & Ethics
          </button>
        </footer>
      </section>

      {/* RIGHT 55% COLUMN: Iconic Matter.js Physics Stage */}
      <section
        aria-label="Interactive security primitives playground"
        className="w-full lg:w-[55%] h-[340px] sm:h-[400px] lg:h-full relative overflow-hidden bg-black border-t lg:border-t-0 lg:border-l border-[#111317] flex flex-col justify-end"
      >
        <FallingPhysics mode="both" />
        <div className="pointer-events-none absolute top-4 right-4 z-20 px-3 py-1.5 rounded bg-black/75 border border-white/15 text-xs font-mono text-zinc-200">
          Interactive Physics Stage · Drag cards
        </div>
      </section>

      {/* Training Scope & Ethics Modal */}
      <Modal
        open={showEthicsModal}
        onClose={() => setShowEthicsModal(false)}
        title="Training Scope & Ethics"
        description="Authorized rules of engagement for the CyberForge sandbox."
        size="md"
        footer={
          <Button variant="primary" size="md" onClick={() => setShowEthicsModal(false)}>
            Acknowledge Scope
          </Button>
        }
      >
        <div className="space-y-4 text-[14px] text-[#1C1F26] leading-relaxed">
          <div className="p-3.5 rounded-md bg-[#F3EFE6] border border-[#111317]/15">
            <h3 className="text-[14px] font-bold text-[#111317] mb-1">
              1. Isolated Target Boundary
            </h3>
            <p>
              All exploitation payloads and defensive patches execute strictly against the local,
              sandboxed DVWA container (`127.0.0.1:8081`) on an isolated Docker network.
            </p>
          </div>
          <div className="p-3.5 rounded-md bg-[#F3EFE6] border border-[#111317]/15">
            <h3 className="text-[14px] font-bold text-[#111317] mb-1">
              2. Non-Destructive Conduct
            </h3>
            <p>
              Do not apply techniques learned here against external systems without explicit written
              authorization. Automated fuzzing or probing outside challenge endpoints triggers rate
              limits and security strikes.
            </p>
          </div>
          <div className="p-3.5 rounded-md bg-[#F3EFE6] border border-[#111317]/15">
            <h3 className="text-[14px] font-bold text-[#111317] mb-1">
              3. Telemetry & Academic Audit
            </h3>
            <p>
              Every exploit attempt, patch selection, and verification replay is recorded in
              PostgreSQL for progress tracking and instructor review.
            </p>
          </div>
        </div>
      </Modal>
    </div>
  );
}
