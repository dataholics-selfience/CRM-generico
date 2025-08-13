import { useState, useEffect } from 'react';
import { Brain, Users, Search, BarChart3, ListChecks, Target } from 'lucide-react';

const loadingStates = [
  {
    icon: Brain,
    text: 'Processando segmento e analisando dados de clientes...',
    color: 'text-blue-400'
  },
  {
    icon: ListChecks,
    text: 'Criando estratégias para o segmento de clientes',
    color: 'text-purple-400'
  },
  {
    icon: Search,
    text: 'Realizando análise de mercado e comportamento',
    color: 'text-green-400'
  },
  {
    icon: Target,
    text: 'Definindo personas e targets específicos',
    color: 'text-yellow-400'
  },
  {
    icon: BarChart3,
    text: 'Gerando métricas e KPIs de relacionamento',
    color: 'text-pink-400'
  },
  {
    icon: Users,
    text: 'Finalizando estratégias de CRM para seu segmento!',
    color: 'text-emerald-400'
  }
];

export const LoadingStates = () => {
  const [currentState, setCurrentState] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentState((prev) => (prev + 1) % loadingStates.length);
    }, 6000);

    return () => clearInterval(interval);
  }, []);

  const CurrentIcon = loadingStates[currentState].icon;

  return (
    <div className="flex items-center gap-4 bg-gray-800/50 p-6 rounded-lg transform transition-all duration-500 animate-fade-in">
      <CurrentIcon 
        className={`w-8 h-8 ${loadingStates[currentState].color} animate-pulse transform transition-all duration-500 scale-110`} 
      />
      <span className="text-lg text-gray-300 animate-fade-in transition-all duration-500">
        {loadingStates[currentState].text}
      </span>
    </div>
  );
};