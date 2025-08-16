import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Users, DollarSign, TrendingUp, Target,
  BarChart3, PieChart, Calendar, Award
} from 'lucide-react';
import { 
  collection, query, where, getDocs, onSnapshot, getDoc, doc
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { ClientType, InteractionType, ServiceType, UserType, DashboardMetrics } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const Dashboard = () => {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [userData, setUserData] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!auth.currentUser) return;
      
      try {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data() as UserType);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();
  }, []);

  useEffect(() => {
    if (!auth.currentUser || !userData) return;

    const fetchDashboardData = async () => {
      try {
        // Fetch clients based on user role
        let clientsQuery;
        if (userData.role === 'admin') {
          clientsQuery = query(collection(db, 'clients'));
        } else {
          clientsQuery = query(
            collection(db, 'clients'),
            where('assignedTo', '==', auth.currentUser.uid)
          );
        }

        const clientsSnapshot = await getDocs(clientsQuery);
        const clients = clientsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as ClientType[];

        // Fetch services
        const servicesSnapshot = await getDocs(collection(db, 'services'));
        const services = servicesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as ServiceType[];

        // Calculate metrics
        const now = new Date();
        const currentMonthStart = startOfMonth(now);
        const currentMonthEnd = endOfMonth(now);

        const newClientsThisMonth = clients.filter(client => {
          const createdAt = new Date(client.createdAt);
          return createdAt >= currentMonthStart && createdAt <= currentMonthEnd;
        }).length;

        const closedClients = clients.filter(client => client.stage === 'fechada');
        const totalSales = closedClients.length;

        const salesThisMonth = closedClients.filter(client => {
          const updatedAt = new Date(client.updatedAt);
          return updatedAt >= currentMonthStart && updatedAt <= currentMonthEnd;
        }).length;

        const conversionRate = clients.length > 0 ? (totalSales / clients.length) * 100 : 0;

        // Calculate average ticket
        const averageTicket = services.length > 0 
          ? services.reduce((sum, service) => {
              const avgServicePrice = service.plans.reduce((planSum, plan) => planSum + plan.price, 0) / service.plans.length;
              return sum + avgServicePrice;
            }, 0) / services.length
          : 0;

        // Calculate pipeline value
        const pipelineValue = clients
          .filter(client => client.stage !== 'fechada' && client.stage !== 'perdida')
          .reduce((sum, client) => {
            const service = services.find(s => s.id === client.serviceId);
            const plan = service?.plans.find(p => p.id === client.planId);
            return sum + (plan?.price || 0);
          }, 0);

        // Clients by stage
        const clientsByStage = clients.reduce((acc, client) => {
          acc[client.stage] = (acc[client.stage] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        // Sales by service
        const salesByService = closedClients.reduce((acc, client) => {
          const service = services.find(s => s.id === client.serviceId);
          if (service) {
            acc[service.name] = (acc[service.name] || 0) + 1;
          }
          return acc;
        }, {} as Record<string, number>);

        // Top performers (if admin)
        let topPerformers: DashboardMetrics['topPerformers'] = [];
        if (userData.role === 'admin') {
          const usersSnapshot = await getDocs(collection(db, 'users'));
          const users = usersSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as UserType[];

          topPerformers = users.map(user => {
            const userClients = clients.filter(client => client.assignedTo === user.uid);
            const userSales = userClients.filter(client => client.stage === 'fechada').length;
            
            return {
              userId: user.uid,
              userName: user.name,
              sales: userSales,
              clients: userClients.length
            };
          }).sort((a, b) => b.sales - a.sales).slice(0, 5);
        }

        const dashboardMetrics: DashboardMetrics = {
          totalClients: clients.length,
          newClientsThisMonth,
          totalSales,
          salesThisMonth,
          conversionRate,
          averageTicket,
          pipelineValue,
          clientsByStage,
          salesByService,
          topPerformers
        };

        setMetrics(dashboardMetrics);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [userData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Carregando dashboard...</div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-white mb-4">Erro ao carregar dados</h2>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Voltar ao Pipeline
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-black' : 'bg-white'}`}>
      <div className={`flex items-center justify-between p-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}>
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/')}
            className={`text-gray-400 hover:text-white`}
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Dashboard CRM
          </h1>
        </div>
        
        <div className="text-sm text-gray-400">
          {format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
        </div>
      </div>

      <div className="p-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="Total de Clientes"
            value={metrics.totalClients}
            icon={Users}
            color="blue"
            subtitle={`+${metrics.newClientsThisMonth} este mês`}
          />
          <MetricCard
            title="Vendas Fechadas"
            value={metrics.totalSales}
            icon={Award}
            color="green"
            subtitle={`+${metrics.salesThisMonth} este mês`}
          />
          <MetricCard
            title="Taxa de Conversão"
            value={`${metrics.conversionRate.toFixed(1)}%`}
            icon={TrendingUp}
            color="purple"
          />
          <MetricCard
            title="Ticket Médio"
            value={`R$ ${metrics.averageTicket.toLocaleString()}`}
            icon={DollarSign}
            color="yellow"
          />
        </div>

        {/* Pipeline Value */}
        <div className="mb-8">
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <Target className="text-blue-400" size={24} />
              <h2 className="text-xl font-bold text-white">Valor do Pipeline</h2>
            </div>
            <div className="text-3xl font-bold text-green-400">
              R$ {metrics.pipelineValue.toLocaleString()}
            </div>
            <p className="text-gray-400 mt-2">
              Valor total de negócios em andamento
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Clients by Stage */}
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <PieChart className="text-purple-400" size={24} />
              <h2 className="text-xl font-bold text-white">Clientes por Estágio</h2>
            </div>
            <div className="space-y-3">
              {Object.entries(metrics.clientsByStage).map(([stage, count]) => (
                <div key={stage} className="flex items-center justify-between">
                  <span className="text-gray-300 capitalize">{stage}</span>
                  <span className="text-white font-medium">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Sales by Service */}
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <BarChart3 className="text-green-400" size={24} />
              <h2 className="text-xl font-bold text-white">Vendas por Serviço</h2>
            </div>
            <div className="space-y-3">
              {Object.entries(metrics.salesByService).length > 0 ? (
                Object.entries(metrics.salesByService).map(([service, count]) => (
                  <div key={service} className="flex items-center justify-between">
                    <span className="text-gray-300">{service}</span>
                    <span className="text-white font-medium">{count}</span>
                  </div>
                ))
              ) : (
                <p className="text-gray-400">Nenhuma venda registrada</p>
              )}
            </div>
          </div>
        </div>

        {/* Top Performers (Admin only) */}
        {userData?.role === 'admin' && metrics.topPerformers.length > 0 && (
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <Award className="text-yellow-400" size={24} />
              <h2 className="text-xl font-bold text-white">Top Performers</h2>
            </div>
            <div className="space-y-3">
              {metrics.topPerformers.map((performer, index) => (
                <div key={performer.userId} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                      index === 0 ? 'bg-yellow-500' : 
                      index === 1 ? 'bg-gray-400' : 
                      index === 2 ? 'bg-orange-600' : 'bg-gray-600'
                    }`}>
                      {index + 1}
                    </div>
                    <span className="text-gray-300">{performer.userName}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-white font-medium">{performer.sales} vendas</div>
                    <div className="text-gray-400 text-sm">{performer.clients} clientes</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const MetricCard = ({ 
  title, 
  value, 
  icon: Icon, 
  color, 
  subtitle 
}: { 
  title: string;
  value: string | number;
  icon: any;
  color: 'blue' | 'green' | 'purple' | 'yellow';
  subtitle?: string;
}) => {
  const colorClasses = {
    blue: 'text-blue-400',
    green: 'text-green-400',
    purple: 'text-purple-400',
    yellow: 'text-yellow-400'
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-gray-300 text-sm font-medium">{title}</h3>
        <Icon className={colorClasses[color]} size={24} />
      </div>
      <div className="text-2xl font-bold text-white mb-1">{value}</div>
      {subtitle && (
        <p className="text-gray-400 text-sm">{subtitle}</p>
      )}
    </div>
  );
};

export default Dashboard;