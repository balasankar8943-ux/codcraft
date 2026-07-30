// src/pages/CompilerPage.tsx
import React, { useEffect, useState } from 'react';
import AppShell from '../components/AppShell';
import FreeCompilerPage from '../components/FreeCompilerPage';
import { useAuth } from '../components/AuthProvider';
import { supabase } from '../supabaseClient';

const CompilerPage: React.FC = () => {
  const { user } = useAuth();
  const [xp, setXp] = useState<number>(0);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('student_progress')
      .select('score')
      .eq('email', user.email)
      .single()
      .then(({ data }) => {
        if (data?.score) setXp(data.score);
      }, () => {});
  }, [user]);

  return (
    <AppShell xp={xp}>
      <FreeCompilerPage />
    </AppShell>
  );
};

export default CompilerPage;
