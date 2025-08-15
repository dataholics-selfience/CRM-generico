import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Users, Building2, MapPin, Mail, Phone, Linkedin,
  GripVertical, Trash2, Menu, BarChart3, Settings, UserPlus
} from 'lucide-react';
import { collection, query, where, getDocs, deleteDoc, doc, updateDoc, addDoc, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { ClientType, ServiceType, UserType } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import Sidebar from './Sidebar';
import AddClientModal from './AddClientModal';

const PIPELINE_STAGES = [
  { id: 'mapeada', name: 'Mapeada', color: 'bg-yellow-200 text-yellow-800 border-yellow-300' },
  { id: 'selecionada', name: 'Selecionada', color: 'bg-blue-200 text-blue-800 border-blue-300' },
  { id: 'contatada', name: 'Contatada', color: 'bg-purple-200 text-purple-800 border-purple-300' },
  { id: 'entrevistada', name: 'Entrevistada', color: 'bg-green-200 text-green-800 border-green-300' },
  { id: 'poc', name: 'POC', color: 'bg-orange-200 text-orange-800 border-orange-300' },
  { id: 'proposta', name: 'Proposta', color: 'bg-indigo-200 text-indigo-800 border-indigo-300' },
  { id: 'negociacao', name: 'Negociação', color: 'bg-pink-200 text-pink-800 border-pink-300' },
  { id: 'fechada', name: 'Fechada', color: 'bg-emerald-200 text-emerald-800 border-emerald-300' },
  { id: 'perdida', name: 'Perdida', color: 'bg-red-200 text-red-800 border-red-300' }
];

const ClientCard = ({ 
  client, 
  onClick, 
  onRemove,
  services
}: { 
  client: ClientType;
  onClick: () => void;
  onRemove: (id: string) => void;
  services: ServiceType[];
}) => {
  const [isRemoving, setIsRemoving] = useState(false);
  const service = services.find(s => s.id === client.serviceId);
  const plan = service?.plans.find(p => p.id === client.planId);

  const handleRemove = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (isRemoving) return;

    setIsRemoving(true);

    try {
      await deleteDoc(doc(db, 'clients', client.id));
      onRemove(client.id);
    } catch (error) {
      console.error('Error removing client:', error);
    } finally {
      setIsRemoving(false);
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', client.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onClick={onClick}
      className="bg-gray-700 rounded-lg p-4 mb-3 cursor-pointer hover:bg-gray-600 transition-colors group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 flex-1">
          <GripVertical size={16} className="text-gray-400 group-hover:text-gray-300" />
          <div className="flex-1">
            <h3 className="text-white font-medium text-sm">{client.nome}</h3>
            <p className="text-gray-400 text-xs">{client.empresa}</p>
          </div>
        </div>
        <button
          onClick={handleRemove}
          disabled={isRemoving}
          className={`p-1 rounded text-xs ${
            isRemoving
              ? 'text-gray-500 cursor-not-allowed'
              : 'text-red-400 hover:text-red-300 hover:bg-red-900/20'
          }`}
        >
          {isRemoving ? '...' : <Trash2 size={12} />}
        </button>
      </div>

      <div className="space-y-2 text-xs">
        <div className="flex items-center gap-2 text-gray-300">
          <Building2 size={12} className="text-blue-400" />
          <span className="truncate">{client.segmento}</span>
        </div>
        <div className="flex items-center gap-2 text-gray-300">
          <MapPin size={12} className="text-green-400" />
          <span className="truncate">{client.regiao}</span>
        </div>
        {service && (
          <div className="bg-gray-800 rounded p-2 mt-2">
            <div className="text-blue-400 font-medium">{service.name}</div>
            {plan && (
              <div className="text-gray-400 text-xs">
                {plan.name} - R$ {plan.price.toLocaleString()}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-2 mt-3">
        {client.email && (
          <a
            href={`mailto:${client.email}`}
            onClick={(e) => e.stopPropagation()}
            className="text-blue-400 hover:text-blue-300"
          >
            <Mail size={12} />
          </a>
        )}
        {client.whatsapp && (
          <a
            href={`https://wa.me/${client.whatsapp.replace(/\D/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-green-400 hover:text-green-300"
          >
            <Phone size={12} />
          </a>
        )}
        {client.linkedin && (
          <a
            href={client.linkedin}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-blue-400 hover:text-blue-300"
          >
            <Linkedin size={12} />
          </a>
        )}
      </div>
    </div>
  );
};

const PipelineStage = ({ 
  stage, 
  clients, 
  onDrop, 
  onClientClick,
  onRemoveClient,
  services
}: { 
  stage: typeof PIPELINE_STAGES[0];
  clients: ClientType[];
  onDrop: (clientId: string, newStage: string) => void;
  onClientClick: (clientId: string) => void;
  onRemoveClient: (id: string) => void;
  services: ServiceType[];
}) => {
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const clientId = e.dataTransfer.getData('text/plain');
    if (clientId) {
      onDrop(clientId, stage.id);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`border-2 border-dashed rounded-xl p-4 min-h-[400px] transition-all ${
        isDragOver 
          ? 'border-blue-400 bg-blue-900/20' 
          : 'border-gray-600 bg-gray-800/50'
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className={`font-bold text-sm px-3 py-1 rounded-full border ${stage.color}`}>
          {stage.name}
        </h3>
        <span className="text-gray-400 text-xs">
          {clients.length} cliente{clients.length !== 1 ? 's' : ''}
        </span>
      </div>
      
      <div className="space-y-2">
        {clients.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Plus size={24} className="mx-auto mb-2 opacity-50" />
            <p className="text-xs">Arraste clientes aqui</p>
          </div>
        ) : (
          clients.map((client) => (
            <ClientCard
              key={client.id}
              client={client}
              onRemove={onRemoveClient}
              onClick={() => onClientClick(client.id)}
              services={services}
            />
          ))
        )}
      </div>
    </div>
  );
};

const Pipeline = () => {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  const [clients, setClients] = useState<ClientType[]>([]);
  const [services, setServices] = useState<ServiceType[]>([]);
  const [userData, setUserData] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showAddClient, setShowAddClient] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!auth.currentUser) return;
      
      try {
        const userDoc = await doc(db, 'users', auth.currentUser.uid);
        const userSnapshot = await getDoc(userDoc);
        if (userSnapshot.exists()) {
          setUserData(userSnapshot.data() as UserType);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();
  }, []);

  useEffect(() => {
    if (!auth.currentUser || !userData) return;

    // Fetch services
    const servicesQuery = query(
      collection(db, 'services'),
      where('active', '==', true)
    );

    const unsubscribeServices = onSnapshot(servicesQuery, (snapshot) => {
      const servicesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ServiceType[];
      setServices(servicesData);
    });

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

    const unsubscribeClients = onSnapshot(clientsQuery, (snapshot) => {
      const clientsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ClientType[];
      
      clientsData.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      setClients(clientsData);
      setLoading(false);
    });

    return () => {
      unsubscribeServices();
      unsubscribeClients();
    };
  }, [userData]);

  const handleStageChange = async (clientId: string, newStage: string) => {
    try {
      const client = clients.find(c => c.id === clientId);
      if (!client) return;

      await updateDoc(doc(db, 'clients', clientId), {
        stage: newStage,
        updatedAt: new Date().toISOString()
      });

      // Add interaction record
      await addDoc(collection(db, 'interactions'), {
        clientId,
        userId: auth.currentUser?.uid,
        userName: userData?.name || 'Unknown',
        type: 'stage_change',
        title: 'Mudança de Estágio',
        description: `Cliente movido de "${client.stage}" para "${newStage}"`,
        date: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        metadata: {
          previousStage: client.stage,
          newStage
        }
      });
    } catch (error) {
      console.error('Error updating stage:', error);
    }
  };

  const handleClientClick = (clientId: string) => {
    navigate(`/client/${clientId}`);
  };

  const handleRemoveClient = (removedId: string) => {
    setClients(prev => prev.filter(client => client.id !== removedId));
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Carregando pipeline...</div>
      </div>
    );
  }

  return (
    <div className={`flex h-screen ${isDarkMode ? 'bg-black text-gray-100' : 'bg-white text-gray-900'}`}>
      <Sidebar 
        isOpen={isSidebarOpen} 
        toggleSidebar={toggleSidebar}
        userData={userData}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className={`flex items-center justify-between p-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}>
          <div className="flex items-center gap-4">
            <button 
              onClick={toggleSidebar}
              className={`w-10 h-10 flex items-center justify-center focus:outline-none rounded-lg border-2 transition-all ${
                isDarkMode 
                  ? 'text-gray-300 hover:text-white bg-gray-800 border-gray-700 hover:border-gray-600'
                  : 'text-gray-600 hover:text-gray-900 bg-gray-100 border-gray-300 hover:border-gray-400'
              }`}
            >
              <Menu size={24} />
            </button>
            <h1 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Pipeline CRM
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowAddClient(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              <UserPlus size={18} />
              Novo Cliente
            </button>
            
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              <BarChart3 size={18} />
              Dashboard
            </button>
            
            {userData?.role === 'admin' && (
              <button
                onClick={() => navigate('/services')}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <Settings size={18} />
                Serviços
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-x-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-5 gap-4 min-w-max">
            {PIPELINE_STAGES.map((stage) => {
              const stageClients = clients.filter(client => client.stage === stage.id);
              
              return (
                <div key={stage.id} className="min-w-[280px]">
                  <PipelineStage
                    stage={stage}
                    clients={stageClients}
                    onDrop={handleStageChange}
                    onClientClick={handleClientClick}
                    onRemoveClient={handleRemoveClient}
                    services={services}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {showAddClient && (
        <AddClientModal
          onClose={() => setShowAddClient(false)}
          services={services}
          userData={userData}
        />
      )}
    </div>
  );
};

export default Pipeline;