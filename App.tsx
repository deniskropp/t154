import React from 'react';
import { SimulationProvider, useSimulation } from './context/SimulationContext';
import GoalInput from './components/GoalInput';
import Dashboard from './components/Dashboard';

const AppContent: React.FC = () => {
  const { plan } = useSimulation();
  
  return plan ? <Dashboard /> : <GoalInput />;
};

const App: React.FC = () => {
  return (
    <SimulationProvider>
      <div className="bg-background min-h-screen text-slate-200">
         <AppContent />
      </div>
    </SimulationProvider>
  );
};

export default App;