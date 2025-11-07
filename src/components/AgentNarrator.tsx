'use client';

import { useState } from 'react';
import { NarrationResponse, SceneInsight, AgentId, SceneId, AnswerResponse } from '@/src/lib/types';
import { AGENTS } from '@/src/lib/agents';
import FollowUpQuestions from './FollowUpQuestions';
import AnswerModal from './AnswerModal';

interface AgentNarratorProps {
  narration: NarrationResponse;
  agentId: AgentId;
  sceneId?: SceneId;
  sceneInsight?: SceneInsight;
  playerName?: string;
}

export default function AgentNarrator({ 
  narration, 
  agentId, 
  sceneId, 
  sceneInsight,
  playerName 
}: AgentNarratorProps) {
  const agent = AGENTS[agentId as keyof typeof AGENTS];
  const [selectedQuestion, setSelectedQuestion] = useState<string>('');
  const [answer, setAnswer] = useState<AnswerResponse | undefined>();
  const [isLoadingAnswer, setIsLoadingAnswer] = useState(false);
  const [showModal, setShowModal] = useState(false);
  
  const handleQuestionClick = async (question: string, context?: string) => {
    console.log('[AgentNarrator] Question clicked:', question, context);
    
    if (!sceneId || !sceneInsight) {
      console.warn('[AgentNarrator] Missing scene data for answer generation');
      return;
    }

    setSelectedQuestion(question);
    setShowModal(true);
    setIsLoadingAnswer(true);
    setAnswer(undefined);

    try {
      const response = await fetch('/api/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId,
          sceneId,
          question,
          insight: sceneInsight,
          playerName: playerName || 'Summoner'
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate answer');
      }

      const data = await response.json();
      setAnswer(data);
    } catch (error) {
      console.error('[AgentNarrator] Error fetching answer:', error);
      setAnswer({
        answer: 'I apologize, but I\'m having difficulty accessing my knowledge banks at the moment. Please try again.',
        relatedTips: []
      });
    } finally {
      setIsLoadingAnswer(false);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedQuestion('');
    setAnswer(undefined);
  };
  
  if (!agent) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <p className="text-gray-300">{narration.analysis}</p>
      </div>
    );
  }

  return (
    <div className="bg-black/40 backdrop-blur-lg rounded-2xl p-6 border border-white/20 h-full flex flex-col overflow-hidden">
      {/* Agent Header */}
      <div className="flex items-center gap-3 mb-4 flex-shrink-0">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
          <span className="text-white font-bold text-sm">
            {agent.name.charAt(0)}
          </span>
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">{agent.name}</h3>
          <p className="text-xs text-gray-400">{agent.title}</p>
        </div>
      </div>

      {/* Narration Content - Scrollable */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-2">
        <div>
          <h4 className="text-lg font-bold text-white mb-2">{narration.title}</h4>
        </div>
        
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
          <p className="text-gray-200 italic text-sm">"{narration.opening}"</p>
        </div>
        
        <div>
          <p className="text-gray-300 leading-relaxed text-sm">{narration.analysis}</p>
        </div>
        
        <div className="bg-blue-900/30 border border-blue-700/50 rounded-lg p-3">
          <h5 className="text-blue-300 font-semibold mb-2 text-sm">Recommendation:</h5>
          <p className="text-blue-100 text-sm">{narration.actionable}</p>
        </div>

        {/* Tags */}
        {narration.tags && narration.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {narration.tags.slice(0, 3).map((tag, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-white/10 text-gray-300 text-xs rounded-full"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Follow-up Questions */}
        {narration.followUpQuestions && narration.followUpQuestions.length > 0 && (
          <FollowUpQuestions 
            questions={narration.followUpQuestions}
            onQuestionClick={handleQuestionClick}
          />
        )}
      </div>

      {/* Answer Modal */}
      <AnswerModal
        isOpen={showModal}
        onClose={handleCloseModal}
        question={selectedQuestion}
        answer={answer}
        isLoading={isLoadingAnswer}
        agentId={agentId}
      />
    </div>
  );
}