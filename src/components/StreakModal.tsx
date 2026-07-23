// src/components/StreakModal.tsx
import React from 'react';
import { Shield, Trophy, Calendar, X } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  streakCount: number;
  streakShields: number;
  solvedCount?: number;
}

const StreakModal: React.FC<Props> = ({
  isOpen,
  onClose,
  streakCount,
  streakShields,
  solvedCount = 0,
}) => {
  if (!isOpen) return null;

  // Calculate current multiplier
  const multiplier = streakCount >= 14 ? '2.0x' : streakCount >= 7 ? '1.5x' : streakCount >= 3 ? '1.2x' : '1.0x';

  // Days of week status simulation
  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const currentDayIdx = (new Date().getDay() + 6) % 7; // Mon = 0

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px', textAlign: 'left' }}>
        
        {/* Header */}
        <div className="flex justify-between items-center pb-3 mb-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center gap-2">
            <span style={{ fontSize: '1.5rem' }}>🔥</span>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text)', margin: 0 }}>
                Daily Coding Streak
              </h3>
              <p style={{ fontSize: '0.72rem', color: 'var(--muted)', margin: 0 }}>
                Solve 1 challenge daily to keep your momentum
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: '0.2rem' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Hero Streak Banner */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(217, 119, 6, 0.12) 0%, rgba(245, 158, 11, 0.06) 100%)',
          border: '1px solid #fde68a', borderRadius: 'var(--radius)', padding: '1.25rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem'
        }}>
          <div>
            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700, color: 'var(--gold)' }}>
              Current Streak
            </div>
            <div style={{ fontSize: '2.2rem', fontWeight: 900, color: 'var(--gold)', fontFamily: 'var(--mono)', lineHeight: 1.1 }}>
              {streakCount} {streakCount === 1 ? 'DAY' : 'DAYS'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text2)', marginTop: '0.2rem' }}>
              ⚡ <strong>{multiplier} XP Bonus Multiplier</strong> Active
            </div>
          </div>
          <div style={{ fontSize: '3rem', animation: 'pulse 2s infinite' }}>
            🔥
          </div>
        </div>

        {/* Weekly Activity Grid */}
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text2)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Calendar size={13} /> Weekly Activity
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '0.4rem' }}>
            {daysOfWeek.map((day, idx) => {
              const isToday = idx === currentDayIdx;
              const isPast = idx < currentDayIdx;
              const isDone = isPast || (isToday && streakCount > 0);

              return (
                <div 
                  key={day}
                  style={{
                    background: isDone ? 'var(--gold-bg)' : 'var(--bg)',
                    border: `1px solid ${isDone ? '#fde68a' : isToday ? 'var(--indigo)' : 'var(--border)'}`,
                    borderRadius: 'var(--radius-sm)',
                    padding: '0.5rem 0.25rem',
                    textAlign: 'center'
                  }}
                >
                  <div style={{ fontSize: '0.62rem', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase' }}>{day}</div>
                  <div style={{ fontSize: '1rem', marginTop: '0.2rem' }}>
                    {isDone ? '🔥' : isToday ? '⏳' : '⚪'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Streak Shield & Freeze Section */}
        <div style={{
          background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
          padding: '1rem', marginBottom: '1.25rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.82rem', color: 'var(--text)' }}>
              <Shield size={14} style={{ color: 'var(--indigo)' }} />
              <span>Streak Shields</span>
            </div>
            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--indigo)', fontFamily: 'var(--mono)' }}>
              🛡️ {streakShields} / 3 Available
            </span>
          </div>
          <p style={{ fontSize: '0.73rem', color: 'var(--muted)', lineHeight: 1.5, margin: 0 }}>
            Shields automatically freeze and protect your streak if you miss a day during exams. Earn <strong>+1 Shield</strong> for every 5 challenges solved!
          </p>
          <div style={{ marginTop: '0.6rem', fontSize: '0.7rem', color: 'var(--indigo)', fontWeight: 700 }}>
            Progress to next shield: {(solvedCount % 5)} / 5 Solved
          </div>
        </div>

        {/* Streak Multipliers Milestones */}
        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text2)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Trophy size={13} /> Streak Multipliers
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
          <div style={{ padding: '0.6rem', background: streakCount >= 3 ? 'var(--success-bg)' : 'var(--bg)', border: `1px solid ${streakCount >= 3 ? '#a7f3d0' : 'var(--border)'}`, borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--muted)', fontWeight: 700 }}>3 DAYS</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--success)' }}>1.2x XP</div>
          </div>
          <div style={{ padding: '0.6rem', background: streakCount >= 7 ? 'var(--gold-bg)' : 'var(--bg)', border: `1px solid ${streakCount >= 7 ? '#fde68a' : 'var(--border)'}`, borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--muted)', fontWeight: 700 }}>7 DAYS</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--gold)' }}>1.5x XP</div>
          </div>
          <div style={{ padding: '0.6rem', background: streakCount >= 14 ? 'var(--indigo-bg)' : 'var(--bg)', border: `1px solid ${streakCount >= 14 ? '#c7d2fe' : 'var(--border)'}`, borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--muted)', fontWeight: 700 }}>14 DAYS</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--indigo)' }}>2.0x XP</div>
          </div>
        </div>

        <button 
          onClick={onClose}
          className="btn btn-primary btn-full mt-4"
          style={{ padding: '0.65rem' }}
        >
          Keep Coding
        </button>

      </div>
    </div>
  );
};

export default StreakModal;
