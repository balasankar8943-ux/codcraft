// src/components/QuestionBank.tsx
import React, { useEffect, useState } from 'react';
import { useAuth } from './AuthProvider';
import { supabase } from '../supabaseClient';
import QuestionItem from './QuestionItem';
import questionsData from '../data/questions.json';

type Question = {
  id: number;
  level: string;
  category: string;
  content: string;
  answer: string;
  xp_reward: number;
};

interface Props {
  category?: string; // e.g. 'general' or 'mnc'
  level?: string;    // optional: passed from parent for instant reactivity
  onAnswered: (rewardXp: number) => void;
}

const QuestionBank: React.FC<Props> = ({ category = 'general', level: propLevel, onAnswered }) => {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentLevel, setCurrentLevel] = useState<string>(propLevel || 'beginner');

  // Sync with propLevel if it changes
  useEffect(() => {
    if (propLevel) {
      setCurrentLevel(propLevel);
    }
  }, [propLevel]);

  // Load level if not provided as a prop, then filter questions
  useEffect(() => {
    const loadLevelAndQuestions = async () => {
      if (!user) return;
      
      let activeLevel = propLevel;

      if (!activeLevel) {
        try {
          const { data: profile } = await supabase
            .from('users')
            .select('level')
            .eq('id', user.id)
            .single();
          activeLevel = profile?.level || 'beginner';
        } catch (err) {
          // Fallback to local storage
          activeLevel = localStorage.getItem(`codcraft_level_${user.id}`) || 'beginner';
        }
      }

      const finalLevel = activeLevel || 'beginner';
      setCurrentLevel(finalLevel);

      // Filter questions matching level and category
      const filtered = (questionsData as any).questions.filter((q: Question) => {
        const levelMatch = q.level === finalLevel;
        const catMatch = q.category === category;
        return levelMatch && catMatch;
      });

      setQuestions(filtered);
      setLoading(false);
    };

    loadLevelAndQuestions();
  }, [user, propLevel, category]);

  if (loading) return <p style={{ color: 'var(--text-secondary)' }}>Loading practice questions...</p>;
  
  if (questions.length === 0) {
    return (
      <div className="glass-card" style={{ textAlign: 'center', padding: '2.5rem' }}>
        <p style={{ color: 'var(--text-secondary)', margin: 0 }}>
          No questions available for level <strong>{currentLevel.toUpperCase()}</strong> in this section.
        </p>
      </div>
    );
  }

  return (
    <div className="question-list">
      {questions.map(q => (
        <QuestionItem
          key={q.id}
          question={q}
          onAnswered={() => onAnswered(q.xp_reward)}
        />
      ))}
    </div>
  );
};

export default QuestionBank;
