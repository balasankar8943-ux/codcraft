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

type CollegeScore = {
  college: string;
  studentCount: number;
  totalXP: number;
  qualityRating: number;
  isCurrentUserCollege?: boolean;
};

interface Props {
  refreshTrigger?: number; // Hooked up to parent XP state to trigger reactive updates
  currentUserFullName?: string | null;
  currentUserCollege?: string | null;
  maxHeight?: string;
  limit?: number;
  initialViewMode?: 'students' | 'colleges';
}

const Leaderboard: React.FC<Props> = ({ 
  refreshTrigger, 
  currentUserFullName, 
  currentUserCollege,
  maxHeight = '450px', 
  limit = 1000,
  initialViewMode = 'students'
}) => {
  const { user } = useAuth();

  const [scores, setScores] = useState<UserScore[]>([]);
  const [collegeScores, setCollegeScores] = useState<CollegeScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'students' | 'colleges'>(initialViewMode);
  const [filter, setFilter] = useState<'all' | 'beginner' | 'mid' | 'pro'>('all');
  const [visibleCount, setVisibleCount] = useState(50);
  const isSandbox = user?.id === 'sandbox_user_id';

  useEffect(() => {
    setVisibleCount(50);
  }, [filter, scores, viewMode]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    if (target.scrollHeight - target.scrollTop <= target.clientHeight + 100) {
      setVisibleCount(prev => Math.min(prev + 50, viewMode === 'students' ? scores.length : collegeScores.length));
    }
  };

  useEffect(() => {
    const fetchScores = async () => {
      setLoading(true);
      setError(null);

      // Sandbox/local users have no real Supabase JWT — skip the RPC call
      if (isSandbox) {
        setScores([]);
        setCollegeScores([]);
        setError(null);
        setLoading(false);
        return;
      }

      try {
        const { data, error: dbError } = await supabase
          .rpc('get_codcraft_leaderboard', { result_limit: limit });
          
        if (dbError) throw dbError;
        


        // 1. Process Student Standings
        let processedStudents = (data as any[]).map((u, idx) => {
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
          processedStudents = processedStudents.filter(s => s.level === filter);
        }
        setScores(processedStudents);

        // 2. Process College Standings
        const collegeMap: Record<string, { college: string; count: number; totalXP: number }> = {};
        (data as any[]).forEach(u => {
          const rawCol = u.college?.trim();
          const col = rawCol && rawCol !== 'Kerala Engineering Student' ? rawCol : 'Kerala Engineering Student';
          if (!collegeMap[col]) {
            collegeMap[col] = { college: col, count: 0, totalXP: 0 };
          }
          collegeMap[col].count += 1;
          collegeMap[col].totalXP += u.score ?? 0;
        });

        const processedColleges = Object.values(collegeMap)
          .map(c => {
            const avgXP = c.count > 0 ? Math.round(c.totalXP / c.count) : 0;
            return {
              college: c.college,
              studentCount: c.count,
              totalXP: c.totalXP,
              qualityRating: avgXP,
              isCurrentUserCollege: currentUserCollege ? c.college.toLowerCase() === currentUserCollege.toLowerCase() : false
            };
          })
          .sort((a, b) => b.qualityRating !== a.qualityRating ? b.qualityRating - a.qualityRating : b.totalXP - a.totalXP);

        setCollegeScores(processedColleges);
        setLoading(false);
      } catch (err: any) {
        console.error("Failed to fetch leaderboard from Supabase:", err);
        setError("Leaderboard is currently unavailable. Please try again later.");
        setScores([]);
        setCollegeScores([]);
        setLoading(false);
      }
    };

    fetchScores();
  }, [user, refreshTrigger, filter, currentUserFullName, currentUserCollege, isSandbox]);

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

  const modeBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--border)',
    background: active ? 'var(--indigo)' : 'var(--bg2)',
    color: active ? '#fff' : 'var(--text2)', fontFamily: 'var(--font)',
    fontSize: '0.78rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s',
    flex: 1, textAlign: 'center'
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      
      {/* View Mode Toggle */}
      <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
        <button style={modeBtnStyle(viewMode === 'students')} onClick={() => setViewMode('students')}>
          👥 Student Standings
        </button>
        <button style={modeBtnStyle(viewMode === 'colleges')} onClick={() => setViewMode('colleges')}>
          🏢 College Standings
        </button>
      </div>

      {/* Filter Tabs (Only shown for Student Standings) */}
      {viewMode === 'students' && (
        <div style={{ display:'flex', gap:'0.25rem', background:'var(--bg)', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', padding:'0.25rem' }}>
          <button style={filterBtnStyle(filter==='all')} onClick={() => setFilter('all')}>All</button>
          <button style={filterBtnStyle(filter==='beginner','#059669')} onClick={() => setFilter('beginner')}>Beginner</button>
          <button style={filterBtnStyle(filter==='mid','#2563eb')} onClick={() => setFilter('mid')}>Mid</button>
          <button style={filterBtnStyle(filter==='pro','#d97706')} onClick={() => setFilter('pro')}>Pro</button>
        </div>
      )}

      {/* Weekly League Sprint Banner for Colleges */}
      {viewMode === 'colleges' && (
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'linear-gradient(135deg, rgba(99,102,241,0.08) 0%, rgba(245,158,11,0.08) 100%)',
          border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
          padding: '0.65rem 0.85rem', fontSize: '0.75rem', color: 'var(--text2)', flexWrap: 'wrap', gap: '0.4rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700 }}>
            <span>⚔️ <strong>KTU Campus Clash League</strong></span>
            <span className="badge badge-gold" style={{ fontSize: '0.6rem' }}>Weekly Sprint</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontFamily: 'var(--mono)', fontSize: '0.72rem', color: 'var(--indigo)', fontWeight: 700 }}>
            <span>⏱️ Sprint Ends:</span>
            <span>{(() => {
              const now = new Date();
              const day = now.getDay();
              const diff = (7 - day + 1) % 7 || 7;
              const nextMonday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff, 0, 0, 0);
              const totalSecs = Math.max(0, Math.floor((nextMonday.getTime() - now.getTime()) / 1000));
              const days = Math.floor(totalSecs / (3600 * 24));
              const hours = Math.floor((totalSecs % (3600 * 24)) / 3600);
              const mins = Math.floor((totalSecs % 3600) / 60);
              return `${days}d ${hours}h ${mins}m`;
            })()}</span>
          </div>
        </div>
      )}

      {isSandbox ? (
        <div style={{ textAlign:'center', padding:'2rem 1rem' }}>
          <p style={{ fontSize:'0.85rem', color:'var(--muted)', marginBottom:'0.5rem' }}>🔒 Leaderboard requires Supabase authentication</p>
          <p style={{ fontSize:'0.72rem', color:'var(--muted2)', lineHeight:1.5 }}>Sign up with a real email and password to appear on the global leaderboard and compete with other students.</p>
        </div>
      ) : loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          <style>{`
            @keyframes lbPulse {
              0%, 100% { opacity: 0.35; }
              50% { opacity: 0.65; }
            }
          `}</style>
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} style={{ height: '42px', background: 'var(--bg2)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', animation: 'lbPulse 1.5s infinite ease-in-out' }} />
          ))}
        </div>
      ) : error ? (
        <p style={{ textAlign:'center', fontSize:'0.8rem', color:'var(--danger)', padding:'1.5rem 0' }}>{error}</p>
      ) : (viewMode === 'students' ? scores.length === 0 : collegeScores.length === 0) ? (
        <p style={{ textAlign:'center', fontSize:'0.8rem', color:'var(--muted)', padding:'1.5rem 0' }}>No standings to display yet.</p>
      ) : (
        <div 
          onScroll={handleScroll}
          style={{ display:'flex', flexDirection:'column', gap:'0.3rem', maxHeight, overflowY:'auto', paddingRight:'0.15rem' }}
        >
          {viewMode === 'students' ? (
            // 👥 Render Students
            scores.slice(0, visibleCount).map((s, idx) => {
              const rank = idx + 1;
              return (
                <div key={s.id} className={`lb-row${s.isCurrentUser ? ' me' : ''}`}>
                  <div className={`lb-rank ${rank===1?'rank-1':rank===2?'rank-2':rank===3?'rank-3':'rank-n'}`}>
                    {rank===1 ? '👑' : rank===2 ? '🥈' : rank===3 ? '🥉' : rank}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:'0.82rem', fontWeight:600, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{formatStudentName(s.name, s.college)}</span>
                      {s.isCurrentUser && <span style={{ marginLeft:'0.2rem', fontSize:'0.65rem', color:'var(--gold2)', fontWeight:700, flexShrink: 0 }}>YOU</span>}
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
            })
          ) : (
            // 🏢 Render Colleges
            collegeScores.slice(0, visibleCount).map((c, idx) => {
              const rank = idx + 1;
              const leagueLabel = rank <= 3 ? '👑 Premier League' : rank <= 8 ? '🥈 Division 1' : '🥉 Division 2';
              const leagueBadgeClass = rank <= 3 ? 'badge-gold' : rank <= 8 ? 'badge-blue' : 'badge-amber';
              return (
                <div key={c.college} className={`lb-row${c.isCurrentUserCollege ? ' me' : ''}`}>
                  <div className={`lb-rank ${rank===1?'rank-1':rank===2?'rank-2':rank===3?'rank-3':'rank-n'}`}>
                    {rank===1 ? '👑' : rank===2 ? '🥈' : rank===3 ? '🥉' : rank}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:'0.82rem', fontWeight:600, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span>🏢 {c.college}</span>
                      <span className={`badge ${leagueBadgeClass}`} style={{ fontSize: '0.58rem', padding: '0.1rem 0.35rem', flexShrink: 0 }}>
                        {leagueLabel}
                      </span>
                      {c.isCurrentUserCollege && <span style={{ marginLeft:'0.2rem', fontSize:'0.65rem', color:'var(--gold2)', fontWeight:700, flexShrink: 0 }}>YOUR COLLEGE</span>}
                    </div>
                    <div style={{ fontSize:'0.68rem', color:'var(--muted)', display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      <span>👥 {c.studentCount} student{c.studentCount > 1 ? 's' : ''}</span>
                      <span style={{ color: 'var(--border)' }}>·</span>
                      <span style={{ color: 'var(--success)', fontWeight: 700 }}>⭐ Quality: {c.qualityRating} XP/student</span>
                    </div>
                  </div>
                  <span style={{ fontFamily:'var(--mono)', fontWeight:900, fontSize:'0.85rem', color:c.isCurrentUserCollege?'var(--indigo)':'var(--text)', minWidth:'4.5rem', textAlign:'right' }}>
                    {c.totalXP} XP
                  </span>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default Leaderboard;
