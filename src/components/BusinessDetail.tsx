import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Mail, Phone, Linkedin, Building2, MapPin, 
  User, Briefcase, DollarSign, Calendar, MessageSquare,
  Plus, Edit, Save, X, Trash2
} from 'lucide-react';
import { 
  doc, getDoc, updateDoc, addDoc, collection, 
  query, where, onSnapshot, deleteDoc, getDocs
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { BusinessType, InteractionType, ServiceType, UserType, PipelineStageType, ContactType, CompanyType } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const BusinessDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  const [business, setBusiness] = useState<BusinessType | null>(null);
  const [company, setCompany] = useState<CompanyType | null>(null);
  const [contacts, setContacts] = useState<ContactType[]>([]);
  const [services, setServices] = useState<ServiceType[]>([]);
  const [stages, setStages] = useState<PipelineStageType[]>([]);
  const [interactions, setInteractions] = useState<InteractionType[]>([]);
  const [userData, setUserData] = useState<UserType | null>(null);
  const [assignedUser, setAssignedUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showAddInteraction, setShowAddInteraction] = useState(false);
  const [editData, setEditData] = useState<Partial<BusinessType>>({});

  useEffect(() => {
    const fetchData = async () => {
      if (!id || !auth.currentUser) return;

      try {
        // Fetch business data
        const businessDoc = await getDoc(doc(db, 'businesses', id));
        if (businessDoc.exists()) {
          const businessData = { id: businessDoc.id, ...businessDoc.data() } as BusinessType;
          setBusiness(businessData);
          setEditData(businessData);

          // Fetch company data
          if (businessData.companyId) {
            const companyDoc = await getDoc(doc(db, 'companies', businessData.companyId));
            if (companyDoc.exists()) {
              setCompany({ id: companyDoc.id, ...companyDoc.data() } as CompanyType);
            }
          }

          // Fetch contacts
          if (businessData.contactIds && businessData.contactIds.length > 0) {
            const contactsPromises = businessData.contactIds.map(contactId => 
              getDoc(doc(db, 'contacts', contactId))
            );
            const contactDocs = await Promise.all(contactsPromises);
            const contactsData = contactDocs
              .filter(doc => doc.exists())
              .map(doc => ({ id: doc.id, ...doc.data() } as ContactType));
            setContacts(contactsData);
          }

          // Fetch assigned user
          if (businessData.assignedTo) {
            const assignedUserDoc = await getDoc(doc(db, 'users', businessData.assignedTo));
            if (assignedUserDoc.exists()) {
              setAssignedUser(assignedUserDoc.data() as UserType);
            }
          }
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
          where('businessId', '==', id)
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
        console.error('Error fetching business data:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleSave = async () => {
    if (!business || !id) return;

    try {
      await updateDoc(doc(db, 'businesses', id), {
        ...editData,
        // Recalculate total value
        valor: (editData.setupValue || 0) + (editData.monthlyValue || 0),
        updatedAt: new Date().toISOString()
      });

      // Add interaction for business update
      await addDoc(collection(db, 'interactions'), {
        businessId: id,
        userId: auth.currentUser?.uid,
        userName: userData?.name || 'Unknown',
        type: 'note',
        title: 'Negócio Atualizado',
        description: 'Informações do negócio foram atualizadas',
        date: new Date().toISOString(),
        createdAt: new Date().toISOString()
      });

      setBusiness({ ...business, ...editData } as BusinessType);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating business:', error);
    }
  };

  const handleStageChange = async (newStage: string) => {
    if (!business || !id) return;

    try {
      await updateDoc(doc(db, 'businesses', id), {
        stage: newStage,
        updatedAt: new Date().toISOString()
      });

      // Add interaction for stage change
      await addDoc(collection(db, 'interactions'), {
        businessId: id,
        userId: auth.currentUser?.uid,
        userName: userData?.name || 'Unknown',
        type: 'stage_change',
        title: 'Mudança de Estágio',
        description: `Negócio movido de "${business.stage}" para "${newStage}"`,
        date: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        metadata: {
          previousStage: business.stage,
          newStage
        }
      });

      setBusiness({ ...business, stage: newStage });
    } catch (error) {
      console.error('Error updating stage:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Carregando negócio...</div>
      </div>
    );
  }

  if (!business) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-white mb-4">Negócio não encontrado</h2>
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

  const service = services.find(s => s.id === business.serviceId);
  const plan = service?.plans.find(p => p.id === business.planId);
  const currentStage = stages.find(s => s.id === business.stage);

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
            {business.nome} - {company?.nome}
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
                  setEditData(business);
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
          {/* Business Information */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-bold text-white mb-4">Informações do Negócio</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Nome do Negócio</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editData.nome || ''}
                      onChange={(e) => setEditData(prev => ({ ...prev, nome: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-white">{business.nome}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Empresa</label>
                  <p className="text-white">{company?.nome}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Valor do Setup</label>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editData.setupValue || 0}
                      onChange={(e) => setEditData(prev => ({ ...prev, setupValue: Number(e.target.value) }))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <DollarSign size={16} className="text-green-400" />
                      <span className="text-green-400 font-bold">
                        R$ {(business.setupValue || 0).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Valor Mensal</label>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editData.monthlyValue || 0}
                      onChange={(e) => setEditData(prev => ({ ...prev, monthlyValue: Number(e.target.value) }))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <DollarSign size={16} className="text-blue-400" />
                      <span className="text-blue-400 font-bold">
                        R$ {(business.monthlyValue || 0).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Vendedor Responsável</label>
                  <div className="flex items-center gap-2">
                    <User size={16} className="text-purple-400" />
                    <span className="text-white">{assignedUser?.name || 'Não atribuído'}</span>
                    {assignedUser?.role && (
                      <span className="text-xs bg-purple-900/30 text-purple-400 px-2 py-1 rounded">
                        {assignedUser.role === 'admin' ? 'Admin' : 'Vendedor'}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">Descrição</label>
                {isEditing ? (
                  <textarea
                    value={editData.description || ''}
                    onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                    rows={4}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                ) : (
                  <p className="text-gray-300">{business.description || 'Nenhuma descrição'}</p>
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
                      business.stage === stage.id
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

            {/* Contacts */}
            {contacts.length > 0 && (
              <div className="bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-bold text-white mb-4">Contatos</h3>
                <div className="space-y-3">
                  {contacts.map((contact) => (
                    <div key={contact.id} className="bg-gray-700 rounded p-3">
                      <h4 className="font-medium text-white">{contact.nome}</h4>
                      <p className="text-gray-400 text-sm">{contact.cargoAlvo}</p>
                      <div className="flex items-center gap-2 mt-2">
                        {contact.email && (
                          <a
                            href={`mailto:${contact.email}`}
                            className="text-blue-400 hover:text-blue-300"
                          >
                            <Mail size={14} />
                          </a>
                        )}
                        {contact.whatsapp && (
                          <a
                            href={`https://wa.me/${contact.whatsapp.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-green-400 hover:text-green-300"
                          >
                            <Phone size={14} />
                          </a>
                        )}
                        {contact.linkedin && (
                          <a
                            href={contact.linkedin}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-700 hover:text-blue-600"
                          >
                            <Linkedin size={14} />
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showAddInteraction && (
        <AddInteractionModal
          businessId={id!}
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
  businessId, 
  onClose, 
  userData 
}: { 
  businessId: string;
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
        businessId,
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

export default BusinessDetail;