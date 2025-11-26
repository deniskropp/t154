export interface File {
  path: string;
  content: string;
}

export interface Artifact {
  task: string;
  files: File[];
}

export interface Task {
  id: string;
  description: string;
  role: string;
  agent: string;
  deps: string[];
  status?: 'pending' | 'running' | 'completed' | 'failed'; // Client-side state
}

export interface Role {
  title: string;
  purpose: string;
}

export interface AgentProfile {
  name: string;
  role: string;
  goal: string;
}

export interface Prompt {
  agent: string;
  role: string;
  system_prompt: string;
}

export interface Team {
  notes: string;
  prompts: Prompt[];
}

export interface Plan {
  high_level_goal: string;
  reasoning: string;
  roles: Role[];
  tasks: Task[];
  team?: Team;
}

export interface AgentOutput {
  output: string;
  artifact?: Artifact;
  team?: Team;
  reasoning?: string;
}

export interface LogEntry {
  id: string;
  timestamp: number;
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
  source: string;
}

export interface AgentState {
  profile: AgentProfile;
  system_prompt: string;
  status: 'idle' | 'thinking' | 'working' | 'completed';
}
