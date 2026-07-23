// src/components/CampusClashPage.tsx
import React, { useState, useEffect } from 'react';
import Leaderboard from './Leaderboard';

interface Props {
  xp: number;
  fullName: string;
  college: string;
}

const CampusClashPage: React.FC<Props> = ({ xp, fullName, college }) => {
  const [timeLeftStr, setTimeLeftStr] = useState('');

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

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Hero Campus Clash Banner */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.12) 0%, rgba(217, 119, 6, 0.12) 100%)',
        border: '1.5px solid #c7d2fe', borderRadius: 'var(--radius-lg)', padding: '1.75rem',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.25rem'
      }}>
        <div style={{ maxWidth: '520px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: 'var(--indigo-bg)', color: 'var(--indigo)', padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.6rem' }}>
            ⚔️ Official KTU Campus Cup
          </div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 900, color: 'var(--text)', lineHeight: 1.25, marginBottom: '0.5rem' }}>
            KTU Campus Clash League
          </h1>
          <p style={{ fontSize: '0.84rem', color: 'var(--muted)', lineHeight: 1.6 }}>
            Every week, engineering colleges compete for campus supremacy. Colleges are ranked by their <strong>Quality Rating</strong> (Average XP per student). Top colleges earn the 👑 Premier Crown and 🛡️ League Division Badges!
          </p>
        </div>

        {/* Sprint Countdown Box */}
        <div style={{
          background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
          padding: '1.25rem 1.5rem', textAlign: 'center', boxShadow: 'var(--shadow-sm)', flexShrink: 0, minWidth: '220px'
        }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', letterSpacing: '0.08em', marginBottom: '0.3rem' }}>
            WEEKLY SPRINT ENDS IN
          </div>
          <div style={{ fontSize: '1.35rem', fontWeight: 900, color: 'var(--indigo)', fontFamily: 'var(--mono)' }}>
            {timeLeftStr || 'Calculating...'}
          </div>
          <div style={{ fontSize: '0.68rem', color: 'var(--success)', fontWeight: 700, marginTop: '0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.2rem' }}>
            <span>🟢</span> Live Academic Standings
          </div>
        </div>
      </div>

      {/* Daily Hall of Fame / Coder of the Day */}
      <div className="card card-p" style={{ background: 'linear-gradient(135deg, rgba(254, 243, 199, 0.5) 0%, rgba(255, 251, 235, 0.9) 100%)', border: '1px solid #fde68a' }}>
        <div className="flex justify-between items-center" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'linear-gradient(135deg, #fef08a, #facc15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', boxShadow: '0 4px 12px rgba(234, 179, 8, 0.3)' }}>
              👑
            </div>
            <div>
              <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--gold)' }}>
                DAILY RECOGNITION • CODER OF THE DAY
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text)', margin: '0.1rem 0' }}>
                ⚡ KTU Campus Pioneer
              </h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--muted)', margin: 0 }}>
                Recognizing top active student solvers driving campus excellence today
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem' }}>
            <div style={{ padding: '0.4rem 0.8rem', background: 'var(--card)', borderRadius: 'var(--radius-sm)', border: '1px solid #fde68a', textAlign: 'center' }}>
              <div style={{ fontSize: '0.62rem', color: 'var(--muted)', fontWeight: 700 }}>FIRST BLOOD</div>
              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--gold)' }}>⚡ Daily Solver</div>
            </div>
            <div style={{ padding: '0.4rem 0.8rem', background: 'var(--card)', borderRadius: 'var(--radius-sm)', border: '1px solid #fde68a', textAlign: 'center' }}>
              <div style={{ fontSize: '0.62rem', color: 'var(--muted)', fontWeight: 700 }}>YOUR CAMPUS</div>
              <div style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--indigo)', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px', whiteSpace: 'nowrap' }}>
                {college || 'KTU Campus'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Division Ladder System Explainer */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
        <div className="card card-p-sm" style={{ borderLeft: '4px solid var(--gold)' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--gold)', marginBottom: '0.2rem' }}>
            👑 Premier League
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--muted)', lineHeight: 1.4 }}>
            Ranks 1 to 3 • Premier Campus Crown + Gold Trophy next to student names
          </div>
        </div>
        <div className="card card-p-sm" style={{ borderLeft: '4px solid var(--info)' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--info)', marginBottom: '0.2rem' }}>
            🥈 Division 1
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--muted)', lineHeight: 1.4 }}>
            Ranks 4 to 8 • Silver Shield + Top 2 promoted to Premier at weekly sprint end (⬆️)
          </div>
        </div>
        <div className="card card-p-sm" style={{ borderLeft: '4px solid var(--warning)' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 800, color: 'var(--warning)', marginBottom: '0.2rem' }}>
            🥉 Division 2
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--muted)', lineHeight: 1.4 }}>
            Ranks 9+ • Bronze Badge + Active Campus Contender
          </div>
        </div>
      </div>

      {/* College Standings Component */}
      <div className="card card-p">
        <div className="flex justify-between items-center mb-4" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text)' }}>
              🏢 Live College Division Standings
            </h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--muted)', margin: 0 }}>
              Rankings update live as students solve coding challenges
            </p>
          </div>
          <span className="badge badge-indigo">Quality Ranked</span>
        </div>

        <Leaderboard 
          initialViewMode="colleges" 
          refreshTrigger={xp} 
          currentUserFullName={fullName} 
          currentUserCollege={college} 
        />
      </div>

    </div>
  );
};

export default CampusClashPage;
