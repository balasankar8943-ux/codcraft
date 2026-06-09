// src/components/HomePage.tsx
import React, { useEffect, useState } from 'react';
import { useAuth } from './AuthProvider';
import { supabase } from '../supabaseClient';
import OnboardLevel from './OnboardLevel';
import QuestionBank from './QuestionBank';
import MNCSection from './MNCSection';
import Leaderboard from './Leaderboard';

const XP_THRESHOLDS = {
  beginner: 100, // XP to reach mid
  mid: 300,      // XP to reach pro
};

const HomePage: React.FC = () => {
  const { user, signOut } = useAuth();
  const [showOnboard, setShowOnboard] = useState(false);
  const [xp, setXp] = useState<number>(0);
  const [level, setLevel] = useState<string>('beginner');
  const [activeTab, setActiveTab] = useState<'practice' | 'mnc' | 'leaderboard'>('practice');
  const [isSandbox, setIsSandbox] = useState(false);
  const [dbErrorMsg, setDbErrorMsg] = useState<string | null>(null);

  const fetchProfile = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('users')
        .select('xp, level')
        .eq('id', user.id)
        .single();
        
      if (error) {
        if (error.code === 'PGRST116') {
          // Profile doesn't exist – insert it
          const { error: insertErr } = await supabase.from('users').insert({
            id: user.id,
            email: user.email,
            xp: 0,
            level: 'beginner',
          });
          if (insertErr) throw insertErr;
          setXp(0);
          setLevel('beginner');
          setShowOnboard(true);
        } else {
          throw error;
        }
      } else {
        setXp(data.xp ?? 0);
        setLevel(data.level ?? 'beginner');
        if (!data.level) {
          setShowOnboard(true);
        }
      }
    } catch (err: any) {
      console.warn("Supabase fetch failed. Falling back to local state (Sandbox Mode):", err.message);
      setIsSandbox(true);
      setDbErrorMsg("Database connection failed. Running in Local Sandbox mode.");
      
      // Load local fallback data
      const localXp = parseInt(localStorage.getItem(`codcraft_xp_${user.id}`) || '0', 10);
      const localLevel = localStorage.getItem(`codcraft_level_${user.id}`) || 'beginner';
      setXp(localXp);
      setLevel(localLevel);

      // Show onboarding if no level is stored locally either
      if (!localStorage.getItem(`codcraft_level_${user.id}`)) {
        setShowOnboard(true);
      }
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [user]);

  // Handle level recalculations locally or push to DB
  const handleAnswerRewarded = async (rewardXp: number) => {
    if (!user) return;
    const newXp = xp + rewardXp;
    
    // Determine new level based on trajectory thresholds
    let newLevel = level;
    if (level === 'beginner' && newXp >= XP_THRESHOLDS.beginner) {
      newLevel = 'mid';
    } else if (level === 'mid' && newXp >= XP_THRESHOLDS.mid) {
      newLevel = 'pro';
    }

    setXp(newXp);
    setLevel(newLevel);

    if (isSandbox) {
      localStorage.setItem(`codcraft_xp_${user.id}`, newXp.toString());
      localStorage.setItem(`codcraft_level_${user.id}`, newLevel);
    } else {
      try {
        await supabase.from('users').update({ xp: newXp, level: newLevel }).eq('id', user.id);
      } catch (err) {
        console.error("Failed to sync XP to DB, writing locally:", err);
        localStorage.setItem(`codcraft_xp_${user.id}`, newXp.toString());
        localStorage.setItem(`codcraft_level_${user.id}`, newLevel);
      }
    }
  };

  const handleOnboardSaved = (selectedLevel: string) => {
    setLevel(selectedLevel);
    // Refresh to update DB sync or local state
    fetchProfile();
  };

  // Trajectory progress percentages
  let progressPercent = 0;
  let nextThreshold = XP_THRESHOLDS.beginner;
  let prevThreshold = 0;

  if (level === 'beginner') {
    nextThreshold = XP_THRESHOLDS.beginner;
    prevThreshold = 0;
    progressPercent = Math.min(100, (xp / nextThreshold) * 100);
  } else if (level === 'mid') {
    nextThreshold = XP_THRESHOLDS.mid;
    prevThreshold = XP_THRESHOLDS.beginner;
    progressPercent = Math.min(100, ((xp - prevThreshold) / (nextThreshold - prevThreshold)) * 100);
  } else {
    // Pro has reached max trajectory level
    progressPercent = 100;
  }

  const xpNeeded = level !== 'pro' ? nextThreshold - xp : 0;
  const username = user?.email?.split('@')[0] ?? 'Coder';

  return (
    <div className="container">
      {/* Sandbox Alert Banner */}
      {isSandbox && (
        <div className="toast-success" style={{
          margin: '0.5rem 0 1.5rem 0',
          background: 'rgba(245, 158, 11, 0.12)',
          borderColor: 'rgba(245, 158, 11, 0.3)',
          color: '#fef3c7',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>💡</span>
            <span style={{ fontSize: '0.85rem' }}>
              <strong>{dbErrorMsg || 'Sandbox Mode'}:</strong> Connect your Supabase credentials and execute the SQL schema shown in the plan to enable cloud synchronization and global leaderboards.
            </span>
          </div>
          <button
            onClick={() => setIsSandbox(false)}
            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Header Area */}
      <header>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <a href="/" className="logo">
            <span>&lt;/&gt;</span> CodCraft
          </a>
          <span className="brand-badge">yantrixa.in</span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span style={{ fontSize: '0.9rem', fontWeight: '600' }}>{username}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Kerala Engg Student</span>
          </div>
          <button className="btn btn-secondary" onClick={() => signOut()} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
            Logout
          </button>
        </div>
      </header>

      {/* Main Dashboard Layout */}
      <div className="dashboard-grid">
        
        {/* Left Side: Trajectory and Coding Arena */}
        <div>
          {/* Welcome Banner */}
          <div className="glass-card hero-banner" style={{ padding: '2rem', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span className="brand-badge" style={{ marginBottom: '0.5rem', display: 'inline-block', background: 'var(--primary-glow)', color: '#fff', borderColor: 'var(--primary)' }}>
                  Level Trajectory
                </span>
                <h1 style={{ margin: '0', fontSize: '2.2rem', textAlign: 'left' }}>
                  Hi, {username}!
                </h1>
                <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                  Ready to test your code? Solve questions to gain XP and advance from Beginner to Pro.
                </p>
              </div>
              
              <span className={`badge badge-${level}`} style={{ fontSize: '0.9rem', padding: '0.4rem 1rem' }}>
                {level.toUpperCase()}
              </span>
            </div>

            {/* XP Statistics Grid */}
            <div className="stats-row" style={{ marginTop: '0.5rem' }}>
              <div className="stat-item">
                <div className="stat-val">{xp}</div>
                <div className="stat-label">Total XP</div>
              </div>
              <div className="stat-item">
                <div className="stat-val">
                  {level === 'beginner' ? 'Beginner' : level === 'mid' ? 'Mid' : 'Pro'}
                </div>
                <div className="stat-label">Knowledge Rank</div>
              </div>
              <div className="stat-item">
                <div className="stat-val">{level === 'pro' ? 'MAX' : `${xpNeeded} XP`}</div>
                <div className="stat-label">{level === 'pro' ? 'Highest Rank' : 'XP to Next Rank'}</div>
              </div>
            </div>

            {/* Progress to Next Level */}
            <div className="progress-container">
              <div className="progress-header">
                <span>{level === 'beginner' ? 'Beginner Trajectory' : level === 'mid' ? 'Mid Trajectory' : 'Pro Mastery'}</span>
                <span>
                  {level === 'beginner' ? `${xp}/100 XP` : level === 'mid' ? `${xp}/300 XP` : 'Max Level Reached 🔥'}
                </span>
              </div>
              <div className="progress-bar">
                <div className="filled" style={{ width: `${progressPercent}%` }} />
              </div>
              {level !== 'pro' && (
                <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic', marginTop: '0.25rem' }}>
                  📈 Reach {nextThreshold} XP to unlock the <strong>{level === 'beginner' ? 'Mid' : 'Pro'} level</strong> questions.
                </span>
              )}
            </div>
          </div>

          {/* Practice Area Tabs */}
          <div className="tabs-nav">
            <button
              className={`tab-btn ${activeTab === 'practice' ? 'active' : ''}`}
              onClick={() => setActiveTab('practice')}
            >
              Practice Arena ({level.toUpperCase()})
            </button>
            <button
              className={`tab-btn ${activeTab === 'mnc' ? 'active' : ''}`}
              onClick={() => setActiveTab('mnc')}
            >
              MNC Recruitment Prep
            </button>
            <button
              className={`tab-btn tab-mobile-only ${activeTab === 'leaderboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('leaderboard')}
              style={{ display: 'none' }}
            >
              Leaderboard
            </button>
          </div>

          {/* Render Active Area */}
          <div style={{ minHeight: '350px' }}>
            {activeTab === 'practice' && (
              <div>
                <div style={{ marginBottom: '1.5rem' }}>
                  <h2 style={{ fontSize: '1.4rem', marginBottom: '0.25rem' }}>General Practice Arena</h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                    These problems are curated for your current level ({level.toUpperCase()}). Upgrading your level will unlock tougher questions.
                  </p>
                </div>
                <QuestionBank level={level} onAnswered={handleAnswerRewarded} />
              </div>
            )}

            {activeTab === 'mnc' && (
              <MNCSection onAnswered={handleAnswerRewarded} />
            )}

            {activeTab === 'leaderboard' && (
              <div className="tab-mobile-content">
                <Leaderboard refreshTrigger={xp} />
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Global Leaderboard (Desktop/Laptop only) */}
        <div className="sidebar-section">
          <div className="glass-card" style={{ height: 'fit-content', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.2rem' }}>Working Leaderboard</h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--primary-light)', fontWeight: '600' }}>LIVE UPDATES</span>
            </div>
            <Leaderboard refreshTrigger={xp} />
          </div>
        </div>

      </div>

      {/* Footer branding */}
      <footer>
        <div>
          <span>&lt;/&gt; CodCraft © 2026. All rights reserved.</span>
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Design System & Platform engineered by <a href="https://yantrixa.in" target="_blank" rel="noopener noreferrer" className="yantrixa-link">yantrixa.in</a>
        </div>
      </footer>

      {showOnboard && (
        <OnboardLevel
          onClose={() => setShowOnboard(false)}
          onSaved={handleOnboardSaved}
        />
      )}

      {/* Desktop sidebar display rules / tab displays */}
      <style>{`
        @media (max-width: 1024px) {
          .sidebar-section {
            display: none !important;
          }
          .tab-mobile-only {
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
};

export default HomePage;
