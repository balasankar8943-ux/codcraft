// src/components/QuestionItem.tsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from './AuthProvider';

type Question = {
  id: number;
  level: string;
  category: string;
  content: string;
  answer: string;
  xp_reward: number;
};

type Props = {
  question: Question;
  onAnswered: () => void; // callback to refresh XP/level on parent
};

const QuestionItem: React.FC<Props> = ({ question, onAnswered }) => {
  const { user } = useAuth();
  const [userAnswer, setUserAnswer] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [isSolved, setIsSolved] = useState(false);

  // Check if this question is already solved by the user
  useEffect(() => {
    const checkSolved = async () => {
      if (!user) return;
      
      // Check local storage first (for sandbox mode or fast caching)
      const locallySolved = localStorage.getItem(`codcraft_solved_${user.id}_${question.id}`);
      if (locallySolved === 'true') {
        setIsSolved(true);
        setUserAnswer(question.answer); // Pre-fill with correct answer
        return;
      }

      // Check Supabase answers table
      try {
        const { data, error } = await supabase
          .from('answers')
          .select('is_correct')
          .eq('user_id', user.id)
          .eq('question_id', question.id)
          .eq('is_correct', true)
          .limit(1);

        if (!error && data && data.length > 0) {
          setIsSolved(true);
          setUserAnswer(question.answer);
          localStorage.setItem(`codcraft_solved_${user.id}_${question.id}`, 'true');
        }
      } catch (err) {
        console.warn("Failed to query answer status from DB:", err);
      }
    };

    checkSolved();
  }, [user, question]);

  const submitAnswer = async () => {
    if (!user || isSolved) return;
    setSubmitting(true);
    setFeedback(null);

    // Normalize strings for flexible matching (ignore spaces, casing, and quote type differences)
    const normalize = (str: string) => {
      return str
        .trim()
        .toLowerCase()
        .replace(/['"]/g, '"') // unify single and double quotes
        .replace(/\s+/g, ' '); // collapse duplicate spaces
    };

    const isCorrect = normalize(userAnswer) === normalize(question.answer);

    try {
      // 1. Log submission to Supabase 'answers' table
      const { error: logError } = await supabase.from('answers').insert({
        user_id: user.id,
        question_id: question.id,
        is_correct: isCorrect,
      });

      if (logError) throw logError;

      if (isCorrect) {
        // Mark as solved
        setIsSolved(true);
        localStorage.setItem(`codcraft_solved_${user.id}_${question.id}`, 'true');
        
        // Trigger XP rewards parent handler
        onAnswered();
        setFeedback({
          type: 'success',
          message: `Correct! +${question.xp_reward} XP awarded. Keep up the great work! ✨`
        });
      } else {
        setFeedback({
          type: 'error',
          message: "Incorrect answer. Check your syntax and try again!"
        });
      }
    } catch (err: any) {
      console.warn("Supabase log failed, running in sandbox/local fallback mode:", err.message);
      
      // Sandbox mode / fallback execution
      if (isCorrect) {
        setIsSolved(true);
        localStorage.setItem(`codcraft_solved_${user.id}_${question.id}`, 'true');
        onAnswered(); // Local handler will update XP via localStorage
        setFeedback({
          type: 'success',
          message: `Correct! (Sandbox Save) +${question.xp_reward} XP awarded. ✨`
        });
      } else {
        setFeedback({
          type: 'error',
          message: "Incorrect answer. Check your syntax and try again!"
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="glass-card" style={{
      marginBottom: '1.25rem',
      padding: '1.75rem',
      borderLeft: isSolved ? '4px solid var(--success)' : '1px solid var(--card-border)'
    }}>
      {/* Question Header Info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <span style={{
          fontSize: '0.8rem',
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: 'var(--primary-light)'
        }}>
          Question {question.id}
        </span>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {isSolved && (
            <span className="badge badge-beginner" style={{ fontSize: '0.75rem' }}>
              ✓ Solved
            </span>
          )}
          <span className="badge" style={{
            background: 'rgba(255, 255, 255, 0.05)',
            color: '#fff',
            fontSize: '0.75rem',
            border: '1px solid rgba(255,255,255,0.08)'
          }}>
            +{question.xp_reward} XP
          </span>
        </div>
      </div>

      {/* Question Text */}
      <p style={{
        fontSize: '1.05rem',
        fontWeight: '500',
        marginBottom: '1.25rem',
        color: '#fff',
        lineHeight: '1.5',
        textAlign: 'left'
      }}>
        {question.content}
      </p>

      {/* Answer Inputs */}
      <div style={{ position: 'relative', width: '100%' }}>
        <textarea
          className="input code-editor-area"
          rows={3}
          placeholder="// Type your answer here..."
          value={userAnswer}
          onChange={e => setUserAnswer(e.target.value)}
          disabled={submitting || isSolved}
          style={{
            width: '100%',
            padding: '1rem',
            marginBottom: '1rem',
            border: feedback?.type === 'error' ? '1px solid var(--danger)' : '1px solid rgba(255,255,255,0.1)',
            opacity: isSolved ? 0.85 : 1
          }}
        />
      </div>

      {/* Button & Feedback rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {!isSolved && (
          <button
            className="btn"
            onClick={submitAnswer}
            disabled={submitting || !userAnswer.trim()}
            style={{ alignSelf: 'flex-start', minWidth: '120px' }}
          >
            {submitting ? 'Verifying...' : 'Submit Answer'}
          </button>
        )}

        {feedback && (
          <div className={feedback.type === 'success' ? 'toast-success' : 'toast-error'} style={{ marginTop: '0.5rem' }}>
            <span>{feedback.type === 'success' ? '🎉' : '❌'}</span>
            <p style={{ fontSize: '0.9rem', margin: 0, fontWeight: '500' }}>{feedback.message}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestionItem;
