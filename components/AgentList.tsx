import React from 'react';
import { AgentState } from '../types';
import { Bot, Brain, CheckCircle, Clock } from 'lucide-react';

interface AgentListProps {
  agents: Record<string, AgentState>;
}

const AgentList: React.FC<AgentListProps> = ({ agents }) => {
  const getStatusColor = (status: AgentState['status']) => {
    switch (status) {
      case 'working': return 'text-blue-400 border-blue-400/30 bg-blue-500/10';
      case 'completed': return 'text-green-400 border-green-400/30 bg-green-500/10';
      case 'thinking': return 'text-purple-400 border-purple-400/30 bg-purple-500/10';
      default: return 'text-slate-400 border-slate-600/30 bg-slate-800/50';
    }
  };

  const getStatusIcon = (status: AgentState['status']) => {
    switch(status) {
      case 'working': return <Clock className="w-3 h-3 animate-spin" />;
      case 'completed': return <CheckCircle className="w-3 h-3" />;
      case 'thinking': return <Brain className="w-3 h-3 animate-pulse" />;
      default: return <Bot className="w-3 h-3" />;
    }
  };

  return (
    <div className="flex flex-col gap-3 h-full overflow-y-auto pr-1">
      {Object.values(agents).length === 0 && (
        <div className="text-slate-500 text-sm italic text-center py-4">No agents active</div>
      )}
      {Object.values(agents).map((agent: AgentState) => (
        <div 
          key={agent.profile.name} 
          className={`p-3 rounded-md border ${getStatusColor(agent.status)} transition-all duration-300`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-bold text-sm truncate flex items-center gap-2">
              <Bot className="w-4 h-4" />
              {agent.profile.name}
            </span>
            <div className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold border flex items-center gap-1 ${getStatusColor(agent.status)}`}>
              {getStatusIcon(agent.status)}
              {agent.status}
            </div>
          </div>
          <div className="text-xs opacity-80 mb-2 truncate">
            {agent.profile.role}
          </div>
          <div className="text-[10px] text-slate-400 border-t border-slate-700/50 pt-2 line-clamp-2">
             Goal: {agent.profile.goal}
          </div>
        </div>
      ))}
    </div>
  );
};

export default AgentList;