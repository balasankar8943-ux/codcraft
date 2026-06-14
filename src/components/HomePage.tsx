// src/components/HomePage.tsx
import React, { useEffect, useState } from 'react';
import { useAuth } from './AuthProvider';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import OnboardLevel from './OnboardLevel';
import QuestionBank from './QuestionBank';
import MNCSection from './MNCSection';
import Leaderboard from './Leaderboard';
import CertificateGenerator from './CertificateGenerator';
import questionsData from '../data/questions.json';
import { BADGES } from '../data/badges';

// ── Lucide icons as inline SVG helpers ──
const Icon = {
  Flame: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{color:'#f97316'}}><path d="M12 2c0 0-5 5-5 10a5 5 0 0 0 10 0c0-2.5-1.5-4.5-3-6.5C13 4 12 2 12 2z"/></svg>
  ),
  Menu: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
  ),
  X: () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
  ),
  LogOut: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
  ),
  Award: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89L17 22l-5-3-5 3 1.523-9.11"/></svg>
  ),
  TrendingUp: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
  ),
  ShieldAlert: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
  ),
  Clock: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
  ),
  Layers: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
  ),
  Coins: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18"/><path d="M7 6h1v4"/><path d="m16.71 13.88.7.71-2.82 2.82"/></svg>
  ),
  CheckCircle2: () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>
  ),
  Lock: ({ size = 14 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
  ),
  Code: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
  ),
  Trophy: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/></svg>
  ),
  Certificate: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
  ),
  Building: () => (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="9" width="18" height="13"/><path d="M8 22V12h3v10"/><path d="M13 22V12h3v10"/><path d="M3 9l9-7 9 7"/></svg>
  ),
};

const navItems = [
  { key: 'practice',     label: 'Practice Arena',  icon: <Icon.Code /> },
  { key: 'mnc',          label: 'MNC Prep',         icon: <Icon.Building /> },
  { key: 'certificates', label: 'My Certificates',  icon: <Icon.Certificate /> },
  { key: 'leaderboard',  label: 'Leaderboard',      icon: <Icon.Trophy /> },
] as const;

type TabKey = typeof navItems[number]['key'];

