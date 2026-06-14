// src/components/DiagnosticQuiz.tsx
import React, { useState } from 'react';
import questionsData from '../data/questions.json';

interface Props {
  onCompleted: (assignedLevel: string, score: number) => void;
  onSkip: () => void;
}

interface DiagnosticQuestion {
  id: number;
  topic: string;
  type: string;
  content: string;
  options: string[];
  answer: string;
}

const DiagnosticQuiz: React.FC<Props> = ({ onCompleted, onSkip }) => {
  const questions: DiagnosticQuestion[] = questionsData.diagnostic;
  const [currentIdx, setCurrentIdx] = useState<number>(-1); // -1 is intro screen
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleStart = () => {
    setCurrentIdx(0);
  };

  const handleSelect = (option: string) => {
    const q = questions[currentIdx];
    setSelectedAnswers(prev => ({ ...prev, [q.id]: option }));
  };

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(currentIdx + 1);
    }
  };

  const handlePrev = () => {
    if (currentIdx > 0) {
      setCurrentIdx(currentIdx - 1);
    }
  };

  const handleSubmit = () => {
    setIsSubmitting(true);
    let correctCount = 0;
    questions.forEach(q => {
      if (selectedAnswers[q.id] === q.answer) {
        correctCount++;
      }
    });

    const total = questions.length;
    const accuracy = (correctCount / total) * 100;

    let assignedLevel = 'beginner';
    if (accuracy >= 80) {
      assignedLevel = 'pro'; // Advanced
    } else if (accuracy >= 40) {
      assignedLevel = 'mid'; // Intermediate
    }

    onCompleted(assignedLevel, correctCount);
  };

  if (currentIdx === -1) {
    return (
      <div className="quiz-intro">
        <div className="quiz-emoji">🎓</div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.75rem', color: 'var(--text)' }}>
          Diagnostic Skill Assessment
        </h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.88rem', lineHeight: 1.6, maxWidth: '420px', margin: '0 auto 1.5rem' }}>
          Welcome to CodCraft KTU! To tailor your syllabus-aligned learning trajectory, please take this quick 8-question assessment. It covers programming fundamentals, loops, array manipulations, recursion, and object-oriented concepts.
        </p>
        
        <div className="quiz-guidelines">
          <h4>💡 Assessment Guidelines:</h4>
          <ul>
            <li>8 single-choice questions</li>
            <li>Covers basic logical prediction & programming theory</li>
            <li>Your score auto-assigns you to a track: Beginner, Intermediate, or Advanced</li>
          </ul>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.65rem', marginTop: '1.5rem', width: '100%' }}>
          <button className="btn btn-primary" style={{ width: '100%', maxWidth: '280px' }} onClick={handleStart}>
            Start Assessment
          </button>
          <button className="btn btn-ghost" style={{ width: '100%', maxWidth: '280px', fontSize: '0.78rem', color: 'var(--muted)' }} onClick={onSkip}>
            Skip & Choose Track Manually
          </button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIdx];
  const selectedOption = selectedAnswers[currentQuestion.id];

  return (
    <div className="quiz-container">
      <div className="flex justify-between items-center" style={{ marginBottom: '0.5rem' }}>
        <span className="section-tag" style={{ margin: 0 }}>
          Topic: {currentQuestion.topic}
        </span>
        <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
          Question {currentIdx + 1} of {questions.length}
        </span>
      </div>

      {/* Progress indicator */}
      <div className="quiz-progress-track">
        <div 
          className="quiz-progress-fill"
          style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
        />
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text)', marginBottom: '1.25rem', whiteSpace: 'pre-line', lineHeight: 1.6 }}>
          {currentQuestion.content}
        </p>

        <div className="flex flex-col gap-3">
          {currentQuestion.options.map((option, idx) => {
            const letter = String.fromCharCode(65 + idx);
            const isSelected = selectedOption === option;
            return (
              <button
                key={option}
                onClick={() => handleSelect(option)}
                className={`quiz-option-btn${isSelected ? ' active' : ''}`}
              >
                <span className={`quiz-option-badge${isSelected ? ' active' : ''}`}>
                  {letter}
                </span>
                <span className="font-mono" style={{ fontSize: '0.84rem' }}>{option}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex justify-between items-center" style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
        <button
          className="btn btn-outline"
          onClick={handlePrev}
          disabled={currentIdx === 0}
        >
          Previous
        </button>

        <button
          className="btn btn-ghost"
          style={{ fontSize: '0.78rem', color: 'var(--muted)', padding: '0.35rem 0.75rem' }}
          onClick={onSkip}
        >
          Skip Quiz
        </button>

        {currentIdx === questions.length - 1 ? (
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={isSubmitting || !selectedOption}
          >
            {isSubmitting ? 'Evaluating...' : 'Submit Assessment'}
          </button>
        ) : (
          <button
            className="btn btn-primary"
            onClick={handleNext}
            disabled={!selectedOption}
          >
            Next
          </button>
        )}
      </div>
    </div>
  );
};

export default DiagnosticQuiz;
