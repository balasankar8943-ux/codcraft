// src/pages/CertificatesPage.tsx
import React, { useEffect, useState } from 'react';
import { useAuth } from '../components/AuthProvider';
import { supabase } from '../supabaseClient';
import AppShell from '../components/AppShell';
import CertificateGenerator from '../components/CertificateGenerator';

const CertificatesPage: React.FC = () => {
  const { user } = useAuth();
  const [xp, setXp] = useState(0);

  useEffect(() => {
    if (!user) return;
    supabase.from('student_progress').select('score').eq('email', user.email).single()
      .then(({ data }) => { if (data) setXp(data.score ?? 0); })
      .catch(() => { setXp(parseInt(localStorage.getItem(`codcraft_xp_${user.id}`) || '0')); });
  }, [user]);

  return (
    <AppShell xp={xp}>
      <div className="dashboard-layout" style={{ gridTemplateColumns: '1fr' }}>
        <div className="main-col">
          <CertificateGenerator xp={xp} />
        </div>
      </div>
    </AppShell>
  );
};

export default CertificatesPage;
