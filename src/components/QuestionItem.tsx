// src/components/QuestionItem.tsx
// Card shown in the question list. Clicking navigates to /question/:id
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from './AuthProvider';

type Question = {
  id: number; title: string; level: string; category: string;
  company?: string; content: string;
  templates: Record<string, string>;
  testCases: Array<{ input: string; output: string }>;
  xp_reward: number;
};

type Props = {
  question: Question;
  onAnswered: (xpChange: number, questionId: number) => void;
};

const companyColor = (company?: string) => {
  switch (company?.toLowerCase()) {
    case 'google':    return '#4285F4';
    case 'amazon':    return '#FF9900';
    case 'microsoft': return '#F25022';
    case 'tcs':       return '#3b82f6';
    case 'infosys':   return '#007cc3';
    case 'wipro':     return '#a855f7';
    default:          return 'var(--indigo)';
  }
};

const QuestionItem: React.FC<Props> = ({ question }) => {
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const [isSolved, setIsSolved] = useState(false);
  const [hasCode,  setHasCode]  = useState(false);

  useEffect(() => {
    if (!user) return;

    // Check solved status
    const locally = localStorage.getItem(`codcraft_solved_${user.id}_${question.id}`);
    if (locally === 'true') {
      setIsSolved(true);
    } else {
      const checkSolvedStatus = async () => {
        const { data } = await supabase.from('student_progress').select('solved_questions').eq('email', user.email).single();
        if (data?.solved_questions?.includes(question.id)) {
          setIsSolved(true);
          localStorage.setItem(`codcraft_solved_${user.id}_${question.id}`, 'true');
        }
      };
      checkSolvedStatus();
    }

    // Check if user has previously written any code for this question
    const langs = ['python', 'cpp', 'c', 'java'];
    const anyCode = langs.some(l => localStorage.getItem(`codcraft_code_${user.id}_${question.id}_${l}`));
    setHasCode(anyCode);
  }, [user, question.id]);

  const handleOpen = () => navigate(`/question/${question.id}`);

  return (
    <div id={`challenge-${question.id}`} className="question-card">
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', minWidth: 0 }}>
          <h3 style={{ fontSize: '0.88rem', fontWeight: 700, fontFamily: 'var(--mono)', color: 'var(--text)', margin: 0 }}>
            #{question.id}: {question.title}
          </h3>
          {question.company && (
            <span className="company-badge" style={{ borderColor: companyColor(question.company), color: companyColor(question.company), background: 'var(--bg2)', fontSize: '10px', padding: '0.15rem 0.5rem' }}>
              🏢 {question.company}
            </span>
          )}
          <span className={`badge badge-${question.level}`} style={{ fontSize: '10px' }}>{question.level}</span>
        </div>
        <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0, alignItems: 'center' }}>
          {isSolved && <span className="badge badge-green" style={{ fontSize: '10px' }}>✓ Solved</span>}
          {hasCode && !isSolved && <span className="badge" style={{ fontSize: '10px', background: 'var(--gold-bg)', color: 'var(--gold-text)', border: '1px solid var(--gold-border)' }}>📝 In Progress</span>}
          <span className="badge badge-gold" style={{ fontSize: '10px' }}>+{question.xp_reward} XP</span>
        </div>
      </div>

      {/* Preview of problem */}
      <p style={{ fontSize: '0.78rem', color: 'var(--muted)', lineHeight: 1.5, margin: '0.6rem 0 0', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {question.content}
      </p>

      {/* Open button */}
      <div style={{ marginTop: '0.85rem', display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={handleOpen}
          className={`btn btn-sm ${isSolved ? 'btn-outline' : 'btn-primary'}`}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, padding: '0.45rem 1.25rem' }}
        >
          {isSolved ? '🔍 Review Solution' : hasCode ? '▶ Continue Solving' : '▶ Solve Challenge'}
        </button>
      </div>
    </div>
  );
};

export default QuestionItem;
