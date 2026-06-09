// src/components/OnboardLevel.tsx
import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from './AuthProvider';

type Props = {
  onClose: () => void;
  onSaved?: (level: string) => void;
};

const OnboardLevel: React.FC<Props> = ({ onClose, onSaved }) => {
  const { user } = useAuth();
  const [selected, setSelected] = useState<string>('beginner');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveLevel = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      // Attempt to update level in Supabase
      const { error: dbError } = await supabase
        .from('users')
        .update({ level: selected })
        .eq('id', user.id);

      if (dbError) {
        throw new Error(dbError.message);
      }
      
      // Save locally to localStorage as a robust fallback
      localStorage.setItem(`codcraft_level_${user.id}`, selected);
      
      if (onSaved) onSaved(selected);
      onClose();
    } catch (err: any) {
      console.warn("Supabase update failed, using localStorage fallback:", err);
      // Fallback: save to local storage and alert user they can run the SQL script
      localStorage.setItem(`codcraft_level_${user.id}`, selected);
      
      setError(
        "Could not save to Supabase (Database tables might not be set up yet). " +
        "We've saved your choice locally so you can continue exploring the app!"
      );
      
      // Let them close the modal after 3 seconds even if DB fails, to prevent blocking
      setTimeout(() => {
        if (onSaved) onSaved(selected);
        onClose();
      }, 3500);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content glass-card" style={{ maxWidth: '650px' }}>
        <h2 style={{ fontSize: '1.8rem', marginBottom: '0.5rem', textAlign: 'center' }}>
          Assess Your Coding Level
        </h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', textAlign: 'center' }}>
          Select your current coding level. We will tailer your practice questions and trajectory based on this.
        </p>

        {error && (
          <div className="toast-error" style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
            <span>ℹ️</span>
            <p style={{ fontSize: '0.85rem', margin: 0 }}>{error}</p>
          </div>
        )}

        <div className="onboard-grid">
          {/* Beginner Card */}
          <div
            className={`glass-card onboard-card ${selected === 'beginner' ? 'selected' : ''}`}
            onClick={() => setSelected('beginner')}
            style={{ padding: '1.5rem' }}
          >
            <div className="level-icon" style={{ color: '#10b981' }}>🌱</div>
            <h3 style={{ fontSize: '1.15rem', marginBottom: '0.25rem' }}>Beginner</h3>
            <span className="badge badge-beginner" style={{ alignSelf: 'flex-start', fontSize: '0.7rem', padding: '0.1rem 0.4rem' }}>Basics</span>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
              Perfect if you're starting fresh. Covers loops, conditions, variables, and elementary coding logic.
            </p>
          </div>

          {/* Mid Card */}
          <div
            className={`glass-card onboard-card ${selected === 'mid' ? 'selected' : ''}`}
            onClick={() => setSelected('mid')}
            style={{ padding: '1.5rem' }}
          >
            <div className="level-icon" style={{ color: '#3b82f6' }}>⚡</div>
            <h3 style={{ fontSize: '1.15rem', marginBottom: '0.25rem' }}>Mid Knowledge</h3>
            <span className="badge badge-mid" style={{ alignSelf: 'flex-start', fontSize: '0.7rem', padding: '0.1rem 0.4rem' }}>Intermediate</span>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
              Familiar with functions, OOP, string/array manipulations, and basic algorithm designs.
            </p>
          </div>

          {/* Pro Card */}
          <div
            className={`glass-card onboard-card ${selected === 'pro' ? 'selected' : ''}`}
            onClick={() => setSelected('pro')}
            style={{ padding: '1.5rem' }}
          >
            <div className="level-icon" style={{ color: '#fbbf24' }}>🔥</div>
            <h3 style={{ fontSize: '1.15rem', marginBottom: '0.25rem' }}>Pro Knowledge</h3>
            <span className="badge badge-pro" style={{ alignSelf: 'flex-start', fontSize: '0.7rem', padding: '0.1rem 0.4rem' }}>Advanced</span>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
              Confident with recursion, optimization, systems design, and complex interview coding tasks.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '1rem' }}>
          <button
            className="btn"
            onClick={saveLevel}
            disabled={loading}
            style={{ minWidth: '160px' }}
          >
            {loading ? 'Saving...' : 'Confirm Level'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OnboardLevel;
