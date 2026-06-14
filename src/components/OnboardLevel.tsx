// src/components/OnboardLevel.tsx
import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from './AuthProvider';
import DiagnosticQuiz from './DiagnosticQuiz';

type Props = {
  onClose: () => void;
  onSaved?: (level: string) => void;
};

const OnboardLevel: React.FC<Props> = ({ onClose, onSaved }) => {
  const { user } = useAuth();
  const [step, setStep] = useState<'quiz' | 'result'>('quiz');
  const [assignedLevel, setAssignedLevel] = useState<string>('beginner');
  const [score, setScore] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleQuizCompleted = async (level: string, finalScore: number) => {
    setAssignedLevel(level);
    setScore(finalScore);
    setStep('result');
  };

  const saveLevel = async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const { error: dbError } = await supabase
        .from('student_profiles')
        .update({ level: assignedLevel })
        .eq('id', user.id);

      if (dbError) throw dbError;

      const { error: progError } = await supabase
        .from('student_progress')
        .update({ level: assignedLevel })
        .eq('email', user.email);

      if (progError) throw progError;
      
      localStorage.setItem(`codcraft_level_${user.id}`, assignedLevel);
      localStorage.setItem(`codcraft_diagnostic_completed_${user.id}`, 'true');
      localStorage.setItem(`codcraft_xp_${user.id}`, '0');
      
      if (onSaved) onSaved(assignedLevel);
      onClose();
    } catch (err: any) {
      console.warn("Supabase update failed, using localStorage fallback:", err);
      localStorage.setItem(`codcraft_level_${user.id}`, assignedLevel);
      localStorage.setItem(`codcraft_diagnostic_completed_${user.id}`, 'true');
      
      setError(
        "Could not sync with cloud database. We've saved your track preference locally so you can continue practicing!"
      );
      
      setTimeout(() => {
        if (onSaved) onSaved(assignedLevel);
        onClose();
      }, 3000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-box modal-box-lg overflow-hidden">
        
        {/* Subtle decorative glow circles */}
        <div style={{ position: 'absolute', top: 0, right: 0, width: '120px', height: '120px', background: 'rgba(79,70,229,0.04)', borderRadius: '50%', filter: 'blur(30px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, width: '120px', height: '120px', background: 'rgba(245,158,11,0.03)', borderRadius: '50%', filter: 'blur(30px)', pointerEvents: 'none' }} />

        {step === 'quiz' ? (
          <DiagnosticQuiz onCompleted={handleQuizCompleted} />
        ) : (
          <div className="text-center" style={{ padding: '1rem 0' }}>
            <div className="animate-bounce" style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🎉</div>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text)', marginBottom: '0.5rem' }}>
              Assessment Complete!
            </h2>
            
            <div style={{ padding: '1.25rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', margin: '1.5rem auto', inlineSize: 'fit-content', minWidth: '220px' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--muted)', display: 'block', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.06em' }}>YOUR SCORE</span>
              <span className="font-mono" style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--text)', display: 'block', margin: '0.3rem 0', lineHeight: 1.1 }}>
                {score} / 8
              </span>
              <span className="text-xs" style={{ color: 'var(--muted2)', display: 'block' }}>
                ({Math.round((score / 8) * 100)}% Accuracy)
              </span>
            </div>

            <div style={{ marginBottom: '1.75rem', maxWidth: '400px', marginInline: 'auto' }}>
              <p style={{ color: 'var(--text2)', fontSize: '0.88rem', marginBottom: '0.75rem' }}>
                Based on your diagnostic result, we've assigned you to the:
              </p>
              <div className="flex justify-center" style={{ margin: '0.5rem 0' }}>
                <span className={`badge ${
                  assignedLevel === 'pro' 
                    ? 'badge-gold' 
                    : assignedLevel === 'mid' 
                    ? 'badge-blue' 
                    : 'badge-green'
                }`} style={{ fontSize: '0.8rem', padding: '0.45rem 1.1rem' }}>
                  {assignedLevel === 'pro' ? 'Advanced' : assignedLevel === 'mid' ? 'Intermediate' : 'Beginner'} Track
                </span>
              </div>
              <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: '0.75rem', fontStyle: 'italic', lineHeight: 1.5 }}>
                {assignedLevel === 'pro' 
                  ? 'Ready for Graphs, Dynamic Programming, and System Design.' 
                  : assignedLevel === 'mid' 
                  ? 'Covers data structures, recursion, complexity estimation, and sorting.' 
                  : 'Focuses on core programming syntax, conditionals, and logic loops.'}
              </p>
            </div>

            {error && (
              <div className="alert alert-error" style={{ maxWidth: '400px', marginInline: 'auto', textAlign: 'left' }}>
                <span>⚠️</span>
                <p style={{ margin: 0 }}>{error}</p>
              </div>
            )}

            <button
              className="btn btn-primary"
              style={{ width: '100%', maxWidth: '280px', padding: '0.75rem 1.5rem' }}
              onClick={saveLevel}
              disabled={loading}
            >
              {loading ? 'Entering Arena...' : 'Go to Dashboard'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default OnboardLevel;
