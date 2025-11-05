'use client';

import { NarrationResponse } from '@/src/lib/types';
import { AGENTS } from '@/src/lib/agents';

interface AgentNarratorProps {
  narration: NarrationResponse;
  agentId: string;
}

export default function AgentNarrator({ narration, agentId }: AgentNarratorProps) {
  const agent = AGENTS[agentId as keyof typeof AGENTS];
  
  if (!agent) {
    return (
      <div className="bg-gray-800 rounded-lg p-6">
        <p className="text-gray-300">{narration.analysis}</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-lg p-6 border border-gray-700">
      {/* Agent Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
          <span className="text-white font-bold text-lg">
            {agent.name.charAt(0)}
          </span>
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">{agent.name}</h3>
          <p className="text-sm text-gray-400">{agent.title}</p>
        </div>
      </div>

      {/* Narration Content */}
      <div className="space-y-4">
        <div>
          <h4 className="text-xl font-bold text-white mb-2">{narration.title}</h4>
        </div>
        
        <div className="bg-gray-700/50 rounded-lg p-4">
          <p className="text-gray-200 italic">"{narration.opening}"</p>
        </div>
        
        <div>
          <p className="text-gray-300 leading-relaxed">{narration.analysis}</p>
        </div>
        
        <div className="bg-blue-900/30 border border-blue-700/50 rounded-lg p-4">
          <h5 className="text-blue-300 font-semibold mb-2">Recommendation:</h5>
          <p className="text-blue-100">{narration.actionable}</p>
        </div>

        {/* Tags */}
        {narration.tags && narration.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {narration.tags.map((tag, index) => (
              <span
                key={index}
                className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded-full"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}