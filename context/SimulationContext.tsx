import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { Plan, Task, AgentState, AgentOutput, LogEntry, File, Artifact } from '../types';
import { generatePlan, executeTask } from '../services/geminiService';

interface SimulationContextType {
  plan: Plan | null;
  agents: Record<string, AgentState>;
  tasks: Task[];
  logs: LogEntry[];
  isSimulating: boolean;
  status: 'idle' | 'planning' | 'running' | 'paused' | 'completed' | 'error';
  artifacts: Artifact[];
  stats: {
    completedTasks: number;
    totalTasks: number;
    startTime: number | null;
    endTime: number | null;
  };
  error: string | null;
  
  createPlan: (goal: string, files: File[]) => Promise<void>;
  startSimulation: () => void;
  pauseSimulation: () => void;
  resetSimulation: () => void;
  getAgent: (name: string) => AgentState | undefined;
}

const SimulationContext = createContext<SimulationContextType | undefined>(undefined);

export const useSimulation = () => {
  const context = useContext(SimulationContext);
  if (!context) throw new Error("useSimulation must be used within a SimulationProvider");
  return context;
};

export const SimulationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [agents, setAgents] = useState<Record<string, AgentState>>({});
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [artifacts, setArtifacts] = useState<Artifact[]>([]);
  const [status, setStatus] = useState<'idle' | 'planning' | 'running' | 'paused' | 'completed' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [endTime, setEndTime] = useState<number | null>(null);

  const runningRef = useRef(false);
  const planRef = useRef<Plan | null>(null); // Ref to access current plan in loop
  const tasksRef = useRef<Task[]>([]); // Ref to access latest tasks in loop
  const agentsRef = useRef<Record<string, AgentState>>({});

  const addLog = (message: string, level: LogEntry['level'] = 'info', source: string = 'System') => {
    setLogs(prev => [{
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      level,
      message,
      source
    }, ...prev]);
  };

  const createPlan = async (goal: string, files: File[]) => {
    setStatus('planning');
    setError(null);
    addLog(`Generating plan for goal: "${goal}"...`, 'info', 'Orchestrator');
    
    try {
      const generatedPlan = await generatePlan(goal, files);
      setPlan(generatedPlan);
      planRef.current = generatedPlan;

      // Initialize Tasks with status
      const initialTasks = generatedPlan.tasks.map(t => ({ ...t, status: 'pending' as const }));
      setTasks(initialTasks);
      tasksRef.current = initialTasks;

      // Initialize Agents
      const newAgents: Record<string, AgentState> = {};
      // From Plan Roles/Tasks, infer agents. 
      // The plan object has tasks with 'agent' names. We need to map them to roles.
      // We can also look at plan.roles, but the task assignment is the source of truth for who exists.
      
      // Create agents based on tasks to ensure every task has an agent
      generatedPlan.tasks.forEach(t => {
          if (!newAgents[t.agent]) {
              const roleDef = generatedPlan.roles.find(r => r.title === t.role);
              newAgents[t.agent] = {
                  profile: {
                      name: t.agent,
                      role: t.role,
                      goal: roleDef ? roleDef.purpose : "Execute assigned tasks."
                  },
                  system_prompt: "", // Will be populated if Plan has team prompts
                  status: 'idle'
              };
          }
      });

      // Apply initial team prompts if any
      if (generatedPlan.team?.prompts) {
          generatedPlan.team.prompts.forEach(p => {
              if (newAgents[p.agent]) {
                  newAgents[p.agent].system_prompt = p.system_prompt;
              }
          });
      }

      setAgents(newAgents);
      agentsRef.current = newAgents;
      
      addLog(`Plan generated with ${generatedPlan.tasks.length} tasks.`, 'success', 'Orchestrator');
      setStatus('idle');
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to generate plan");
      addLog(`Plan generation failed: ${e.message}`, 'error', 'Orchestrator');
      setStatus('error');
    }
  };

  const executeSimulationStep = async () => {
    if (!runningRef.current) return;
    
    const currentTasks = [...tasksRef.current];
    const completedIds = new Set(currentTasks.filter(t => t.status === 'completed').map(t => t.id));
    
    // Find ready tasks
    const readyTasks = currentTasks.filter(t => 
      t.status === 'pending' && 
      t.deps.every(depId => completedIds.has(depId))
    );

    if (readyTasks.length === 0) {
      // Check if finished
      if (currentTasks.every(t => t.status === 'completed')) {
        setStatus('completed');
        setEndTime(Date.now());
        runningRef.current = false;
        addLog("All tasks completed successfully.", 'success', 'System');
        return;
      }
      
      // Check for deadlock (no pending tasks are ready, but some are still pending)
      const pending = currentTasks.filter(t => t.status === 'pending');
      const running = currentTasks.filter(t => t.status === 'running');
      
      if (pending.length > 0 && running.length === 0) {
          // Deadlock or failed dependencies
          setStatus('error');
          setError("Simulation Deadlock: Pending tasks have unmet dependencies.");
          runningRef.current = false;
          addLog("Deadlock detected. Simulation stopped.", 'error', 'System');
          return;
      }

      // If tasks are running, we just wait.
      return;
    }

    // Limit concurrency to 1 to prevent hitting Gemini API rate limits (429 RESOURCE_EXHAUSTED)
    const MAX_CONCURRENT = 1;
    const tasksToRun = readyTasks.slice(0, MAX_CONCURRENT);

    // Launch ready tasks
    // We process them concurrently (limited by slice)
    await Promise.all(tasksToRun.map(async (task) => {
        // Update task status to running
        updateTaskStatus(task.id, 'running');
        updateAgentStatus(task.agent, 'working');
        addLog(`Starting task: ${task.description}`, 'info', task.agent);

        try {
            // Build context from previous artifacts
            // Only include artifacts from dependencies for efficiency/relevance?
            // For now, include ALL previous artifacts as global context is shared in T20 usually.
            // Or better: filter by deps.
            const depArtifacts = artifacts.filter(a => task.deps.includes(a.task));
            const contextStr = depArtifacts.map(a => 
                `From Task ${a.task}:\n` + a.files.map(f => `File: ${f.path}\n${f.content}`).join('\n')
            ).join('\n\n');

            const agentState = agentsRef.current[task.agent];
            
            const output = await executeTask(task, agentState.profile, planRef.current?.high_level_goal || '', contextStr);

            // Handle Output
            if (output.artifact) {
                setArtifacts(prev => [...prev, output.artifact!]);
            }
            
            addLog(`Task completed. ${output.output.substring(0, 100)}...`, 'success', task.agent);
            
            // Handle Prompt Updates
            if (output.team?.prompts) {
                output.team.prompts.forEach(p => {
                    if (agentsRef.current[p.agent]) {
                        updateAgentPrompt(p.agent, p.system_prompt);
                        addLog(`Updated prompt for ${p.agent}`, 'warning', 'System');
                    }
                });
            }

            updateTaskStatus(task.id, 'completed');
            updateAgentStatus(task.agent, 'idle');

        } catch (e: any) {
            console.error(e);
            updateTaskStatus(task.id, 'failed');
            updateAgentStatus(task.agent, 'idle'); // Or error state
            addLog(`Task failed: ${e.message}`, 'error', task.agent);
            // We don't stop the whole sim, maybe other branches can proceed
        }
    }));

    // Trigger next step check
    if (runningRef.current) {
        setTimeout(executeSimulationStep, 1000); // Small delay for visual pacing
    }
  };

  const updateTaskStatus = (id: string, status: Task['status']) => {
      setTasks(prev => {
          const next = prev.map(t => t.id === id ? { ...t, status } : t);
          tasksRef.current = next;
          return next;
      });
  };

  const updateAgentStatus = (name: string, status: AgentState['status']) => {
      setAgents(prev => {
          const next = { ...prev, [name]: { ...prev[name], status } };
          agentsRef.current = next;
          return next;
      });
  };

  const updateAgentPrompt = (name: string, prompt: string) => {
      setAgents(prev => {
          const next = { ...prev, [name]: { ...prev[name], system_prompt: prompt } };
          agentsRef.current = next;
          return next;
      });
  };

  const startSimulation = useCallback(() => {
    if (!plan) return;
    if (status === 'completed') return;
    
    if (status === 'idle' || status === 'error') {
       setStartTime(Date.now());
       setEndTime(null);
    }
    
    setStatus('running');
    runningRef.current = true;
    executeSimulationStep();
  }, [plan, status]);

  const pauseSimulation = useCallback(() => {
    setStatus('paused');
    runningRef.current = false;
    addLog("Simulation paused.", 'warning', 'System');
  }, []);

  const resetSimulation = useCallback(() => {
    setStatus('idle');
    runningRef.current = false;
    setPlan(null);
    setTasks([]);
    setAgents({});
    setLogs([]);
    setArtifacts([]);
    setStartTime(null);
    setEndTime(null);
    planRef.current = null;
    tasksRef.current = [];
    agentsRef.current = {};
  }, []);

  return (
    <SimulationContext.Provider value={{
      plan, agents, tasks, logs, artifacts,
      status, error,
      isSimulating: status === 'running',
      stats: {
        completedTasks: tasks.filter(t => t.status === 'completed').length,
        totalTasks: tasks.length,
        startTime,
        endTime
      },
      createPlan, startSimulation, pauseSimulation, resetSimulation,
      getAgent: (name) => agents[name]
    }}>
      {children}
    </SimulationContext.Provider>
  );
};