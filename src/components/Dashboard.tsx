import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Users, DollarSign, TrendingUp, Target,
  BarChart3, PieChart, Calendar, Award, CheckCircle, XCircle, Clock
} from 'lucide-react';
import { 
  collection, query, where, getDocs, onSnapshot, getDoc, doc
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { ClientType, InteractionType, ServiceType, UserType, DashboardMetrics, BusinessType, PipelineStageType } from '../types';
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
        // Fetch businesses based on user role
        let businessesQuery;
        if (userData.role === 'admin') {
          businessesQuery = query(collection(db, 'businesses'));
        } else {
          businessesQuery = query(
            collection(db, 'businesses'),
            where('assignedTo', '==', auth.currentUser.uid)
          );
        }

        const businessesSnapshot = await getDocs(businessesQuery);
        const businesses = businessesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as BusinessType[];

        // Fetch services
        const servicesSnapshot = await getDocs(collection(db, 'services'));
        const services = servicesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as ServiceType[];

        // Fetch pipeline stages to identify "Fechada" stage
        const stagesSnapshot = await getDocs(collection(db, 'pipelineStages'));
        const stages = stagesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as PipelineStageType[];
        
        const closedStage = stages.find(stage => 
          stage.name.toLowerCase().includes('fechada') ||
          stage.name.toLowerCase().includes('fechado') ||
          stage.name.toLowerCase().includes('won') ||
          stage.name.toLowerCase().includes('closed')
        );
        
        const lostStage = stages.find(stage => 
          stage.name.toLowerCase().includes('perdida') || 
          stage.name.toLowerCase().includes('lost')
        );
        
        // Calculate metrics
        const now = new Date();
        const currentMonthStart = startOfMonth(now);
        const currentMonthEnd = endOfMonth(now);

        const newBusinessesThisMonth = businesses.filter(business => {
          const createdAt = new Date(business.createdAt);
          return createdAt >= currentMonthStart && createdAt <= currentMonthEnd;
        }).length;

        const closedBusinesses = businesses.filter(business => 
          closedStage ? business.stage === closedStage.id : false
        );
        const totalSales = closedBusinesses.length;

        const salesThisMonth = closedBusinesses.filter(business => {
          const updatedAt = new Date(business.updatedAt);
          return updatedAt >= currentMonthStart && updatedAt <= currentMonthEnd;
        }).length;

        const conversionRate = businesses.length > 0 ? (totalSales / businesses.length) * 100 : 0;

        // Calculate average ticket
        const averageTicket = closedBusinesses.length > 0
          ? closedBusinesses.reduce((sum, business) => sum + business.valor, 0) / closedBusinesses.length
          : 0;

        // Calculate pipeline value (setup + 12 monthly payments for active businesses)
        let pipelineValue = 0;
        let mrr = 0; // Monthly Recurring Revenue
        let monthlyRevenue = 0; // Receita total mensal (setup + mensalidades)
        let annualRevenue = 0; // Receita total anual
        let arr = 0; // Annual Recurring Revenue

        // Calculate pipeline value for ALL businesses (including closed ones)
        businesses.forEach(business => {
          const service = services.find(s => s.id === business.serviceId);
          const plan = service?.plans.find(p => p.id === business.planId);
          
          if (plan) {
            const setupValue = business.valor;
            const monthlyValue = plan.price;
            
            // Pipeline value: setup + 12 monthly payments for ALL businesses
            pipelineValue += setupValue + (monthlyValue * 12);
          } else {
            // Fallback if no plan found
            pipelineValue += business.valor;
          }
        });

        // Calculate MRR and revenue metrics only for closed businesses (won deals)
        const wonBusinesses = businesses.filter(business => 
          closedStage ? business.stage === closedStage.id : false
        );

        wonBusinesses.forEach(business => {
          const service = services.find(s => s.id === business.serviceId);
          const plan = service?.plans.find(p => p.id === business.planId);
          
          if (plan) {
            const setupValue = business.valor;
            const monthlyValue = plan.price;
            
            // Check if closed this month
            const closedAt = new Date(business.updatedAt);
            const isClosedThisMonth = closedAt >= currentMonthStart && closedAt <= currentMonthEnd;
            
            if (isClosedThisMonth) {
              // MRR: only recurring revenue
              mrr += monthlyValue;
              
              // Monthly Revenue: setup + monthly payment
              monthlyRevenue += setupValue + monthlyValue;
            }
            
            // Annual Revenue: setup + 12 monthly payments for all won deals
            annualRevenue += setupValue + (monthlyValue * 12);
            
            // ARR: only recurring revenue (12 monthly payments)
            arr += monthlyValue * 12;
          }
        });

        // Sales status breakdown
        const salesStatus = {
          won: closedBusinesses.length,
          lost: businesses.filter(business => 
            lostStage ? business.stage === lostStage.id : false
          ).length,
          inProgress: businesses.length - closedBusinesses.length - (businesses.filter(business => 
            lostStage ? business.stage === lostStage.id : false
          ).length)
        };

        // Alternative calculation for inProgress to be more explicit
        const lostBusinesses = businesses.filter(business => 
          lostStage ? business.stage === lostStage.id : false
        );
        
        const inProgressBusinesses = businesses.filter(business => {
          if (closedStage && business.stage === closedStage.id) return false;
          if (lostStage && business.stage === lostStage.id) return false;
          return true;
        });

        // Update sales status with correct calculation
        const updatedSalesStatus = {
          won: closedBusinesses.length,
          lost: lostBusinesses.length,
          inProgress: inProgressBusinesses.length
        };

        // Use the updated sales status
        const finalSalesStatus = {
          won: closedBusinesses.length,
          lost: businesses.filter(business => 
            lostStage ? business.stage === lostStage.id : false
          ).length,
          inProgress: businesses.filter(business => {
            if (closedStage && business.stage === closedStage.id) return false;
            if (lostStage && business.stage === lostStage.id) return false;
            return true;
          }).length
        };

        // Businesses by stage
        const businessesByStage = businesses.reduce((acc, business) => {
          const stage = stages.find(s => s.id === business.stage);
          const stageName = stage ? stage.name : 'Desconhecido';
          acc[stageName] = (acc[stageName] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        // Sales by service
        const salesByService = closedBusinesses.reduce((acc, business) => {
          const service = services.find(s => s.id === business.serviceId);
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
            const userBusinesses = businesses.filter(business => business.assignedTo === user.uid);
            const userSales = userBusinesses.filter(business => 
              closedStage ? business.stage === closedStage.id : business.stage === 'fechada'
            ).length;
            
            return {
              userId: user.uid,
              userName: user.name,
              sales: userSales,
              clients: userBusinesses.length
            };
          }).sort((a, b) => b.sales - a.sales).slice(0, 5);
        }

        const dashboardMetrics: DashboardMetrics = {
          totalClients: businesses.length,
          newClientsThisMonth: newBusinessesThisMonth,
          totalSales,
          salesThisMonth,
          conversionRate,
          averageTicket,
          pipelineValue,
          mrr,
          monthlyRevenue,
          annualRevenue,
          arr,
          clientsByStage: businessesByStage,
          salesStatus: finalSalesStatus,
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
            title="Total de Negócios"
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

        {/* Revenue Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricCard
            title="MRR"
            value={`R$ ${metrics.mrr.toLocaleString()}`}
            icon={TrendingUp}
            color="green"
            subtitle="Receita recorrente mensal"
          />
          <MetricCard
            title="Receita Mensal"
            value={`R$ ${metrics.monthlyRevenue.toLocaleString()}`}
            icon={DollarSign}
            color="blue"
            subtitle="Setup + mensalidades"
          />
          <MetricCard
            title="Receita Anual"
            value={`R$ ${metrics.annualRevenue.toLocaleString()}`}
            icon={Award}
            color="purple"
            subtitle="Total anual dos contratos"
          />
          <MetricCard
            title="ARR"
            value={`R$ ${metrics.arr.toLocaleString()}`}
            icon={Target}
            color="yellow"
            subtitle="Receita recorrente anual"
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
              Valor total de negócios em andamento (setup + 12 mensalidades)
            </p>
            <div className="mt-4 p-3 bg-gray-700 rounded-lg">
              <p className="text-gray-300 text-sm">
                <strong>Como calculamos:</strong> Para cada negócio no pipeline (todas as etapas), somamos o valor do setup inicial 
                mais 12 prestações mensais do plano contratado, representando o valor total potencial de todos os contratos.
              </p>
            </div>
          </div>
        </div>

        {/* Sales Status Chart */}
        <SalesStatusChart salesStatus={metrics.salesStatus} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Clients by Stage */}
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <PieChart className="text-purple-400" size={24} />
              <h2 className="text-xl font-bold text-white">Negócios por Estágio</h2>
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

const SalesStatusChart = ({ salesStatus }: { salesStatus: { won: number; lost: number; inProgress: number } }) => {
  const total = salesStatus.won + salesStatus.lost + salesStatus.inProgress;
  
  if (total === 0) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <PieChart className="text-blue-400" size={24} />
          <h2 className="text-xl font-bold text-white">Status das Vendas</h2>
        </div>
        <div className="text-center py-8">
          <p className="text-gray-400">Nenhum negócio encontrado</p>
        </div>
      </div>
    );
  }

  const wonPercentage = (salesStatus.won / total) * 100;
  const lostPercentage = (salesStatus.lost / total) * 100;
  const inProgressPercentage = (salesStatus.inProgress / total) * 100;

  return (
    <div className="bg-gray-800 rounded-lg p-6 mb-8">
      <div className="flex items-center gap-3 mb-6">
        <PieChart className="text-blue-400" size={24} />
        <h2 className="text-xl font-bold text-white">Status das Vendas</h2>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart Visual */}
        <div className="flex items-center justify-center">
          <div className="relative w-48 h-48">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              {/* Won slice */}
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="#10b981"
                strokeWidth="20"
                strokeDasharray={`${wonPercentage * 2.51} 251.2`}
                strokeDashoffset="0"
              />
              {/* Lost slice */}
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="#ef4444"
                strokeWidth="20"
                strokeDasharray={`${lostPercentage * 2.51} 251.2`}
                strokeDashoffset={`-${wonPercentage * 2.51}`}
              />
              {/* In Progress slice */}
              <circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="#3b82f6"
                strokeWidth="20"
                strokeDasharray={`${inProgressPercentage * 2.51} 251.2`}
                strokeDashoffset={`-${(wonPercentage + lostPercentage) * 2.51}`}
              />
            </svg>
          </div>
        </div>
        
        {/* Legend */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle className="text-green-400" size={20} />
              <span className="text-gray-300">Vendas Fechadas</span>
            </div>
            <div className="text-right">
              <div className="text-white font-bold">{salesStatus.won}</div>
              <div className="text-green-400 text-sm">{wonPercentage.toFixed(1)}%</div>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <XCircle className="text-red-400" size={20} />
              <span className="text-gray-300">Vendas Perdidas</span>
            </div>
            <div className="text-right">
              <div className="text-white font-bold">{salesStatus.lost}</div>
              <div className="text-red-400 text-sm">{lostPercentage.toFixed(1)}%</div>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Clock className="text-blue-400" size={20} />
              <span className="text-gray-300">Em Andamento</span>
            </div>
            <div className="text-right">
              <div className="text-white font-bold">{salesStatus.inProgress}</div>
              <div className="text-blue-400 text-sm">{inProgressPercentage.toFixed(1)}%</div>
            </div>
          </div>
          
          <div className="pt-4 border-t border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-gray-300 font-medium">Total de Negócios</span>
              <span className="text-white font-bold text-lg">{total}</span>
            </div>
          </div>
        </div>
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