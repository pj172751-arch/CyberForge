import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  INITIAL_ADMIN,
  INITIAL_MODERATORS,
  INITIAL_ATTACKERS,
  INITIAL_DEFENDERS,
  INITIAL_CHALLENGES,
  INITIAL_ATTEMPTS,
  INITIAL_DEFENSES,
  INITIAL_ALERTS,
  getDifficultyPoints
} from '../data/mockData';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  // Current logged in actor: role can be 'attacker' | 'defender' | 'moderator' | 'admin'
  const [currentRole, setCurrentRole] = useState('attacker');
  const [currentUser, setCurrentUser] = useState(INITIAL_ATTACKERS[0]);

  // Database 8 tables stored in reactive state
  const [adminList] = useState(INITIAL_ADMIN);
  const [moderators, setModerators] = useState(INITIAL_MODERATORS);
  const [attackers, setAttackers] = useState(INITIAL_ATTACKERS);
  const [defenders, setDefenders] = useState(INITIAL_DEFENDERS);
  const [challenges, setChallenges] = useState(INITIAL_CHALLENGES);
  const [attempts, setAttempts] = useState(INITIAL_ATTEMPTS);
  const [defenses, setDefenses] = useState(INITIAL_DEFENSES);
  const [alerts, setAlerts] = useState(INITIAL_ALERTS);

  // Active toast/feedback notification
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'info') => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => setToast(null), 4000);
  };

  // Switch role or login
  const loginAs = (role, userRecord = null) => {
    setCurrentRole(role);
    if (userRecord) {
      setCurrentUser(userRecord);
      showToast(`Authenticated as [${role.toUpperCase()}]: ${userRecord.username}`, 'success');
      return;
    }
    // Default user per role
    switch (role) {
      case 'admin':
        setCurrentUser(adminList[0]);
        break;
      case 'moderator':
        setCurrentUser(moderators[0]);
        break;
      case 'defender':
        setCurrentUser(defenders[0]);
        break;
      case 'attacker':
      default:
        setCurrentUser(attackers[0]);
        break;
    }
    showToast(`Switched active actor session to ${role.toUpperCase()}`, 'info');
  };

  const logout = () => {
    setCurrentRole('login');
    setCurrentUser(null);
    showToast('Logged out of session', 'info');
  };

  // Submit an attempt on a challenge (Attacker workflow)
  const submitAttempt = (challengeId, payloadUsed) => {
    const ch = challenges.find(c => c.challenge_id === Number(challengeId));
    if (!ch) return null;

    const trimmed = (payloadUsed || '').trim();
    // Verification heuristic: Exploit succeeds if payload is not empty and matches common patterns or reference payload
    const isSuccess = trimmed.length > 2 && (
      trimmed.includes("'") || 
      trimmed.includes("<") || 
      trimmed.includes(";") || 
      trimmed.includes("../") || 
      trimmed.includes("127.0.0.1") ||
      trimmed.toLowerCase().includes("select") ||
      trimmed.toLowerCase().includes("admin") ||
      trimmed.includes(ch.reference_payload.substring(0, 4))
    );

    const scoreEarned = isSuccess ? getDifficultyPoints(ch.difficulty) : 0;
    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    const newAttempt = {
      attempt_id: Date.now(),
      attacker_id: currentUser?.attacker_id || 201,
      challenge_id: ch.challenge_id,
      payload_used: payloadUsed,
      status: isSuccess ? 'SUCCESS' : 'FAILED',
      timestamp: now,
      score_earned: scoreEarned
    };

    setAttempts(prev => [newAttempt, ...prev]);

    // If exploit was launched, log alert in alerts table
    if (isSuccess) {
      const newAlert = {
        alert_id: Date.now() + 1,
        challenge_id: ch.challenge_id,
        alert_type: 'PAYLOAD_PENETRATION',
        message: `High risk payload delivered on ${ch.dvwa_page_ref}: ${payloadUsed.substring(0, 32)}...`,
        timestamp: now
      };
      setAlerts(prev => [newAlert, ...prev]);
      showToast(`Challenge Breached! +${scoreEarned} points awarded.`, 'success');
    } else {
      showToast('Payload blocked or invalid. Status: FAILED', 'error');
    }

    return newAttempt;
  };

  // Raise security level and verify defense (Defender workflow)
  // Step 3 in core mechanic: replaying challenges.reference_payload against security_level_applied
  const updateDefenseAndVerify = (challengeId, newLevel) => {
    const ch = challenges.find(c => c.challenge_id === Number(challengeId));
    if (!ch) return;

    const now = new Date().toISOString().replace('T', ' ').substring(0, 19);

    // Defense logic: Replaying reference_payload against target security level
    // Low: Exploit penetrates -> Verified = false
    // Medium: Partial penetration -> Depends on challenge
    // High / Impossible: Exploit neutralized -> Verified = true
    let isVerified = false;
    let score = 0;

    if (newLevel === 'High' || newLevel === 'Impossible') {
      isVerified = true;
      score = getDifficultyPoints(ch.difficulty) / 2 + (newLevel === 'Impossible' ? 300 : 150);
    } else if (newLevel === 'Medium') {
      // 50% verification rate
      isVerified = ch.difficulty === 'Low';
      score = isVerified ? 100 : 0;
    } else {
      isVerified = false;
      score = 0;
    }

    const newDefense = {
      defense_id: Date.now(),
      defender_id: currentUser?.defender_id || 301,
      challenge_id: ch.challenge_id,
      security_level_applied: newLevel,
      verified: isVerified,
      timestamp: now,
      score_earned: score
    };

    setDefenses(prev => {
      const filtered = prev.filter(d => d.challenge_id !== ch.challenge_id);
      return [newDefense, ...filtered];
    });

    if (isVerified) {
      showToast(`Replay verification PASSED. ${ch.title} secured at ${newLevel} level (+${score} pts)`, 'success');
    } else {
      showToast(`Replay verification FAILED. Exploit penetrated at ${newLevel} security level`, 'error');
    }

    return newDefense;
  };

  // Admin provisioning new Moderator
  const addModerator = (username, email) => {
    const newMod = {
      moderator_id: Date.now() % 10000,
      admin_id: currentUser?.admin_id || 1,
      username,
      email,
      password: "$2b$12$newhash...[bcrypt]",
      created_at: new Date().toISOString().replace('T', ' ').substring(0, 19)
    };
    setModerators(prev => [...prev, newMod]);
    showToast(`Moderator account created: ${username}`, 'success');
  };

  // Edit current actor's profile
  const updateProfile = (newUsername, newEmail) => {
    if (!currentUser) return;
    const updated = { ...currentUser, username: newUsername, email: newEmail };
    setCurrentUser(updated);

    if (currentRole === 'attacker') {
      setAttackers(prev => prev.map(a => a.attacker_id === updated.attacker_id ? updated : a));
    } else if (currentRole === 'defender') {
      setDefenders(prev => prev.map(d => d.defender_id === updated.defender_id ? updated : d));
    } else if (currentRole === 'moderator') {
      setModerators(prev => prev.map(m => m.moderator_id === updated.moderator_id ? updated : m));
    }
    showToast('Profile credentials updated successfully', 'success');
  };

  return (
    <AppContext.Provider
      value={{
        currentRole,
        currentUser,
        loginAs,
        logout,
        adminList,
        moderators,
        attackers,
        defenders,
        challenges,
        attempts,
        defenses,
        alerts,
        submitAttempt,
        updateDefenseAndVerify,
        addModerator,
        updateProfile,
        toast,
        showToast
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
