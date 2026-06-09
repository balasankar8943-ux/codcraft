// src/components/Leaderboard.tsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from './AuthProvider';

type UserScore = {
  id: string;
  email: string | null;
  xp: number;
  level: string;
  isCurrentUser?: boolean;
};

interface Props {
  refreshTrigger?: number; // Hooked up to parent XP state to trigger reactive updates
}

// Mock Kerala Engineering College students for fallback sandbox mode
const MOCK_LEADERBOARD_USERS = [
  { id: 'mock1', email: 'nandana.cet@cet.ac.in', xp: 520, level: 'pro' },
  { id: 'mock2', email: 'abhishek.tkm@tkm.ac.in', xp: 440, level: 'pro' },
  { id: 'mock3', email: 'fathima.mec@mec.ac.in', xp: 350, level: 'pro' },
  { id: 'mock4', email: 'arjun.gect@gect.ac.in', xp: 280, level: 'mid' },
  { id: 'mock5', email: 'devika.rit@rit.ac.in', xp: 190, level: 'mid' },
  { id: 'mock6', email: 'gokul.sct@sct.ac.in', xp: 120, level: 'mid' },
  { id: 'mock7', email: 'merin.jec@jec.ac.in', xp: 80, level: 'beginner' },
  { id: 'mock8', email: 'rohit.lbs@lbs.ac.in', xp: 45, level: 'beginner' },
];

const Leaderboard: React.FC<Props> = ({ refreshTrigger }) => {
  const { user } = useAuth();
  const [scores, setScores] = useState<UserScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFallback, setIsFallback] = useState(false);

  useEffect(() => {
    const fetchScores = async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('id, email, xp, level')
          .order('xp', { ascending: false })
          .limit(15);
          
        if (error) {
          throw error;
        }
        
        // Mark current user in list
        const processedData = (data as UserScore[]).map(u => ({
          ...u,
          isCurrentUser: user ? u.id === user.id : false
        }));

        // If DB is completely empty, trigger fallback to show something nice
        if (processedData.length <= 1 && user) {
          generateFallbackScores();
        } else {
          setScores(processedData);
          setIsFallback(false);
          setLoading(false);
        }
      } catch (err) {
        console.warn("Failed to fetch leaderboard from Supabase, rendering mock scoreboard:", err);
        generateFallbackScores();
      }
    };

    const generateFallbackScores = () => {
      setIsFallback(true);
      if (!user) {
        setScores(MOCK_LEADERBOARD_USERS);
        setLoading(false);
        return;
      }

      // Read current user statistics from local storage
      const localXp = parseInt(localStorage.getItem(`codcraft_xp_${user.id}`) || '0', 10);
      const localLevel = localStorage.getItem(`codcraft_level_${user.id}`) || 'beginner';
      
      const currentUserScore: UserScore = {
        id: user.id,
        email: user.email ?? null,
        xp: Math.max(localXp, refreshTrigger ?? 0),
        level: localLevel,
        isCurrentUser: true
      };

      // Combine mock users and current user, sorting by XP
      const combined = [...MOCK_LEADERBOARD_USERS, currentUserScore]
        .filter((v, i, a) => a.findIndex(t => t.id === v.id) === i) // unique IDs
        .sort((a, b) => b.xp - a.xp);

      setScores(combined);
      setLoading(false);
    };

    fetchScores();
  }, [user, refreshTrigger]);

  // Mask student email for clean visual design and privacy
  const formatStudentName = (emailStr: string | null) => {
    if (!emailStr) return 'Anon Student';
    const parts = emailStr.split('@');
    const prefix = parts[0];
    
    // Check if it's one of our mock users
    if (emailStr.includes('.cet') || emailStr.includes('.tkm') || emailStr.includes('.mec') || emailStr.includes('.gect') || emailStr.includes('.rit') || emailStr.includes('.sct') || emailStr.includes('.jec') || emailStr.includes('.lbs')) {
      const nameParts = prefix.split('.');
      const name = nameParts[0];
      const college = nameParts[1]?.toUpperCase() || 'KTU';
      return `${name.charAt(0).toUpperCase() + name.slice(1)} (${college})`;
    }

    if (prefix.length <= 4) {
      return prefix + '...';
    }
    
    // Show prefix truncated with college label or just simple format
    const nameDotPart = prefix.split('.')[0];
    return nameDotPart.charAt(0).toUpperCase() + nameDotPart.slice(1) + '...';
  };

  if (loading) return <p style={{ color: 'var(--text-secondary)' }}>Loading leaderboard ranks...</p>;

  return (
    <div>
      {isFallback && (
        <span style={{
          fontSize: '0.7rem',
          color: 'var(--warning)',
          background: 'rgba(245, 158, 11, 0.08)',
          border: '1px solid rgba(245, 158, 11, 0.15)',
          padding: '0.2rem 0.6rem',
          borderRadius: '4px',
          display: 'block',
          marginBottom: '1rem',
          textAlign: 'center'
        }}>
          💡 Showing Sandbox Leaderboard (Mock Competitors)
        </span>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th style={{ width: '60px', textAlign: 'center' }}>Rank</th>
              <th>Student</th>
              <th style={{ textAlign: 'center' }}>Level</th>
              <th style={{ textAlign: 'right' }}>XP</th>
            </tr>
          </thead>
          <tbody>
            {scores.map((s, idx) => {
              const rank = idx + 1;
              return (
                <tr
                  key={s.id}
                  style={{
                    background: s.isCurrentUser ? 'rgba(20, 184, 166, 0.06)' : 'transparent',
                    borderLeft: s.isCurrentUser ? '2px solid var(--primary)' : 'none'
                  }}
                >
                  <td style={{ textAlign: 'center', padding: '0.8rem 0.5rem' }}>
                    <span className={`rank-badge ${rank === 1 ? 'rank-1' : rank === 2 ? 'rank-2' : rank === 3 ? 'rank-3' : 'rank-other'}`}>
                      {rank === 1 ? '👑' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank}
                    </span>
                  </td>
                  <td style={{ fontWeight: s.isCurrentUser ? '700' : '500', padding: '0.8rem 0.5rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span>{formatStudentName(s.email)}</span>
                      {s.isCurrentUser && (
                        <span style={{ fontSize: '0.7rem', color: 'var(--primary-light)', fontWeight: 'normal' }}>
                          You
                        </span>
                      )}
                    </div>
                  </td>
                  <td style={{ textAlign: 'center', padding: '0.8rem 0.5rem' }}>
                    <span className={`badge badge-${s.level}`} style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem' }}>
                      {s.level}
                    </span>
                  </td>
                  <td style={{
                    textAlign: 'right',
                    fontWeight: '700',
                    color: rank <= 3 ? '#fff' : 'var(--text-secondary)',
                    padding: '0.8rem 0.5rem'
                  }}>
                    {s.xp}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Leaderboard;
