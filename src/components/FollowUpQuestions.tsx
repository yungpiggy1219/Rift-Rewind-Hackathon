'use client';

import { useState } from 'react';
import { FollowUpQuestion } from '@/src/lib/types';

interface FollowUpQuestionsProps {
  questions?: FollowUpQuestion[];
  onQuestionClick?: (question: string, context?: string) => void;
}

export default function FollowUpQuestions({ 
  questions = [], 
  onQuestionClick 
}: FollowUpQuestionsProps) {
  const [clickedIndex, setClickedIndex] = useState<number | null>(null);

  if (!questions || questions.length === 0) {
    return null;
  }

  const handleClick = (question: FollowUpQuestion, index: number) => {
    setClickedIndex(index);
    
    // Visual feedback - reset after animation
    setTimeout(() => setClickedIndex(null), 300);
    
    // Call parent callback if provided
    if (onQuestionClick) {
      onQuestionClick(question.question, question.context);
    }
  };

  return (
    <div className="mt-4 flex-shrink-0">
      <h5 className="text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">
        Questions You Might Ask
      </h5>
      <div className="flex flex-col gap-2">
        {questions.map((q, index) => (
          <button
            key={index}
            onClick={() => handleClick(q, index)}
            className={`
              group relative w-full text-left px-4 py-3 rounded-lg
              bg-gradient-to-r from-blue-900/30 to-purple-900/30
              border border-blue-700/50
              hover:border-blue-500/70 hover:from-blue-900/50 hover:to-purple-900/50
              transition-all duration-200
              ${clickedIndex === index ? 'scale-95 border-blue-400' : 'hover:scale-[1.02]'}
            `}
            title={q.context}
          >
            {/* Question Text */}
            <div className="flex items-start gap-2">
              <span className="text-blue-400 text-lg mt-0.5 flex-shrink-0">❯</span>
              <div className="flex-1">
                <p className="text-sm text-blue-100 font-medium group-hover:text-white transition-colors">
                  {q.question}
                </p>
                {q.context && (
                  <p className="text-xs text-gray-500 mt-1 group-hover:text-gray-400 transition-colors">
                    {q.context}
                  </p>
                )}
              </div>
            </div>

            {/* Hover Effect */}
            <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-blue-500/0 to-purple-500/0 group-hover:from-blue-500/10 group-hover:to-purple-500/10 transition-all duration-200 pointer-events-none" />
          </button>
        ))}
      </div>
      
      {/* Info Text */}
      <p className="text-xs text-gray-500 mt-3 italic">
        Click a question to explore more insights (feature coming soon)
      </p>
    </div>
  );
}
