// src/components/Leaderboard.tsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from './AuthProvider';

type UserScore = {
  id: string;
  name: string;
  college: string | null;
  xp: number;
  level: string;
  isCurrentUser?: boolean;
};

interface Props {
  refreshTrigger?: number; // Hooked up to parent XP state to trigger reactive updates
  currentUserFullName?: string | null;
  maxHeight?: string;
  limit?: number;
}

const Leaderboard: React.FC<Props> = ({ refreshTrigger, currentUserFullName, maxHeight = '450px', limit = 1000 }) => {
  const { user } = useAuth();
  const [scores, setScores] = useState<UserScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'beginner' | 'mid' | 'pro'>('all');
  const isSandbox = user?.id === 'sandbox_user_id';

  useEffect(() => {
    const fetchScores = async () => {
      setLoading(true);
      setError(null);

      // Sandbox/local users have no real Supabase JWT — skip the RPC call
      if (isSandbox) {
        setScores([]);
        setError(null);
        setLoading(false);
        return;
      }

      try {
        const { data, error: dbError } = await supabase
          .rpc('get_codcraft_leaderboard', { result_limit: limit });
          
        if (dbError) throw dbError;
        
        let processedData = (data as any[]).map((u, idx) => {
          let lvl = 'beginner';
          if (u.score >= 300) lvl = 'pro';
          else if (u.score >= 100) lvl = 'mid';

          return {
            id: `${u.student_name}-${idx}`,
            name: u.student_name,
            college: u.college,
            xp: u.score ?? 0,
            level: lvl,
            isCurrentUser: currentUserFullName ? u.student_name === currentUserFullName : false
          };
        });

        if (filter !== 'all') {
          processedData = processedData.filter(s => s.level === filter);
        }

        setScores(processedData);
        setLoading(false);
      } catch (err: any) {
        console.error("Failed to fetch leaderboard from Supabase:", err);
        setError("Leaderboard is currently unavailable. Please try again later.");
        setScores([]);
        setLoading(false);
      }
    };

    fetchScores();
  }, [user, refreshTrigger, filter, currentUserFullName, isSandbox]);

  const formatStudentName = (name: string, college: string | null) => {
    if (college && college !== 'Kerala Engineering Student') {
      const displayCollege = college.length > 30 ? college.slice(0, 27) + '...' : college;
      return `${name} (${displayCollege})`;
    }
    return name;
  };

  const filterBtnStyle = (active: boolean, color?: string): React.CSSProperties => ({
    flex: 1, padding: '0.4rem 0.5rem', borderRadius: '6px', border: 'none',
    background: active ? (color || 'var(--indigo)') : 'transparent',
    color: active ? '#fff' : 'var(--muted)', fontFamily: 'var(--font)',
    fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s',
    textTransform: 'uppercase', letterSpacing: '0.06em',
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      
      {/* Filter Tabs */}
      <div style={{ display:'flex', gap:'0.25rem', background:'var(--bg)', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', padding:'0.25rem' }}>
        <button style={filterBtnStyle(filter==='all')} onClick={() => setFilter('all')}>All</button>
        <button style={filterBtnStyle(filter==='beginner','#059669')} onClick={() => setFilter('beginner')}>Beginner</button>
        <button style={filterBtnStyle(filter==='mid','#2563eb')} onClick={() => setFilter('mid')}>Mid</button>
        <button style={filterBtnStyle(filter==='pro','#d97706')} onClick={() => setFilter('pro')}>Pro</button>
      </div>

      {isSandbox ? (
        <div style={{ textAlign:'center', padding:'2rem 1rem' }}>
          <p style={{ fontSize:'0.85rem', color:'var(--muted)', marginBottom:'0.5rem' }}>🔒 Leaderboard requires Supabase authentication</p>
          <p style={{ fontSize:'0.72rem', color:'var(--muted2)', lineHeight:1.5 }}>Sign up with a real email and password to appear on the global leaderboard and compete with other students.</p>
        </div>
      ) : loading ? (
        <p style={{ textAlign:'center', fontSize:'0.8rem', color:'var(--muted)', padding:'1.5rem 0' }}>Loading ranks…</p>
      ) : error ? (
        <p style={{ textAlign:'center', fontSize:'0.8rem', color:'var(--danger)', padding:'1.5rem 0' }}>{error}</p>
      ) : scores.length === 0 ? (
        <p style={{ textAlign:'center', fontSize:'0.8rem', color:'var(--muted)', padding:'1.5rem 0' }}>No users in this tier yet.</p>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:'0.3rem', maxHeight, overflowY:'auto', paddingRight:'0.15rem' }}>
          {scores.map((s, idx) => {
            const rank = idx + 1;
            return (
              <div key={s.id} className={`lb-row${s.isCurrentUser ? ' me' : ''}`}>
                <div className={`lb-rank ${rank===1?'rank-1':rank===2?'rank-2':rank===3?'rank-3':'rank-n'}`}>
                  {rank===1 ? '👑' : rank===2 ? '🥈' : rank===3 ? '🥉' : rank}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:'0.82rem', fontWeight:600, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {formatStudentName(s.name, s.college)}
                    {s.isCurrentUser && <span style={{ marginLeft:'0.4rem', fontSize:'0.65rem', color:'var(--gold2)', fontWeight:700 }}>YOU</span>}
                  </div>
                </div>
                <span className={`badge ${s.level==='pro'?'badge-gold':s.level==='mid'?'badge-blue':'badge-green'}`} style={{ fontSize:'0.62rem' }}>
                  {s.level==='pro'?'Pro':s.level==='mid'?'Mid':'Beg'}
                </span>
                <span style={{ fontFamily:'var(--mono)', fontWeight:900, fontSize:'0.85rem', color:s.isCurrentUser?'var(--indigo)':'var(--text)', minWidth:'2.5rem', textAlign:'right' }}>
                  {s.xp}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
