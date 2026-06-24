// src/pages/LeaderboardPage.tsx
import React, { useEffect, useState } from 'react';
import { useAuth } from '../components/AuthProvider';
import { supabase } from '../supabaseClient';
import AppShell from '../components/AppShell';
import Leaderboard from '../components/Leaderboard';

const LeaderboardPage: React.FC = () => {
  const { user } = useAuth();
  const [xp, setXp] = useState(0);
  const [fullName, setFullName] = useState('');

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from('student_progress').select('score').eq('email', user.email).single(),
      supabase.from('student_profiles').select('full_name').eq('id', user.id).single(),
    ]).then(([prog, prof]) => {
      if (prog.data) setXp(prog.data.score ?? 0);
      if (prof.data) setFullName(prof.data.full_name || '');
    }).catch(() => {
      setXp(parseInt(localStorage.getItem(`codcraft_xp_${user.id}`) || '0'));
    });
  }, [user]);

  return (
    <AppShell xp={xp}>
      <div className="dashboard-layout" style={{ gridTemplateColumns: '1fr', maxWidth: '860px' }}>
        <div className="main-col">
          <div className="card card-p leaderboard-page-wrap">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text)', margin: 0 }}>
                  🏆 Global Leaderboard
                </h1>
                <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginTop: '0.25rem' }}>
                  Rankings update in real-time as students solve challenges.
                </p>
              </div>
              <span className="badge badge-green">Live Updates</span>
            </div>
            <Leaderboard refreshTrigger={xp} currentUserFullName={fullName} />
          </div>
        </div>
      </div>
    </AppShell>
  );
};

export default LeaderboardPage;
