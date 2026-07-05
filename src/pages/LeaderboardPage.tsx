// src/pages/LeaderboardPage.tsx
import React, { useEffect, useState } from 'react';
import { useAuth } from '../components/AuthProvider';
import { supabase } from '../supabaseClient';
import AppShell from '../components/AppShell';
import Leaderboard from '../components/Leaderboard';

const LeaderboardPage: React.FC = () => {
  const { user } = useAuth();
  const [xp, setXp] = useState<number>(() => {
    return user ? parseInt(localStorage.getItem(`codcraft_xp_${user.id}`) || '0', 10) : 0;
  });
  const [fullName, setFullName] = useState<string>(() => {
    return user ? (localStorage.getItem(`codcraft_fullname_${user.id}`) || user.email?.split('@')[0] || '') : '';
  });

  useEffect(() => {
    if (!user) return;
    const fetchUserData = async () => {
      try {
        const [progRes, profRes] = await Promise.all([
          supabase.from('student_progress').select('score').eq('email', user.email).single(),
          supabase.from('student_profiles').select('full_name').eq('id', user.id).single(),
        ]);
        if (progRes.data) setXp(progRes.data.score ?? 0);
        if (profRes.data) setFullName(profRes.data.full_name || '');
      } catch (err) {
        setXp(parseInt(localStorage.getItem(`codcraft_xp_${user.id}`) || '0'));
      }
    };
    fetchUserData();
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
            <Leaderboard refreshTrigger={xp} currentUserFullName={fullName} maxHeight="650px" />
          </div>
        </div>
      </div>
    </AppShell>
  );
};

export default LeaderboardPage;
