import React, { useState } from 'react';
import { useSimulation } from '../context/SimulationContext';
import PlanVisualization from './PlanVisualization';
import AgentList from './AgentList';
import { Task, Artifact } from '../types';
import { Play, Pause, RotateCcw, FileText, Code, Terminal, Activity, Bot } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const Dashboard: React.FC = () => {
  const { 
    plan, 
    agents, 
    tasks, 
    isSimulating, 
    startSimulation, 
    pauseSimulation, 
    resetSimulation, 
    logs, 
    artifacts, 
    stats 
  } = useSimulation();
  
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'artifacts' | 'logs'>('details');

  const selectedTaskArtifacts = selectedTask 
    ? artifacts.filter(a => a.task === selectedTask.id) 
    : [];

  const handleTaskClick = (task: Task) => {
    setSelectedTask(task);
    setActiveTab('details');
  };

  const chartData = [
    { name: 'Completed', value: stats.completedTasks, color: '#10b981' },
    { name: 'Pending', value: stats.totalTasks - stats.completedTasks, color: '#64748b' },
  ];

  return (
    <div className="flex flex-col h-screen bg-background text-slate-200 font-sans overflow-hidden">
      {/* Header */}
      <header className="h-14 bg-surface border-b border-slate-700 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-2">
           <Activity className="text-primary w-5 h-5" />
           <h1 className="font-bold text-lg tracking-tight">T20<span className="text-primary">-MAS</span> Client</h1>
        </div>
        
        {plan && (
          <div className="flex items-center gap-4">
             <div className="text-xs text-slate-400 bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
               Goal: <span className="text-slate-200">{plan.high_level_goal.substring(0, 40)}...</span>
             </div>
             
             <div className="flex items-center bg-slate-800 rounded-md p-0.5 border border-slate-700">
                {!isSimulating && stats.completedTasks < stats.totalTasks && (
                  <button onClick={startSimulation} className="p-1.5 hover:bg-green-500/20 text-green-400 rounded transition-colors" title="Start/Resume">
                    <Play className="w-4 h-4 fill-current" />
                  </button>
                )}
                {isSimulating && (
                  <button onClick={pauseSimulation} className="p-1.5 hover:bg-yellow-500/20 text-yellow-400 rounded transition-colors" title="Pause">
                    <Pause className="w-4 h-4 fill-current" />
                  </button>
                )}
                <button onClick={resetSimulation} className="p-1.5 hover:bg-red-500/20 text-red-400 rounded transition-colors" title="Reset">
                  <RotateCcw className="w-4 h-4" />
                </button>
             </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Left Sidebar: Agents */}
        <div className="w-64 bg-surface border-r border-slate-700 p-4 flex flex-col shrink-0">
          <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Active Agents</h2>
          <AgentList agents={agents} />
          
          <div className="mt-auto pt-4 border-t border-slate-700">
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Stats</h2>
            <div className="h-32 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                   <XAxis dataKey="name" hide />
                   <Tooltip 
                      contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155' }} 
                      itemStyle={{ color: '#e2e8f0' }}
                   />
                   <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                   </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="text-center text-xs text-slate-400 mt-1">
              {stats.completedTasks} / {stats.totalTasks} Tasks
            </div>
          </div>
        </div>

        {/* Center: Graph */}
        <div className="flex-1 p-4 bg-background relative overflow-hidden flex flex-col">
           {plan ? (
             <PlanVisualization tasks={tasks} onTaskClick={handleTaskClick} />
           ) : (
             <div className="flex items-center justify-center h-full text-slate-500 flex-col gap-4">
               <Activity className="w-16 h-16 opacity-20" />
               <p>No plan generated yet.</p>
             </div>
           )}
        </div>

        {/* Right Sidebar: Details & Logs */}
        <div className="w-96 bg-surface border-l border-slate-700 flex flex-col shrink-0">
           
           {/* Tabs */}
           <div className="flex border-b border-slate-700">
              <button 
                onClick={() => setActiveTab('details')}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider ${activeTab === 'details' ? 'text-primary border-b-2 border-primary bg-slate-800' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Task Details
              </button>
              <button 
                onClick={() => setActiveTab('artifacts')}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider ${activeTab === 'artifacts' ? 'text-primary border-b-2 border-primary bg-slate-800' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Artifacts
              </button>
              <button 
                onClick={() => setActiveTab('logs')}
                className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider ${activeTab === 'logs' ? 'text-primary border-b-2 border-primary bg-slate-800' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Logs
              </button>
           </div>

           {/* Tab Content */}
           <div className="flex-1 overflow-y-auto p-4">
              
              {activeTab === 'details' && (
                selectedTask ? (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        {selectedTask.id}
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border uppercase ${
                          selectedTask.status === 'completed' ? 'border-green-500/50 text-green-400 bg-green-500/10' :
                          selectedTask.status === 'running' ? 'border-blue-500/50 text-blue-400 bg-blue-500/10' :
                          selectedTask.status === 'failed' ? 'border-red-500/50 text-red-400 bg-red-500/10' :
                          'border-slate-500/50 text-slate-400 bg-slate-500/10'
                        }`}>
                          {selectedTask.status}
                        </span>
                      </h3>
                      <p className="text-sm text-slate-400 mt-1">{selectedTask.description}</p>
                    </div>

                    <div className="bg-slate-800/50 rounded p-3 border border-slate-700">
                      <div className="text-xs text-slate-500 uppercase mb-1">Assigned To</div>
                      <div className="flex items-center gap-2 text-sm font-medium text-blue-300">
                        <Bot className="w-4 h-4" /> {selectedTask.agent}
                      </div>
                      <div className="text-xs text-slate-400 mt-1">{selectedTask.role}</div>
                    </div>

                    {selectedTask.deps.length > 0 && (
                       <div>
                         <div className="text-xs text-slate-500 uppercase mb-1">Dependencies</div>
                         <div className="flex flex-wrap gap-2">
                           {selectedTask.deps.map(dep => (
                             <span key={dep} className="px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs text-slate-300">
                               {dep}
                             </span>
                           ))}
                         </div>
                       </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-slate-500 mt-10">Select a task from the graph to view details.</div>
                )
              )}

              {activeTab === 'artifacts' && (
                <div className="space-y-4">
                  {selectedTask ? (
                    selectedTaskArtifacts.length > 0 ? (
                      selectedTaskArtifacts.map((art, idx) => (
                        <div key={idx} className="space-y-2">
                           {art.files.map((file, fIdx) => (
                             <div key={fIdx} className="bg-slate-900 border border-slate-700 rounded overflow-hidden">
                               <div className="bg-slate-800 px-3 py-2 border-b border-slate-700 flex items-center justify-between">
                                  <span className="text-xs font-mono text-slate-300 flex items-center gap-2">
                                    <FileText className="w-3 h-3" /> {file.path}
                                  </span>
                               </div>
                               <pre className="p-3 text-[10px] text-slate-400 font-mono overflow-x-auto whitespace-pre-wrap">
                                 {file.content}
                               </pre>
                             </div>
                           ))}
                        </div>
                      ))
                    ) : (
                      <div className="text-center text-slate-500 mt-10">No artifacts produced by this task yet.</div>
                    )
                  ) : (
                    <div className="space-y-4">
                       <h3 className="text-sm font-bold text-slate-300 mb-2">All Artifacts</h3>
                       {artifacts.map((art, idx) => (
                          <div key={idx} className="space-y-2 mb-4">
                             <div className="text-xs text-blue-400 font-bold">Task {art.task}</div>
                             {art.files.map((file, fIdx) => (
                               <div key={fIdx} className="bg-slate-900 border border-slate-700 rounded p-2 flex items-center gap-2">
                                  <FileText className="w-4 h-4 text-slate-500" />
                                  <span className="text-xs text-slate-300 font-mono truncate">{file.path}</span>
                               </div>
                             ))}
                          </div>
                       ))}
                       {artifacts.length === 0 && <div className="text-center text-slate-500">No artifacts generated yet.</div>}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'logs' && (
                <div className="font-mono text-xs space-y-1">
                  {logs.map((log) => (
                    <div key={log.id} className="flex gap-2">
                      <span className="text-slate-600 shrink-0">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second:'2-digit' })}
                      </span>
                      <span className={`font-bold shrink-0 w-24 truncate ${
                         log.level === 'error' ? 'text-red-500' :
                         log.level === 'warning' ? 'text-yellow-500' :
                         log.level === 'success' ? 'text-green-500' : 'text-blue-500'
                      }`}>
                        [{log.source}]
                      </span>
                      <span className={`${
                        log.level === 'error' ? 'text-red-300' : 'text-slate-300'
                      }`}>
                        {log.message}
                      </span>
                    </div>
                  ))}
                  {logs.length === 0 && <div className="text-center text-slate-500 mt-10">System logs will appear here.</div>}
                </div>
              )}

           </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;