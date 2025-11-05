'use client';

import { AgentId } from '@/src/lib/types';
import { AGENTS } from '@/src/lib/agents';

interface AgentPickerProps {
  selectedAgent: AgentId;
  onAgentChange: (agentId: AgentId) => void;
}

export default function AgentPicker({ selectedAgent, onAgentChange }: AgentPickerProps) {
  return (
    <div className="flex flex-col gap-2">
      <label className="text-sm font-medium text-gray-300">
        Choose Your Narrator
      </label>
      <select
        value={selectedAgent}
        onChange={(e) => onAgentChange(e.target.value as AgentId)}
        className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {Object.values(AGENTS).map((agent) => (
          <option key={agent.id} value={agent.id}>
            {agent.name} - {agent.title}
          </option>
        ))}
      </select>
      <p className="text-xs text-gray-400">
        {AGENTS[selectedAgent].personality}
      </p>
    </div>
  );
}