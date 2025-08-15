import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Mail, Phone, Linkedin, Building2, MapPin, 
  User, Briefcase, DollarSign, Calendar, MessageSquare,
  Plus, Edit, Save, X, Trash2
} from 'lucide-react';
import { 
  doc, getDoc, updateDoc, addDoc, collection, 
  query, where, onSnapshot, deleteDoc 
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { ClientType, InteractionType, ServiceType, UserType, PipelineStageType } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ClientDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  const [client, setClient] = useState<ClientType | null>(null);
  const [services, setServices] = useState<ServiceType[]>([]);
  const [stages, setStages] = useState<PipelineStageType[]>([]);
  const [interactions, setInteractions] = useState<InteractionType[]>([]);
  const [userData, setUserData] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showAddInteraction, setShowAddInteraction] = useState(false);
  const [editData, setEditData] = useState<Partial<ClientType>>({});

  useEffect(() => {
    const fetchData = async () => {
      if (!id || !auth.currentUser) return;

      try {
        // Fetch client data
        const clientDoc = await getDoc(doc(db, 'clients', id));
        if (clientDoc.exists()) {
          const clientData = { id: clientDoc.id, ...clientDoc.data() } as ClientType;
          setClient(clientData);
          setEditData(clientData);
        }

        // Fetch user data
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data() as UserType);
        }

        // Fetch pipeline stages
        const stagesQuery = query(
          collection(db, 'pipelineStages'),
          where('active', '==', true)
        );
        const stagesSnapshot = await getDocs(stagesQuery);
        const stagesData = stagesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as PipelineStageType[];
        stagesData.sort((a, b) => a.position - b.position);
        setStages(stagesData);
        // Fetch services
        const servicesQuery = query(
          collection(db, 'services'),
          where('active', '==', true)
        );
        const servicesSnapshot = await getDocs(servicesQuery);
        const servicesData = servicesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as ServiceType[];
        setServices(servicesData);

        // Subscribe to interactions
        const interactionsQuery = query(
          collection(db, 'interactions'),
          where('clientId', '==', id)
        );
        
        const unsubscribe = onSnapshot(interactionsQuery, (snapshot) => {
          const interactionsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as InteractionType[];
          
          interactionsData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setInteractions(interactionsData);
        });

        setLoading(false);
        return () => unsubscribe();
      } catch (error) {
        console.error('Error fetching client data:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleSave = async () => {
    if (!client || !id) return;

    try {
      await updateDoc(doc(db, 'clients', id), {
        ...editData,
        updatedAt: new Date().toISOString()
      });

      // Add interaction for client update
      await addDoc(collection(db, 'interactions'), {
        clientId: id,
        userId: auth.currentUser?.uid,
        userName: userData?.name || 'Unknown',
        type: 'note',
        title: 'Cliente Atualizado',
        description: 'Informações do cliente foram atualizadas',
        date: new Date().toISOString(),
        createdAt: new Date().toISOString()
      });

      setClient({ ...client, ...editData } as ClientType);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating client:', error);
    }
  };

  const handleStageChange = async (newStage: string) => {
    if (!client || !id) return;

    try {
      await updateDoc(doc(db, 'clients', id), {
        stage: newStage,
        updatedAt: new Date().toISOString()
      });

      // Add interaction for stage change
      await addDoc(collection(db, 'interactions'), {
        clientId: id,
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

      setClient({ ...client, stage: newStage });
    } catch (error) {
      console.error('Error updating stage:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Carregando cliente...</div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-white mb-4">Cliente não encontrado</h2>
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

  const service = services.find(s => s.id === client.serviceId);
  const plan = service?.plans.find(p => p.id === client.planId);
  const currentStage = stages.find(s => s.id === client.stage);

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
            {client.nome} - {client.empresa}
          </h1>
        </div>
        
        <div className="flex items-center gap-3">
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              <Edit size={18} />
              Editar
            </button>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <Save size={18} />
                Salvar
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditData(client);
                }}
                className="flex items-center gap-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <X size={18} />
                Cancelar
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Client Information */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-bold text-white mb-4">Informações do Cliente</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Nome</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editData.nome || ''}
                      onChange={(e) => setEditData(prev => ({ ...prev, nome: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-white">{client.nome}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Empresa</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editData.empresa || ''}
                      onChange={(e) => setEditData(prev => ({ ...prev, empresa: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-white">{client.empresa}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                  {isEditing ? (
                    <input
                      type="email"
                      value={editData.email || ''}
                      onChange={(e) => setEditData(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <Mail size={16} className="text-blue-400" />
                      <a href={`mailto:${client.email}`} className="text-blue-400 hover:text-blue-300">
                        {client.email}
                      </a>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">WhatsApp</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editData.whatsapp || ''}
                      onChange={(e) => setEditData(prev => ({ ...prev, whatsapp: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    client.whatsapp && (
                      <div className="flex items-center gap-2">
                        <Phone size={16} className="text-green-400" />
                        <a 
                          href={`https://wa.me/${client.whatsapp.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-400 hover:text-green-300"
                        >
                          {client.whatsapp}
                        </a>
                      </div>
                    )
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Segmento</label>
                  {isEditing ? (
                    <select
                      value={editData.segmento || ''}
                      onChange={(e) => setEditData(prev => ({ ...prev, segmento: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Tecnologia">Tecnologia</option>
                      <option value="Saúde">Saúde</option>
                      <option value="Educação">Educação</option>
                      <option value="Financeiro">Financeiro</option>
                      <option value="Varejo">Varejo</option>
                      <option value="Indústria">Indústria</option>
                      <option value="Serviços">Serviços</option>
                      <option value="Agronegócio">Agronegócio</option>
                      <option value="Outros">Outros</option>
                    </select>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Building2 size={16} className="text-purple-400" />
                      <span className="text-white">{client.segmento}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Região</label>
                  {isEditing ? (
                    <select
                      value={editData.regiao || ''}
                      onChange={(e) => setEditData(prev => ({ ...prev, regiao: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Norte">Norte</option>
                      <option value="Nordeste">Nordeste</option>
                      <option value="Centro-Oeste">Centro-Oeste</option>
                      <option value="Sudeste">Sudeste</option>
                      <option value="Sul">Sul</option>
                      <option value="Internacional">Internacional</option>
                    </select>
                  ) : (
                    <div className="flex items-center gap-2">
                      <MapPin size={16} className="text-green-400" />
                      <span className="text-white">{client.regiao}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">Dores/Necessidades</label>
                {isEditing ? (
                  <textarea
                    value={editData.dores || ''}
                    onChange={(e) => setEditData(prev => ({ ...prev, dores: e.target.value }))}
                    rows={4}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                ) : (
                  <p className="text-gray-300">{client.dores}</p>
                )}
              </div>
            </div>

            {/* Interactions Timeline */}
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Histórico de Interações</h2>
                <button
                  onClick={() => setShowAddInteraction(true)}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  <Plus size={16} />
                  Nova Interação
                </button>
              </div>

              <div className="space-y-4">
                {interactions.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">Nenhuma interação registrada</p>
                ) : (
                  interactions.map((interaction) => (
                    <InteractionCard key={interaction.id} interaction={interaction} />
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Stage */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-bold text-white mb-4">Estágio Atual</h3>
              <div className="space-y-2">
                {stages.map((stage) => (
                  <button
                    key={stage.id}
                    onClick={() => handleStageChange(stage.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                      client.stage === stage.id
                        ? `${stage.color}`
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {stage.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Service Information */}
            {service && (
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-bold text-white mb-4">Serviço</h3>
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium text-blue-400">{service.name}</h4>
                    <p className="text-gray-400 text-sm">{service.description}</p>
                  </div>
                  {plan && (
                    <div className="bg-gray-700 rounded p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-white">{plan.name}</span>
                        <div className="flex items-center gap-1">
                          <DollarSign size={14} className="text-green-400" />
                          <span className="text-green-400 font-bold">
                            R$ {plan.price.toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <div className="text-xs text-gray-400">
                        {plan.features.join(' • ')}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-bold text-white mb-4">Ações Rápidas</h3>
              <div className="space-y-2">
                {client.email && (
                  <a
                    href={`mailto:${client.email}`}
                    className="flex items-center gap-2 w-full bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg transition-colors"
                  >
                    <Mail size={16} />
                    Enviar Email
                  </a>
                )}
                {client.whatsapp && (
                  <a
                    href={`https://wa.me/${client.whatsapp.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 w-full bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg transition-colors"
                  >
                    <Phone size={16} />
                    WhatsApp
                  </a>
                )}
                {client.linkedin && (
                  <a
                    href={client.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 w-full bg-blue-700 hover:bg-blue-800 text-white px-3 py-2 rounded-lg transition-colors"
                  >
                    <Linkedin size={16} />
                    LinkedIn
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showAddInteraction && (
        <AddInteractionModal
          clientId={id!}
          onClose={() => setShowAddInteraction(false)}
          userData={userData}
        />
      )}
    </div>
  );
};

const InteractionCard = ({ interaction }: { interaction: InteractionType }) => {
  const getInteractionIcon = (type: string) => {
    switch (type) {
      case 'call': return <Phone size={16} className="text-blue-400" />;
      case 'email': return <Mail size={16} className="text-green-400" />;
      case 'meeting': return <Calendar size={16} className="text-purple-400" />;
      case 'note': return <MessageSquare size={16} className="text-gray-400" />;
      case 'stage_change': return <User size={16} className="text-orange-400" />;
      default: return <MessageSquare size={16} className="text-gray-400" />;
    }
  };

  return (
    <div className="bg-gray-700 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <div className="mt-1">
          {getInteractionIcon(interaction.type)}
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-white">{interaction.title}</h4>
            <span className="text-xs text-gray-400">
              {format(new Date(interaction.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
            </span>
          </div>
          <p className="text-gray-300 text-sm">{interaction.description}</p>
          <div className="flex items-center gap-2 mt-2">
            <User size={12} className="text-gray-500" />
            <span className="text-xs text-gray-500">{interaction.userName}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const AddInteractionModal = ({ 
  clientId, 
  onClose, 
  userData 
}: { 
  clientId: string;
  onClose: () => void;
  userData: UserType | null;
}) => {
  const [formData, setFormData] = useState({
    type: 'note',
    title: '',
    description: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !userData) return;

    setIsSubmitting(true);

    try {
      await addDoc(collection(db, 'interactions'), {
        clientId,
        userId: auth.currentUser.uid,
        userName: userData.name,
        type: formData.type,
        title: formData.title,
        description: formData.description,
        date: new Date().toISOString(),
        createdAt: new Date().toISOString()
      });

      onClose();
    } catch (error) {
      console.error('Error adding interaction:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">Nova Interação</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Tipo</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="note">Nota</option>
              <option value="call">Ligação</option>
              <option value="email">Email</option>
              <option value="meeting">Reunião</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Título</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              required
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Título da interação"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Descrição</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              required
              rows={4}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Descreva a interação..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 bg-gray-600 hover:bg-gray-700 rounded-md text-white font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 rounded-md text-white font-medium transition-colors"
            >
              {isSubmitting ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ClientDetail;