'use client';

import { X, Loader2 } from 'lucide-react';
import { AnswerResponse } from '@/src/lib/types';
import { AGENTS } from '@/src/lib/agents';

interface AnswerModalProps {
  isOpen: boolean;
  onClose: () => void;
  question: string;
  answer?: AnswerResponse;
  isLoading: boolean;
  agentId: string;
}

export default function AnswerModal({
  isOpen,
  onClose,
  question,
  answer,
  isLoading,
  agentId,
}: AnswerModalProps) {
  const agent = AGENTS[agentId as keyof typeof AGENTS];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-gradient-to-br from-gray-900 to-black border border-white/20 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-white/10">
          <div className="flex items-start gap-3 flex-1">
            {agent && (
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white font-bold text-lg">
                  {agent.name.charAt(0)}
                </span>
              </div>
            )}
            <div className="flex-1">
              <h3 className="text-xl font-bold text-white mb-1">
                {agent?.name || 'Agent'} Responds
              </h3>
              <p className="text-sm text-blue-300 font-medium">
                {question}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 p-2 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-10 h-10 animate-spin text-blue-400 mb-4" />
              <p className="text-gray-400 text-sm">
                Analyzing data and formulating response...
              </p>
            </div>
          ) : answer ? (
            <div className="space-y-6">
              {/* Main Answer */}
              <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-700/50 rounded-xl p-5">
                <p className="text-white leading-relaxed">
                  {answer.answer}
                </p>
              </div>

              {/* Related Tips */}
              {answer.relatedTips && answer.relatedTips.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
                    Related Tips
                  </h4>
                  <div className="space-y-2">
                    {answer.relatedTips.map((tip, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-3 bg-white/5 rounded-lg p-4 border border-white/10"
                      >
                        <div className="flex-shrink-0 w-6 h-6 bg-blue-500/20 rounded-full flex items-center justify-center">
                          <span className="text-blue-400 text-xs font-bold">
                            {index + 1}
                          </span>
                        </div>
                        <p className="text-gray-300 text-sm flex-1">
                          {tip}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-400">No answer available</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-black/30">
          <button
            onClick={onClose}
            className="w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold rounded-lg transition-all duration-200 hover:scale-[1.02]"
          >
            Got it, thanks!
          </button>
        </div>
      </div>
    </div>
  );
}
