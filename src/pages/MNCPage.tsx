// src/pages/MNCPage.tsx
import React, { useEffect, useState } from 'react';
import { useAuth } from '../components/AuthProvider';
import { supabase } from '../supabaseClient';
import AppShell from '../components/AppShell';
import MNCSection from '../components/MNCSection';

const MNCPage: React.FC = () => {
  const { user } = useAuth();
  const [xp, setXp] = useState(0);

  useEffect(() => {
    if (!user) return;
    supabase.from('student_progress').select('score').eq('email', user.email).single()
      .then(({ data }) => { if (data) setXp(data.score ?? 0); })
      .catch(() => { setXp(parseInt(localStorage.getItem(`codcraft_xp_${user.id}`) || '0')); });
  }, [user]);

  const handleAnswerRewarded = async () => {
    if (!user) return;
    supabase.from('student_progress').select('score').eq('email', user.email).single()
      .then(({ data }) => { if (data) setXp(data.score ?? 0); }).catch(() => {});
  };

  return (
    <AppShell xp={xp}>
      <div className="dashboard-layout" style={{ gridTemplateColumns: '1fr' }}>
        <div className="main-col">
          <div style={{ marginBottom: '1.5rem' }}>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              🏢 MNC Preparation Hub
            </h1>
            <p style={{ fontSize: '0.82rem', color: 'var(--muted)', marginTop: '0.35rem', lineHeight: 1.6 }}>
              Curated coding problems from top MNC recruiters — Google, Amazon, TCS, Infosys & more. Master these patterns to crack campus placements.
            </p>
          </div>
          <MNCSection onAnswered={handleAnswerRewarded} />
        </div>
      </div>
    </AppShell>
  );
};

export default MNCPage;
