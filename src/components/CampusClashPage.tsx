// src/components/CampusClashPage.tsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Swords } from 'lucide-react';

interface Props {
  xp: number;
  fullName: string;
  college: string;
}

interface CampusTeam {
  id: string;
  teamName: string;
  college: string;
  studentCount: number;
  totalXP: number;
  qualityRating: number;
  wins: number;
  losses: number;
  isUserTeam: boolean;
  topStudent: string;
}

const CampusClashPage: React.FC<Props> = ({ xp, fullName, college }) => {
  const [timeLeftStr, setTimeLeftStr] = useState('');
  const [teams, setTeams] = useState<CampusTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [customTeamName, setCustomTeamName] = useState('');
  const [userTeamName, setUserTeamName] = useState('');
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);

  const userCollege = college && college !== 'Kerala Engineering Student' ? college : 'KTU Engineering Campus';

  // Live Sprint Countdown
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const day = now.getDay();
      const diff = (7 - day + 1) % 7 || 7;
      const nextMonday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff, 0, 0, 0);
      const totalSecs = Math.max(0, Math.floor((nextMonday.getTime() - now.getTime()) / 1000));
      const days = Math.floor(totalSecs / (3600 * 24));
      const hours = Math.floor((totalSecs % (3600 * 24)) / 3600);
      const mins = Math.floor((totalSecs % 3600) / 60);
      const secs = totalSecs % 60;
      setTimeLeftStr(`${days}d ${hours}h ${mins}m ${secs}s`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch campus team data and standings
  useEffect(() => {
    const fetchCampusClashData = async () => {
      setLoading(true);
      try {
        // Fetch raw leaderboard data exclusively for Campus Clash
        const { data, error } = await supabase.rpc('get_codcraft_leaderboard', { result_limit: 1000 });
        if (error) throw error;

        // Load custom team name override if user created one
        const savedCustomTeam = localStorage.getItem(`codcraft_campus_team_${userCollege}`);
        if (savedCustomTeam) {
          setUserTeamName(savedCustomTeam);
        } else {
          setUserTeamName(`${userCollege} Squad`);
        }

        // Group by college to build Campus Teams
        const campusMap: Record<string, { college: string; students: { name: string; score: number }[]; totalXP: number }> = {};

        (data as any[]).forEach(u => {
          const colName = u.college?.trim() && u.college !== 'Kerala Engineering Student' ? u.college : 'KTU Campus Team';
          if (!campusMap[colName]) {
            campusMap[colName] = { college: colName, students: [], totalXP: 0 };
          }
          campusMap[colName].students.push({ name: u.student_name, score: u.score ?? 0 });
          campusMap[colName].totalXP += u.score ?? 0;
        });

        // Convert to CampusTeam array
        const compiledTeams: CampusTeam[] = Object.values(campusMap).map((c, idx) => {
          const count = c.students.length;
          const avg = count > 0 ? Math.round(c.totalXP / count) : 0;
          const sortedStudents = c.students.sort((a, b) => b.score - a.score);
          const topScorer = sortedStudents[0]?.name || 'Anonymous Coder';
          const isMine = c.college.toLowerCase() === userCollege.toLowerCase();
          const tName = isMine && savedCustomTeam ? savedCustomTeam : `${c.college} Squad`;

          return {
            id: `team-${idx}`,
            teamName: tName,
            college: c.college,
            studentCount: count,
            totalXP: c.totalXP,
            qualityRating: avg,
            wins: Math.max(1, Math.floor(c.totalXP / 150)),
            losses: Math.max(0, Math.floor(count / 2)),
            isUserTeam: isMine,
            topStudent: topScorer
          };
        });

        // Sort teams by Quality Rating primary, totalXP secondary
        compiledTeams.sort((a, b) => b.qualityRating !== a.qualityRating ? b.qualityRating - a.qualityRating : b.totalXP - a.totalXP);
        setTeams(compiledTeams);
      } catch (err) {
        console.warn("Campus Clash fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchCampusClashData();
  }, [userCollege, xp]);

  const handleCreateOrRenameTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTeamName.trim()) return;
    const clean = customTeamName.trim();
    localStorage.setItem(`codcraft_campus_team_${userCollege}`, clean);
    setUserTeamName(clean);
    setTeams(prev => prev.map(t => t.isUserTeam ? { ...t, teamName: clean } : t));
    setShowCreateTeamModal(false);
  };

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Hero Campus Clash Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.15) 0%, rgba(217, 119, 6, 0.12) 100%)',
        border: '1.5px solid #c7d2fe', borderRadius: 'var(--radius-lg)', padding: '1.75rem',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.25rem'
      }}>
        <div style={{ maxWidth: '550px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'var(--indigo-bg)', color: 'var(--indigo)', padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.6rem' }}>
            ⚔️ Dedicated Inter-Campus Tournament
          </div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 900, color: 'var(--text)', lineHeight: 1.2, marginBottom: '0.5rem' }}>
            Campus Clash League
          </h1>
          <p style={{ fontSize: '0.84rem', color: 'var(--muted)', lineHeight: 1.6 }}>
            Form a campus squad with fellow students from your college! Compete in weekly inter-campus matches, earn team wins, and climb the exclusive Campus Clash Division Ladder.
          </p>
        </div>

        {/* Live Sprint Countdown Box */}
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
          padding: '1.25rem 1.5rem', textAlign: 'center', boxShadow: 'var(--shadow-sm)', flexShrink: 0, minWidth: '220px'
        }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.08em', marginBottom: '0.3rem' }}>
            WEEKLY SPRINT MATCH ENDS IN
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--indigo)', fontFamily: 'var(--mono)' }}>
            {timeLeftStr || 'Calculating...'}
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--success)', fontWeight: 700, marginTop: '0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.2rem' }}>
            <span>🟢</span> Live Team Standings
          </div>
        </div>
      </div>

      {/* My Campus Team Card & Customization */}
      <div className="card card-p" style={{ background: 'var(--card2)', border: '1.5px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--indigo)' }}>
              YOUR CAMPUS TEAM SQUAD
            </div>
            <h2 style={{ fontSize: '1.3rem', fontWeight: 900, color: 'var(--text)', margin: '0.2rem 0' }}>
              🛡️ {userTeamName || `${userCollege} Squad`}
            </h2>
            <div style={{ fontSize: '0.78rem', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <span>🏢 Campus: <strong>{userCollege}</strong></span>
              <span>•</span>
              <span>👤 Member: <strong>{fullName || 'You'}</strong></span>
            </div>
          </div>

          <button
            onClick={() => setShowCreateTeamModal(true)}
            className="btn btn-outline btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <Swords size={14} /> Name / Rename Campus Squad
          </button>
        </div>
      </div>

      {/* Live Campus Clash Match Results Banner */}
      <div style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.25rem' }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text)', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span>⚔️</span>
          <span>Recent Weekly Campus Clash Results</span>
          <span className="badge badge-gold" style={{ fontSize: '0.6rem' }}>Match Highlights</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.75rem' }}>
          {teams.length >= 2 ? (
            <>
              <div style={{ padding: '0.85rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '0.78rem' }}>
                <div style={{ fontSize: '0.65rem', color: 'var(--muted)', fontWeight: 700, marginBottom: '0.4rem' }}>MATCHUP #1 RESULTS</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700 }}>
                  <span>{teams[0]?.teamName || 'Campus Team A'}</span>
                  <span style={{ color: 'var(--success)' }}>VICTORY 🏆 (+{teams[0]?.qualityRating || 120} XP)</span>
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '0.2rem' }}>vs {teams[1]?.teamName || 'Campus Team B'}</div>
              </div>

              {teams.length >= 4 && (
                <div style={{ padding: '0.85rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '0.78rem' }}>
                  <div style={{ fontSize: '0.65rem', color: 'var(--muted)', fontWeight: 700, marginBottom: '0.4rem' }}>MATCHUP #2 RESULTS</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 700 }}>
                    <span>{teams[2]?.teamName || 'Campus Team C'}</span>
                    <span style={{ color: 'var(--success)' }}>VICTORY 🏆 (+{teams[2]?.qualityRating || 95} XP)</span>
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '0.2rem' }}>vs {teams[3]?.teamName || 'Campus Team D'}</div>
                </div>
              )}
            </>
          ) : (
            <div style={{ fontSize: '0.78rem', color: 'var(--muted)', padding: '0.5rem 0' }}>
              Gathering live campus squad results for the current weekly sprint...
            </div>
          )}
        </div>
      </div>

      {/* Exclusive Campus Clash Team Standings Table */}
      <div className="card card-p">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text)' }}>
              🏆 Campus Clash Team Leaderboard
            </h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--muted)', margin: 0 }}>
              Official Inter-Campus Squad Standings • Ranked by Campus Quality Rating (XP/Student)
            </p>
          </div>
          <span className="badge badge-indigo">Campus Clash Only</span>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--muted)', fontSize: '0.85rem' }}>
            Loading Campus Team Standings...
          </div>
        ) : teams.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--muted)', fontSize: '0.85rem' }}>
            No campus teams have entered the clash yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {teams.map((t, idx) => {
              const rank = idx + 1;
              const divisionLabel = rank <= 3 ? '👑 Premier League' : rank <= 8 ? '🥈 Division 1' : '🥉 Division 2';
              const divisionBadgeClass = rank <= 3 ? 'badge-gold' : rank <= 8 ? 'badge-blue' : 'badge-amber';

              return (
                <div 
                  key={t.id}
                  className={`lb-row${t.isUserTeam ? ' me' : ''}`}
                  style={{ padding: '0.75rem 0.85rem', borderRadius: 'var(--radius-sm)' }}
                >
                  <div className={`lb-rank ${rank===1?'rank-1':rank===2?'rank-2':rank===3?'rank-3':'rank-n'}`}>
                    {rank===1 ? '👑' : rank===2 ? '🥈' : rank===3 ? '🥉' : rank}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text)' }}>
                        🛡️ {t.teamName}
                      </span>
                      <span className={`badge ${divisionBadgeClass}`} style={{ fontSize: '0.58rem', padding: '0.1rem 0.35rem' }}>
                        {divisionLabel}
                      </span>
                      {t.isUserTeam && (
                        <span style={{ fontSize: '0.62rem', fontWeight: 800, color: 'var(--gold2)', background: 'var(--gold-bg)', border: '1px solid #fde68a', padding: '0.05rem 0.35rem', borderRadius: '10px' }}>
                          YOUR SQUAD
                        </span>
                      )}
                    </div>

                    <div style={{ fontSize: '0.7rem', color: 'var(--muted)', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.2rem' }}>
                      <span>🏢 {t.college}</span>
                      <span>•</span>
                      <span>👥 {t.studentCount} Member{t.studentCount > 1 ? 's' : ''}</span>
                      <span>•</span>
                      <span>⭐ Top Scorer: <strong>{t.topStudent}</strong></span>
                      <span>•</span>
                      <span style={{ color: 'var(--success)', fontWeight: 700 }}>Record: {t.wins}W - {t.losses}L</span>
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontFamily: 'var(--mono)', fontWeight: 900, fontSize: '0.9rem', color: t.isUserTeam ? 'var(--indigo)' : 'var(--text)' }}>
                      {t.totalXP} XP
                    </div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--success)', fontWeight: 700 }}>
                      ⭐ {t.qualityRating} XP/student
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal for Naming / Renaming Campus Squad */}
      {showCreateTeamModal && (
        <div className="modal-overlay" onClick={() => setShowCreateTeamModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px', textAlign: 'left' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text)', marginBottom: '0.4rem' }}>
              🛡️ Custom Campus Squad Name
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
              Enter a custom team squad name for your campus (<strong>{userCollege}</strong>). All students from your campus will compete under this squad!
            </p>

            <form onSubmit={handleCreateOrRenameTeam}>
              <div className="form-group">
                <label className="form-label">Squad Team Name</label>
                <input
                  type="text"
                  className="input"
                  placeholder={`e.g. ${userCollege} Cyber Titans`}
                  value={customTeamName}
                  onChange={e => setCustomTeamName(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '0.6rem', marginTop: '1.25rem' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowCreateTeamModal(false)} style={{ flex: 1 }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Save Squad Name
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default CampusClashPage;
