import React, { useState } from 'react';
import { useSimulation } from '../context/SimulationContext';
import { Activity, ArrowRight, Loader2 } from 'lucide-react';

const GoalInput: React.FC = () => {
  const [goal, setGoal] = useState('');
  const { createPlan, status } = useSimulation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goal.trim()) return;
    await createPlan(goal, []);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
         <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl"></div>
         <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="max-w-xl w-full bg-surface border border-slate-700 rounded-xl p-8 shadow-2xl relative z-10">
        <div className="flex items-center gap-3 mb-6">
           <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center border border-blue-500/50">
             <Activity className="text-blue-400 w-6 h-6" />
           </div>
           <div>
             <h1 className="text-2xl font-bold text-white tracking-tight">T20-MAS Client</h1>
             <p className="text-sm text-slate-400">Multi-Agent System Simulator</p>
           </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="goal" className="block text-sm font-medium text-slate-300 mb-2">
              High Level Goal
            </label>
            <textarea
              id="goal"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="e.g., Create a snake game in Python with a start menu."
              className="w-full h-32 bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-200 placeholder-slate-600 focus:ring-2 focus:ring-primary focus:border-transparent outline-none resize-none transition-all"
              disabled={status === 'planning'}
            />
          </div>
          
          <button
            type="submit"
            disabled={!goal.trim() || status === 'planning'}
            className="w-full bg-primary hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {status === 'planning' ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Generating Plan...
              </>
            ) : (
              <>
                Initialize System
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-slate-700 text-xs text-slate-500 text-center">
           Powered by Gemini 2.5 Flash • No Backend • Pure Client-Side
        </div>
      </div>
    </div>
  );
};

export default GoalInput;