const HomePage: React.FC = () => {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigateRouter = useNavigate();
  const currentPath = location.pathname;

  const [showOnboard,  setShowOnboard]  = useState(false);
  const [xp,           setXp]           = useState(0);
  const [level,        setLevel]        = useState('beginner');
  const [badges,       setBadges]       = useState<string[]>([]);
  const [recentSubs,   setRecentSubs]   = useState<boolean[]>([]);
  const [accuracy,     setAccuracy]     = useState(100);
  const [isMenuOpen,   setIsMenuOpen]   = useState(false);
  const [isSandbox,    setIsSandbox]    = useState(false);
  const [dbError,      setDbError]      = useState<string | null>(null);
  const [showShift,    setShowShift]    = useState(false);
  const [shiftDir,     setShiftDir]     = useState<'promote'|'relegate'>('promote');
  const [prevTrack,    setPrevTrack]    = useState('');
  const [newTrack,     setNewTrack]     = useState('');
  const [showLevelUp,  setShowLevelUp]  = useState(false);
  const [levelUpVal,   setLevelUpVal]   = useState(1);
  const [fullName,     setFullName]     = useState('');

  let activeTab: TabKey = 'practice';
  if (currentPath === '/mnc') activeTab = 'mnc';
  else if (currentPath === '/certificates') activeTab = 'certificates';
  else if (currentPath === '/leaderboard') activeTab = 'leaderboard';

  // ── profile fetch ─────────────────────────────────────────
  const fetchProfile = async () => {
    if (!user) return;
    try {
      // 1. Fetch profile level, full_name, college, diagnostic_completed
      let { data: profile, error: profileErr } = await supabase
        .from('student_profiles')
        .select('full_name, college, level, diagnostic_completed')
        .eq('id', user.id)
        .single();
        
      if (profileErr) {
        if (profileErr.code === 'PGRST116') {
          // Auto create missing profile row
          const emailPrefix = user.email ? user.email.split('@')[0] : 'Student';
          const formattedName = emailPrefix.split(/[-_.]/).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
          
          const { data: newProfile, error: createProfileErr } = await supabase
            .from('student_profiles')
            .insert({
              id: user.id,
              email: user.email || '',
              full_name: formattedName,
              college: 'Kerala Engineering Student',
              level: 'beginner',
              diagnostic_completed: false
            })
            .select('full_name, college, level, diagnostic_completed')
            .single();
            
          if (createProfileErr) throw createProfileErr;
          profile = newProfile;
        } else {
          throw profileErr;
        }
      }

      if (profile) {
        setFullName(profile.full_name || '');
      }
      
      const finalLevel = profile?.level || 'beginner';
      const dbDiagnosticCompleted = profile?.diagnostic_completed || false;
      const uid = user.id;

      if (dbDiagnosticCompleted) {
        localStorage.setItem(`codcraft_diagnostic_completed_${uid}`, 'true');
      }

      // 2. Fetch progress score (XP) and solved questions list
      let { data: progress, error: progErr } = await supabase
        .from('student_progress')
        .select('score, level, solved_questions')
        .eq('email', user.email)
        .single();
        
      let finalXp = 0;
      let finalProgressLevel = finalLevel;

      if (progErr) {
        if (progErr.code === 'PGRST116') {
          // Auto create missing progress row
          const { data: newProg, error: createErr } = await supabase
            .from('student_progress')
            .insert({
              email: user.email || '',
              level: finalLevel,
              score: 0,
              solved_questions: []
            })
            .select('score, level, solved_questions')
            .single();
            
          if (createErr) throw createErr;
          progress = newProg;
        } else {
          throw progErr;
        }
      }

      if (progress) {
        finalXp = progress.score ?? 0;
        finalProgressLevel = progress.level || finalLevel;
      }

      setXp(finalXp);
      setLevel(finalProgressLevel);

      // Load local gamification badges fallback
      setBadges(JSON.parse(localStorage.getItem(`codcraft_badges_${uid}`) || '[]'));
      setIsSandbox(false);
      setDbError(null);

      // Check if diagnostic onboarding has been completed
      const diagnosticCompleted = dbDiagnosticCompleted || localStorage.getItem(`codcraft_diagnostic_completed_${uid}`) === 'true';
      if (!diagnosticCompleted) {
        setShowOnboard(true);
      }

      fetchRecentSubs(finalProgressLevel);

    } catch (err: any) {
      console.warn("Supabase profile sync failed, running in local fallback mode:", err.message);
      setIsSandbox(true);
      setDbError("Running in offline mode. Your progress is saved locally.");
      
      const uid = user.id;
      const lxp = parseInt(localStorage.getItem(`codcraft_xp_${uid}`) || '0', 10);
      const llvl = localStorage.getItem(`codcraft_level_${uid}`) || 'beginner';
      setXp(lxp);
      setLevel(llvl);
      setFullName(user.email ? user.email.split('@')[0] : 'Sandbox Coder');
      setBadges(JSON.parse(localStorage.getItem(`codcraft_badges_${uid}`) || '[]'));

      const diagnosticCompleted = localStorage.getItem(`codcraft_diagnostic_completed_${uid}`) === 'true';
      if (!diagnosticCompleted) {
        setShowOnboard(true);
      }

      fetchRecentSubs(llvl);
    }
  };

  const fetchRecentSubs = async (lvl: string) => {
    if (!user) return;
    const hist = JSON.parse(localStorage.getItem(`codcraft_submissions_${user.id}_${lvl}`) || '[]');
    setRecentSubs(hist);
    if (hist.length > 0) {
      const acc = Math.round((hist.filter(Boolean).length / hist.length) * 100);
      setAccuracy(acc);
      if (hist.length >= 5) {
        if (acc >= 80) {
          if (lvl === 'beginner') triggerShift('mid', 'promote');
          else if (lvl === 'mid') triggerShift('pro', 'promote');
        } else if (acc < 40) {
          if (lvl === 'pro') triggerShift('mid', 'relegate');
          else if (lvl === 'mid') triggerShift('beginner', 'relegate');
        }
      }
    } else { setAccuracy(100); }
  };

  const triggerShift = async (nl: string, dir: 'promote'|'relegate') => {
    if (!user) return;
    setPrevTrack(level); setNewTrack(nl); setShiftDir(dir); setLevel(nl);
    localStorage.setItem(`codcraft_level_${user.id}`, nl);
    localStorage.setItem(`codcraft_submissions_${user.id}_${nl}`, '[]');
    setRecentSubs([]); setAccuracy(100);
    try { 
      await supabase.from('student_profiles').update({ level: nl }).eq('id', user.id); 
      await supabase.from('student_progress').update({ level: nl }).eq('email', user.email);
    } catch {}
    if (dir === 'promote') awardBadge('tier_promotion');
    setShowShift(true);
  };

  const awardBadge = async (id: string) => {
    if (!user || badges.includes(id)) return;
    const next = [...badges, id];
    setBadges(next);
    localStorage.setItem(`codcraft_badges_${user.id}`, JSON.stringify(next));
    const b = BADGES.find(badge => badge.id === id);
    if (b) alert(`🏆 Achievement Unlocked: ${b.name}!\n${b.description}`);
  };

  const handleAnswerRewarded = async (reward: number, questionId?: number) => {
    if (!user) return;

    try {
      // 1. Fetch current progress
      const { data: progress } = await supabase
        .from('student_progress')
        .select('solved_count, wrong_count, solved_questions')
        .eq('email', user.email)
        .single();
      
      const currentSolved = progress?.solved_count ?? 0;
      const currentWrong = progress?.wrong_count ?? 0;
      let solvedQs = progress?.solved_questions || [];
      if (!Array.isArray(solvedQs)) solvedQs = [];
      
      let nextSolved = currentSolved;
      let nextWrong = currentWrong;
      
      if (reward > 0) {
        nextSolved = currentSolved + 1;
        if (questionId && !solvedQs.includes(questionId)) {
          solvedQs.push(questionId);
        }
      } else if (reward < 0) {
        nextWrong = currentWrong + 1;
      }
      
      const potentialXp = (nextSolved * 20) - (nextWrong * 5);
      const newXp = Math.max(0, potentialXp);
      const oldLv = Math.floor(xp / 100) + 1;
      const newLv = Math.floor(newXp / 100) + 1;
      
      let newLevel = level;
      if (newXp >= 300) newLevel = 'pro';
      else if (newXp >= 100) newLevel = 'mid';
      else newLevel = 'beginner';

      // Update student_progress with incremented values and solved_questions
      const { data: updatedProg } = await supabase
        .from('student_progress')
        .update({ 
          solved_count: nextSolved,
          wrong_count: nextWrong,
          solved_questions: solvedQs,
          level: newLevel 
        })
        .eq('email', user.email)
        .select('score')
        .single();
        
      await supabase.from('student_profiles').update({ level: newLevel }).eq('id', user.id);

      const finalXp = updatedProg?.score ?? newXp;
      setXp(finalXp);
      setLevel(newLevel);
      localStorage.setItem(`codcraft_xp_${user.id}`, String(finalXp));
      localStorage.setItem(`codcraft_level_${user.id}`, newLevel);

      awardBadge('first_solve');
      if (newLv > oldLv) {
        setLevelUpVal(newLv);
        setShowLevelUp(true);
      }
      fetchRecentSubs(newLevel);

    } catch (err) {
      console.warn("Failed to sync progress reward with database:", err);
      // Fallback
      const newXp = Math.max(0, xp + reward);
      const oldLv = Math.floor(xp / 100) + 1;
      const newLv = Math.floor(newXp / 100) + 1;
      let newLevel = level;
      if (newXp >= 300) newLevel = 'pro';
      else if (newXp >= 100) newLevel = 'mid';
      else newLevel = 'beginner';

      setXp(newXp);
      setLevel(newLevel);
      localStorage.setItem(`codcraft_xp_${user.id}`, String(newXp));
      localStorage.setItem(`codcraft_level_${user.id}`, newLevel);
      
      awardBadge('first_solve');
      if (newLv > oldLv) {
        setLevelUpVal(newLv);
        setShowLevelUp(true);
      }
      fetchRecentSubs(newLevel);
    }
  };

  const handleOnboardSaved = (l: string) => { setLevel(l); fetchProfile(); };
  useEffect(() => { fetchProfile(); }, [user]);

  const renderBadgeShelf = () => (
    <div className="card card-p">
      <div className="flex items-center gap-2 mb-4" style={{ paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)' }}>
        <Icon.Award />
        <h3 style={{ fontSize: '0.9rem' }}>Badge Shelf</h3>
      </div>
      <div className="badge-shelf">
        {BADGES.map(b => {
          const unlocked = badges.includes(b.id);
          return (
            <div key={b.id} className="badge-item">
              <div
                className={`badge-icon${unlocked ? '' : ' locked'}`}
                style={unlocked ? {
                  background: `linear-gradient(135deg, ${b.color.split(',')[0]}, ${b.color.split(',')[1]})`
                } : {}}
              >
                {unlocked ? b.icon : <Icon.Lock size={14} />}
              </div>
              <span className="badge-name">{b.name}</span>
              <div className="badge-tooltip">
                <h5>{b.name}</h5>
                <p>{b.description}</p>
                <p style={{ fontSize: '0.65rem', fontWeight: 700, color: unlocked ? 'var(--success)' : 'var(--muted)', marginTop: '0.35rem' }}>
                  {unlocked ? '✓ Unlocked' : '🔒 Locked'}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // Daily challenge
  const daily   = (questionsData as any).coding[(new Date().getDate()) % (questionsData as any).coding.length];
  const dailySolved = user ? localStorage.getItem(`codcraft_solved_${user.id}_${daily?.id}`) === 'true' : false;

  // Accuracy colors
  const accColor = accuracy >= 80 ? 'green' : accuracy < 40 ? 'red' : 'amber';

  const trackLabel = (t: string) => t === 'pro' ? 'Advanced' : t === 'mid' ? 'Intermediate' : 'Beginner';
  const trackClass = (t: string) => `track-${t}`;

  const navigate = (tab: TabKey) => {
    setIsMenuOpen(false);
    if (tab === 'practice') navigateRouter('/');
    else if (tab === 'mnc') navigateRouter('/mnc');
    else if (tab === 'certificates') navigateRouter('/certificates');
    else if (tab === 'leaderboard') navigateRouter('/leaderboard');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>

      {/* ── Sticky Header ───────────────────────────────────── */}
      <header className="app-header">
        <div className="app-header-logo" onClick={() => navigate('practice')}>
          <img src={`${import.meta.env.BASE_URL}yantrixa-logo.png`} alt="Yantrixa" />
          <span className="name">CodCraft</span>
          <span className="ktu-tag">KTU</span>
        </div>

        {/* Desktop nav */}
        <nav className="desktop-only" style={{ display: 'flex', gap: '0.25rem' }}>
          {navItems.map(n => (
            <button
              key={n.key}
              onClick={() => navigate(n.key)}
              className={`desktop-nav-btn${activeTab === n.key ? ' active' : ''}`}
            >
              {n.icon} {n.label}
            </button>
          ))}
        </nav>

        <div className="app-header-right">
          {/* Level & XP chip — desktop */}
          <div className="streak-chip desktop-only" style={{ background: 'var(--indigo-bg)', borderColor: '#c7d2fe', color: 'var(--indigo)' }}>
            <span>⚡</span>
            <span>Lv.{Math.floor(xp / 100) + 1}</span>
            <span style={{ color: 'var(--muted)', margin: '0 0.15rem' }}>·</span>
            <span>{xp} XP</span>
          </div>
          <button
            className="btn btn-ghost btn-sm desktop-only"
            onClick={() => signOut()}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Logout
          </button>

          {/* Hamburger */}
          <button className="hamburger-btn" onClick={() => setIsMenuOpen(true)}>
            <Icon.Menu />
          </button>
        </div>
      </header>

      {/* ── Sandbox Banner ──────────────────────────────────── */}
      {isSandbox && (
        <div className="sandbox-banner">
          <span>💡 <strong>{dbError}</strong> — Run the SQL migration in Supabase to enable cloud sync.</span>
          <button className="sandbox-banner-close" onClick={() => setIsSandbox(false)}>✕</button>
        </div>
      )}

      {/* ── Main Layout (Route Specific) ────────────────────── */}
      {activeTab === 'practice' ? (
        <div className="dashboard-layout">
          {/* ── Left Main Column ──────────────────────────────── */}
          <div className="main-col">
            
            {/* Profile / Track Card */}
            <div className="card card-p">
              <div className="flex justify-between items-start mb-4" style={{ gap: '1rem' }}>
                <div>
                  <div className="section-tag">Track Trajectory</div>
                  <h2 style={{ fontSize: '1.35rem', marginTop: '0.4rem', color: 'var(--text)' }}>
                    Welcome back, <span style={{ color: 'var(--indigo)' }}>{user?.email?.split('@')[0]}</span>!
                  </h2>
                  <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
                    Solve KTU-aligned challenges to earn XP and advance your tier.
                  </p>
                </div>
                <span className={`track-badge ${trackClass(level)}`}>
                  {trackLabel(level)} Track
                </span>
              </div>

              {/* Stats row */}
              <div className="stats-grid" style={{ marginBottom: '1.25rem' }}>
                <div className="stat-card">
                  <div className="stat-label">Total XP</div>
                  <div className="stat-value gold">{xp}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Profile Level</div>
                  <div className="stat-value">Lv.{Math.floor(xp / 100) + 1}</div>
                </div>
                <div className="stat-card">
                  <div className="stat-label">Active Track</div>
                  <div className="stat-value" style={{ fontSize: '1.1rem', textTransform: 'capitalize' }}>{trackLabel(level)}</div>
                </div>
              </div>

              {/* Accuracy bar */}
              <div className="accuracy-section">
                <div className="accuracy-header">
                  <span className="flex items-center gap-2" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--muted2)' }}>
                    <Icon.Layers /> Rolling Accuracy (Last {recentSubs.length || 0} runs)
                  </span>
                  <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: '0.85rem', color: accuracy >= 80 ? 'var(--success)' : accuracy < 40 ? 'var(--danger)' : 'var(--gold2)' }}>
                    {recentSubs.length > 0 ? `${accuracy}%` : 'No attempts yet'}
                  </span>
                </div>
                <div className="accuracy-bar-track">
                  <div
                    className={`accuracy-bar-fill ${accColor}`}
                    style={{ width: `${recentSubs.length > 0 ? accuracy : 100}%` }}
                  />
                </div>
                <div className="accuracy-legend">
                  <span>Relegate (&lt;40%)</span>
                  <span>Stable Zone</span>
                  <span>Promote (≥80%)</span>
                </div>
                {recentSubs.length >= 3 && accuracy >= 70 && accuracy < 80 && (
                  <div className="flex items-center gap-2 mt-3" style={{ padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', background: 'var(--success-bg)', border: '1px solid var(--success-border)', fontSize: '0.75rem', color: 'var(--success)' }}>
                    <Icon.TrendingUp /> Almost there! Keep your accuracy above 80% to promote.
                  </div>
                )}
                {recentSubs.length >= 3 && accuracy >= 40 && accuracy <= 50 && (
                  <div className="flex items-center gap-2 mt-3" style={{ padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', background: 'var(--gold-bg)', border: '1px solid var(--gold-border)', fontSize: '0.75rem', color: 'var(--gold-text)' }}>
                    <Icon.ShieldAlert /> Warning: Accuracy is nearing the relegation threshold (40%).
                  </div>
                )}
              </div>
            </div>

            {/* Daily Challenge */}
            {daily && (
              <div className="daily-card">
                <div className="flex justify-between items-center mb-3">
                  <div className="section-tag">
                    <Icon.Clock /> Daily Challenge · 2× XP
                  </div>
                  {dailySolved && (
                    <span className="badge badge-green" style={{ fontSize: '10px' }}>
                      <Icon.CheckCircle2 /> Completed
                    </span>
                  )}
                </div>
                <div className="flex justify-between items-center gap-4">
                  <div>
                    <h3 style={{ fontFamily: 'var(--mono)', fontSize: '0.95rem', fontWeight: 700 }}>{daily.title}</h3>
                    <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '0.3rem' }}>
                      Solve in Python, C++, Java, or C to earn double XP today.
                    </p>
                  </div>
                  {!dailySolved && (
                    <button
                      className="btn btn-primary btn-sm"
                      style={{ flexShrink: 0 }}
                      onClick={() => {
                        setTimeout(() => document.getElementById(`challenge-${daily.id}`)?.scrollIntoView({ behavior: 'smooth' }), 100);
                      }}
                    >
                      Solve Now
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Challenges Section */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 style={{ fontSize: '0.9rem', fontFamily: 'var(--mono)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {trackLabel(level)} Challenges
                </h2>
                <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>KTU Syllabus Mapped</span>
              </div>
              <QuestionBank level={level} onAnswered={handleAnswerRewarded} />
            </div>

            <div className="mobile-only mt-4">
              {renderBadgeShelf()}
            </div>
          </div>

          {/* ── Right Sidebar ────────────────────────────────── */}
          <div className="sidebar-col">
            {/* Mini Leaderboard */}
            <div className="card card-p">
              <div className="flex justify-between items-center mb-4" style={{ paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)' }}>
                <h3 className="flex items-center gap-2" style={{ fontSize: '0.9rem', color: 'var(--text)' }}>
                  <Icon.Award /> Leaderboard
                </h3>
                <span className="badge badge-green" style={{ fontSize: '0.6rem' }}>Live</span>
              </div>
              <Leaderboard refreshTrigger={xp} currentUserFullName={fullName} />
            </div>

            {/* Badge Shelf */}
            {renderBadgeShelf()}
          </div>
        </div>
      ) : activeTab === 'mnc' ? (
        <div className="dashboard-layout">
          {/* MNC Prep Content */}
          <div className="main-col">
            <MNCSection onAnswered={handleAnswerRewarded} />
          </div>
          {/* MNC Sidebar */}
          <div className="sidebar-col">
            {renderBadgeShelf()}
          </div>
        </div>
      ) : activeTab === 'certificates' ? (
        <div className="dashboard-layout" style={{ display: 'block' }}>
          {/* Certificates Content */}
          <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <CertificateGenerator xp={xp} />
          </div>
        </div>
      ) : (
        <div className="dashboard-layout" style={{ display: 'block' }}>
          {/* Global Leaderboard Standings Page */}
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div className="card card-p">
              <div className="flex justify-between items-center mb-4" style={{ paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)' }}>
                <h2 style={{ fontSize: '1.35rem', color: 'var(--text)', fontWeight: 800 }}>
                  Global Leaderboard Standings
                </h2>
                <span className="badge badge-green">Live Updates</span>
              </div>
              <Leaderboard refreshTrigger={xp} currentUserFullName={fullName} />
            </div>
          </div>
        </div>
      )}

      {/* ── Footer ───────────────────────────────────────────── */}
      <footer className="app-footer">
        <img src={`${import.meta.env.BASE_URL}yantrixa-logo.png`} alt="Yantrixa" />
        CodCraft © 2026 · KTU Curriculum Aligned ·
        Built by <a href="https://yantrixa.in" target="_blank" rel="noopener noreferrer">yantrixa.in</a>
      </footer>

      {/* ── Mobile Drawer ────────────────────────────────────── */}
      {isMenuOpen && (
        <div className="drawer-overlay" onClick={() => setIsMenuOpen(false)}>
          <div className="drawer" onClick={e => e.stopPropagation()}>
            <div className="drawer-header">
              <div className="drawer-logo">
                <img src={`${import.meta.env.BASE_URL}yantrixa-logo.png`} alt="Yantrixa" />
                <span>CodCraft</span>
              </div>
              <button className="drawer-close" onClick={() => setIsMenuOpen(false)}><Icon.X /></button>
            </div>

            <div className="drawer-stats">
              <div className="drawer-stats-row">
                <span>⚡</span>
                <span><strong>{xp}</strong> total XP earned</span>
              </div>
              <div className="drawer-stats-row">
                <span>📈</span>
                <span>Level <strong>{Math.floor(xp/100)+1}</strong> (<strong>{trackLabel(level)}</strong>)</span>
              </div>
            </div>

            <nav className="drawer-nav">
              {navItems.map(n => (
                <button
                  key={n.key}
                  className={`drawer-nav-item${activeTab === n.key ? ' active' : ''}`}
                  onClick={() => navigate(n.key)}
                >
                  <span className="nav-icon">{n.icon}</span>
                  {n.label}
                </button>
              ))}
            </nav>

            <button className="btn btn-ghost btn-full" style={{ marginTop: 'auto' }} onClick={() => signOut()}>
              <Icon.LogOut /> Logout
            </button>
          </div>
          <div className="drawer-backdrop" onClick={() => setIsMenuOpen(false)} />
        </div>
      )}

      {/* ── Onboarding Overlay ──────────────────────────────── */}
      {showOnboard && (
        <OnboardLevel onClose={() => setShowOnboard(false)} onSaved={handleOnboardSaved} />
      )}

      {/* ── Track Shift Overlay ─────────────────────────────── */}
      {showShift && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="promo-emoji">{shiftDir === 'promote' ? '👑' : '📉'}</div>
            <h2 style={{ color: 'var(--text)', marginBottom: '0.5rem' }}>
              {shiftDir === 'promote' ? 'Track Promotion! 🎉' : 'Track Adjustment'}
            </h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--muted)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
              {shiftDir === 'promote'
                ? `Your rolling accuracy exceeded 80%! You've moved from ${prevTrack.toUpperCase()} to ${newTrack.toUpperCase()} track.`
                : `Your accuracy fell below 40%. You've been adjusted from ${prevTrack.toUpperCase()} to ${newTrack.toUpperCase()} to rebuild foundations.`}
            </p>
            <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0.75rem', fontSize: '0.8rem', marginBottom: '1.25rem', textAlign: 'left', color: 'var(--text2)' }}>
              {shiftDir === 'promote' ? '🚀 Harder questions with higher XP rewards are now unlocked.' : '💡 Solve foundation challenges to rebuild your accuracy.'}
            </div>
            <button className="btn btn-primary btn-full" onClick={() => setShowShift(false)}>Continue to Arena</button>
          </div>
        </div>
      )}

      {/* ── Level Up Overlay ─────────────────────────────────── */}
      {showLevelUp && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="promo-emoji animate-bounce">⚡</div>
            <h2 style={{ marginBottom: '0.5rem', color: 'var(--text)' }}>Level Up!</h2>
            <p style={{ fontSize: '0.95rem', color: 'var(--indigo)', fontWeight: 700, marginBottom: '0.5rem' }}>You reached Level {levelUpVal}!</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginBottom: '1.25rem' }}>Your dedication is showing. Keep going!</p>
            <div style={{ background: 'var(--gold-bg)', border: '1px solid #fde68a', borderRadius: 'var(--radius-sm)', padding: '0.75rem', fontSize: '0.8rem', color: '#92400e', marginBottom: '1.25rem' }}>
              🎉 Keep practicing to unlock new coding ranks and certificates!
            </div>
            <button className="btn btn-primary btn-full" onClick={() => setShowLevelUp(false)}>Continue</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;
