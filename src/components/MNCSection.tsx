// src/components/MNCSection.tsx
import React, { useEffect, useState } from 'react';
import { useAuth } from './AuthProvider';
import { supabase } from '../supabaseClient';
import QuestionItem from './QuestionItem';
import questionsData from '../data/questions.json';

type Question = {
  id: number;
  level: string;
  category: string;
  company?: string;
  content: string;
  answer: string;
  xp_reward: number;
};

interface Props {
  onAnswered?: (rewardXp: number) => void;
}

const COMPANIES = ['ALL', 'Google', 'Amazon', 'Microsoft', 'TCS', 'Infosys', 'Wipro'];

const MNCSection: React.FC<Props> = ({ onAnswered }) => {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [filteredQuestions, setFilteredQuestions] = useState<Question[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      
      // Filter questions belonging to category 'mnc'
      const mncQuestions = (questionsData as any).questions.filter(
        (q: Question) => q.category === 'mnc'
      );
      setQuestions(mncQuestions);
      setFilteredQuestions(mncQuestions);
      setLoading(false);
    };
    load();
  }, [user]);

  useEffect(() => {
    if (selectedCompany === 'ALL') {
      setFilteredQuestions(questions);
    } else {
      setFilteredQuestions(
        questions.filter(q => q.company?.toLowerCase() === selectedCompany.toLowerCase())
      );
    }
  }, [selectedCompany, questions]);

  const updateStandaloneUserStats = async (xpReward: number) => {
    if (!user) return;
    
    // Fetch current profile stats to update accurately
    let currentXp = 0;
    let currentLevel = 'beginner';
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('xp, level')
        .eq('id', user.id)
        .single();
        
      if (!error && data) {
        currentXp = data.xp ?? 0;
        currentLevel = data.level ?? 'beginner';
      } else {
        // Fallback to local storage values
        currentXp = parseInt(localStorage.getItem(`codcraft_xp_${user.id}`) || '0', 10);
        currentLevel = localStorage.getItem(`codcraft_level_${user.id}`) || 'beginner';
      }
    } catch (err) {
      currentXp = parseInt(localStorage.getItem(`codcraft_xp_${user.id}`) || '0', 10);
      currentLevel = localStorage.getItem(`codcraft_level_${user.id}`) || 'beginner';
    }

    const newXp = currentXp + xpReward;
    
    let newLevel = currentLevel;
    if (currentLevel === 'beginner' && newXp >= 100) newLevel = 'mid';
    else if (currentLevel === 'mid' && newXp >= 300) newLevel = 'pro';

    localStorage.setItem(`codcraft_xp_${user.id}`, newXp.toString());
    localStorage.setItem(`codcraft_level_${user.id}`, newLevel);

    try {
      await supabase.from('users').update({ xp: newXp, level: newLevel }).eq('id', user.id);
    } catch (err) {
      console.warn("Failed to sync standalone XP to database:", err);
    }
  };

  const handleAnswerSolved = (xpReward: number) => {
    if (onAnswered) {
      onAnswered(xpReward);
    } else {
      updateStandaloneUserStats(xpReward);
    }
  };

  const getCompanyColor = (company?: string) => {
    switch (company?.toLowerCase()) {
      case 'google': return '#4285F4';
      case 'amazon': return '#FF9900';
      case 'microsoft': return '#F25022';
      case 'tcs': return '#3b82f6';
      case 'infosys': return '#007cc3';
      case 'wipro': return '#a855f7';
      default: return 'var(--primary)';
    }
  };

  if (loading) return <p>Loading MNC questions...</p>;
  if (questions.length === 0) return <p>No MNC questions available right now.</p>;

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.4rem', marginBottom: '0.25rem' }}>MNC Placement Prep</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Crack real interview questions asked by top multinational corporations recruitment processes.
        </p>
      </div>

      {/* Company filter chips */}
      <div className="company-filter-bar">
        {COMPANIES.map(company => (
          <button
            key={company}
            className={`filter-chip ${selectedCompany === company ? 'active' : ''}`}
            onClick={() => setSelectedCompany(company)}
          >
            {company}
          </button>
        ))}
      </div>

      {/* Question list */}
      {filteredQuestions.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '3rem' }}>
          <p style={{ color: 'var(--text-secondary)' }}>No placement questions found for {selectedCompany}. Check back soon!</p>
        </div>
      ) : (
        <div className="question-list">
          {filteredQuestions.map(q => (
            <div key={q.id} style={{ position: 'relative' }}>
              {/* Company indicator tag floating top right */}
              <div style={{
                position: 'absolute',
                top: '1.5rem',
                right: '1.5rem',
                zIndex: 5
              }}>
                <span className="company-badge" style={{
                  borderColor: getCompanyColor(q.company),
                  color: getCompanyColor(q.company),
                  background: 'rgba(255, 255, 255, 0.03)'
                }}>
                  🏢 {q.company}
                </span>
                <span className={`badge badge-${q.level}`} style={{ marginLeft: '0.5rem', fontSize: '0.7rem' }}>
                  {q.level}
                </span>
              </div>
              
              <QuestionItem question={q} onAnswered={() => handleAnswerSolved(q.xp_reward)} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MNCSection;
