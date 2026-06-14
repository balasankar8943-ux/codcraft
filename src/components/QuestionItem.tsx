// src/components/QuestionItem.tsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from './AuthProvider';
import CodeSandbox from './CodeSandbox';

type Question = {
  id: number;
  title: string;
  level: string;
  category: string;
  company?: string;
  content: string;
  templates: Record<string, string>;
  testCases: Array<{ input: string; output: string }>;
  xp_reward: number;
};

type Props = {
  question: Question;
  onAnswered: (xpChange: number, questionId: number) => void; // callback to refresh XP/level on parent
};

const QuestionItem: React.FC<Props> = ({ question, onAnswered }) => {
  const { user } = useAuth();
  const [isSolved, setIsSolved] = useState(false);
  const [isSelected, setIsSelected] = useState(false);

  // Check if this question is already solved by the user
  useEffect(() => {
    const checkSolved = async () => {
      if (!user) return;
      
      const locallySolved = localStorage.getItem(`codcraft_solved_${user.id}_${question.id}`);
      if (locallySolved === 'true') {
        setIsSolved(true);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('student_progress')
          .select('solved_questions')
          .eq('email', user.email)
          .single();

        if (!error && data && Array.isArray(data.solved_questions)) {
          if (data.solved_questions.includes(question.id)) {
            setIsSolved(true);
            localStorage.setItem(`codcraft_solved_${user.id}_${question.id}`, 'true');
          }
        }
      } catch (err) {
        console.warn("Failed to query answer status from DB:", err);
      }
    };

    checkSolved();
  }, [user, question]);

  const handleSolved = (xpChange: number) => {
    if (xpChange > 0) {
      setIsSolved(true);
    }
    onAnswered(xpChange, question.id);
  };

  const getCompanyColor = (company?: string) => {
    switch (company?.toLowerCase()) {
      case 'google': return '#4285F4';
      case 'amazon': return '#FF9900';
      case 'microsoft': return '#F25022';
      case 'tcs': return '#3b82f6';
      case 'infosys': return '#007cc3';
      case 'wipro': return '#a855f7';
      default: return 'var(--indigo)';
    }
  };

  return (
    <div id={`challenge-${question.id}`} className="card card-p mb-4">
      <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-sm font-bold uppercase tracking-wider font-mono" style={{ color: 'var(--text)' }}>
            Challenge #{question.id}: {question.title}
          </h3>
          {question.company && (
            <span className="company-badge" style={{
              borderColor: getCompanyColor(question.company),
              color: getCompanyColor(question.company),
              background: 'var(--bg2)',
              fontSize: '10px',
              padding: '0.15rem 0.5rem'
            }}>
              🏢 {question.company}
            </span>
          )}
          {question.level && (
            <span className={`badge badge-${question.level}`} style={{ fontSize: '10px' }}>
              {question.level}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {isSolved && (
            <span className="badge badge-green" style={{ fontSize: '10px' }}>
              ✓ Solved
            </span>
          )}
          <span className="badge badge-gold" style={{ fontSize: '10px' }}>
            +{question.xp_reward} XP
          </span>
        </div>
      </div>

      {/* Mounting the Monaco Editor and Sandbox Runner */}
      <div style={{ display: isSelected ? 'block' : 'none' }}>
        <CodeSandbox question={question as any} onSolved={handleSolved} isActive={isSelected} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.75rem' }}>
          <button 
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setIsSelected(false)}
            style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem', fontWeight: 600 }}
          >
            🔒 Pause Workbench & Hide
          </button>
        </div>
      </div>

      {!isSelected && (
        <div style={{ 
          padding: '1.25rem', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'center', 
          background: 'var(--bg)', 
          border: '1px dashed var(--border2)', 
          borderRadius: 'var(--radius-sm)', 
          textAlign: 'center', 
          gap: '0.75rem',
          marginTop: '0.5rem'
        }}>
          <p style={{ fontSize: '0.8rem', color: 'var(--muted)', margin: 0, maxWidth: '380px', lineHeight: 1.5 }}>
            {isSolved 
              ? "You have already completed this challenge! You can reopen the workbench to review or optimize your solution." 
              : "Ready to solve this challenge? Select it to activate the workbench and start the countdown timer."}
          </p>
          <button
            type="button"
            className={`btn ${isSolved ? 'btn-outline' : 'btn-primary'} btn-sm`}
            onClick={() => setIsSelected(true)}
            style={{ fontWeight: 700, padding: '0.45rem 1.5rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}
          >
            {isSolved ? 'Review Workbench' : 'Select this question'}
          </button>
        </div>
      )}
    </div>
  );
};

export default QuestionItem;
