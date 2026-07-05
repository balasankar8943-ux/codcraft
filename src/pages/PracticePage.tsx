// src/pages/PracticePage.tsx
import React, { useEffect, useState } from 'react';
import { useAuth } from '../components/AuthProvider';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import AppShell from '../components/AppShell';
import QuestionBank from '../components/QuestionBank';
import Leaderboard from '../components/Leaderboard';
import OnboardLevel from '../components/OnboardLevel';
import questionsData from '../data/questions.json';

const PracticePage: React.FC = () => {
  const { user } = useAuth();
  const navigate  = useNavigate();
  const [xp,    setXp]    = useState(0);
  const [level, setLevel] = useState('beginner');
  const [fullName, setFullName] = useState('');
  const [recentSubs, setRecentSubs] = useState<boolean[]>([]);
  const [accuracy, setAccuracy] = useState(100);
  const [showOnboard, setShowOnboard] = useState(false);
  const [daily, setDaily] = useState<any>(null);
  const [dailySolved, setDailySolved] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    try {
      let { data: profile } = await supabase.from('student_profiles').select('full_name, level, diagnostic_completed').eq('id', user.id).single();
      let { data: progress } = await supabase.from('student_progress').select('score, level, solved_questions').eq('email', user.email).single();

      const lvl = progress?.level || profile?.level || 'beginner';
      const score = progress?.score ?? 0;
      setLevel(lvl); setXp(score);
      setFullName(profile?.full_name || user.email?.split('@')[0] || '');

      const solved = progress?.solved_questions || [];
      const isOnboarded = profile?.diagnostic_completed || lvl !== 'beginner' || score > 0 || solved.length > 0;
      if (!isOnboarded) setShowOnboard(true);

      // Daily challenge
      const qs: any[] = (questionsData as any).coding.filter((q: any) => q.level === lvl);
      if (qs.length > 0) {
        const dayIdx = Math.floor(Date.now() / 86400000) % qs.length;
        const d = qs[dayIdx];
        setDaily(d);
        const isDailySolved = solved.some((item: any) => {
          if (typeof item === 'number') return item === d.id;
          if (item && typeof item === 'object') return item.id === d.id;
          return false;
        });
        setDailySolved(isDailySolved);
      }

      const hist: boolean[] = JSON.parse(localStorage.getItem(`codcraft_submissions_${user.id}_${lvl}`) || '[]');
      setRecentSubs(hist);
      if (hist.length > 0) setAccuracy(Math.round(hist.filter(Boolean).length / hist.length * 100));
    } catch {
      const lvl = localStorage.getItem(`codcraft_level_${user.id}`) || 'beginner';
      const score = parseInt(localStorage.getItem(`codcraft_xp_${user.id}`) || '0');
      setLevel(lvl); setXp(score);
      setFullName(user.email?.split('@')[0] || '');
    }
  };

  const handleAnswerRewarded = async (_reward: number) => {
    await fetchProfile();
  };

  const trackLabel = (l: string) => l === 'pro' ? 'Pro' : l === 'mid' ? 'Mid' : 'Beginner';
  const trackClass = (l: string) => l === 'pro' ? 'pro' : l === 'mid' ? 'mid' : 'beginner';
  const accColor = accuracy >= 80 ? 'acc-green' : accuracy < 40 ? 'acc-red' : 'acc-yellow';

  return (
    <AppShell xp={xp}>
      {showOnboard && (
        <OnboardLevel
          onSaved={(l: string) => { setLevel(l); setShowOnboard(false); fetchProfile(); }}
          onClose={() => setShowOnboard(false)}
        />
      )}

      <div className="dashboard-layout">
        {/* ── Left Main Column ── */}
        <div className="main-col">
          {/* Profile / Track Card */}
          <div className="card card-p">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', gap: '1rem', flexWrap: 'wrap' }}>
              <div>
                <div className="section-tag">Track Trajectory</div>
                <h2 style={{ fontSize: '1.25rem', marginTop: '0.4rem', color: 'var(--text)' }}>
                  Welcome back, <span style={{ color: 'var(--indigo)' }}>{fullName || user?.email?.split('@')[0]}</span>!
                </h2>
                <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.25rem' }}>Solve KTU-aligned challenges to earn XP and advance your tier.</p>
              </div>
              <span className={`track-badge ${trackClass(level)}`}>{trackLabel(level)} Track</span>
            </div>

            {/* Stats */}
            <div className="stats-grid" style={{ marginBottom: '1.25rem' }}>
              <div className="stat-card"><div className="stat-label">Total XP</div><div className="stat-value gold">{xp}</div></div>
              <div className="stat-card"><div className="stat-label">Profile Level</div><div className="stat-value">Lv.{Math.floor(xp/100)+1}</div></div>
              <div className="stat-card"><div className="stat-label">Active Track</div><div className="stat-value" style={{ fontSize: '1.1rem', textTransform: 'capitalize' }}>{trackLabel(level)}</div></div>
            </div>

            {/* Accuracy bar */}
            <div className="accuracy-section">
              <div className="accuracy-header">
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--muted2)' }}>Rolling Accuracy (Last {recentSubs.length} runs)</span>
                <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: '0.85rem', color: accuracy >= 80 ? 'var(--success)' : accuracy < 40 ? 'var(--danger)' : 'var(--gold2)' }}>
                  {recentSubs.length > 0 ? `${accuracy}%` : 'No attempts yet'}
                </span>
              </div>
              <div className="accuracy-bar-track">
                <div className={`accuracy-bar-fill ${accColor}`} style={{ width: `${recentSubs.length > 0 ? accuracy : 100}%` }} />
              </div>
              <div className="accuracy-legend">
                <span>Relegate (&lt;40%)</span>
                <span>Stable Zone</span>
                <span>Promote (≥80%)</span>
              </div>
            </div>
          </div>

          {/* Daily Challenge */}
          {daily && (
            <div className="daily-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <div className="section-tag">🕐 Daily Challenge · 2× XP</div>
                {dailySolved && <span className="badge badge-green" style={{ fontSize: '10px' }}>✓ Completed</span>}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <div>
                  <h3 style={{ fontFamily: 'var(--mono)', fontSize: '0.95rem', fontWeight: 700 }}>{daily.title}</h3>
                  <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '0.25rem' }}>Solve in Python, C++, Java, or C to earn double XP today.</p>
                </div>
                {!dailySolved && (
                  <button
                    onClick={() => navigate(`/question/${daily.id}?daily=true`)}
                    className="btn btn-primary btn-sm"
                    style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
                  >
                    🔥 Solve Now (2× XP)
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Questions */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: '0.9rem', fontFamily: 'var(--mono)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                {trackLabel(level)} Challenges
              </h2>
              <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>KTU Syllabus Mapped</span>
            </div>
            <QuestionBank level={level} onAnswered={handleAnswerRewarded} />
          </div>
        </div>

        {/* ── Right Sidebar ── */}
        <div className="sidebar-col">
          <div className="card card-p">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)' }}>
              <h3 style={{ fontSize: '0.9rem' }}>🏆 Leaderboard</h3>
              <span className="badge badge-green" style={{ fontSize: '0.6rem' }}>Live</span>
            </div>
            <Leaderboard refreshTrigger={xp} currentUserFullName={fullName} />
          </div>
        </div>
      </div>
    </AppShell>
  );
};

export default PracticePage;
