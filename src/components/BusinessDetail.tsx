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
  const [allUsers, setAllUsers] = useState<UserType[]>([]);
  const [assignedUser, setAssignedUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showAddInteraction, setShowAddInteraction] = useState(false);
  const [editData, setEditData] = useState<Partial<BusinessType & CompanyType>>({});

  useEffect(() => {
    const fetchData = async () => {
      if (!id || !auth.currentUser) return;

      try {
        // Fetch business data
        const businessDoc = await getDoc(doc(db, 'businesses', id));
        if (businessDoc.exists()) {
          const businessData = { id: businessDoc.id, ...businessDoc.data() } as BusinessType;
          setBusiness(businessData);
          
          // Fetch company data
          const companyDoc = await getDoc(doc(db, 'companies', businessData.companyId));
          if (companyDoc.exists()) {
            const companyData = { id: companyDoc.id, ...companyDoc.data() } as CompanyType;
            setCompany(companyData);
            setEditData({ ...businessData, ...companyData });
          }

          // Fetch contacts
          const contactsQuery = query(
            collection(db, 'contacts'),
            where('companyId', '==', businessData.companyId)
          );
          const contactsSnapshot = await getDocs(contactsQuery);
          const contactsData = contactsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as ContactType[];
          setContacts(contactsData);

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
          const currentUserData = userDoc.data() as UserType;
          setUserData(currentUserData);

          // If admin, fetch all users for assignment
          if (currentUserData.role === 'admin') {
            const usersQuery = query(collection(db, 'users'));
            const usersSnapshot = await getDocs(usersQuery);
            const usersData = usersSnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            })) as UserType[];
            setAllUsers(usersData.filter(user => user.role === 'vendedor' || user.role === 'admin'));
          }
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
    if (!business || !company || !id) return;

    try {
      // Update business
      const businessUpdateData = {
        nome: editData.nome,
        setupInicial: editData.setupInicial || editData.valor, // Handle both old and new field names
        serviceId: editData.serviceId,
        planId: editData.planId,
        stage: editData.stage,
        description: editData.description,
        assignedTo: editData.assignedTo,
        updatedAt: new Date().toISOString()
      };

      await updateDoc(doc(db, 'businesses', id), businessUpdateData);

      // Update company
      const companyUpdateData = {
        nome: editData.nome,
        cnpj: editData.cnpj,
        segmento: editData.segmento,
        regiao: editData.regiao,
        tamanho: editData.tamanho,
        faturamento: editData.faturamento,
        dores: editData.dores,
        updatedAt: new Date().toISOString()
      };

      await updateDoc(doc(db, 'companies', company.id), companyUpdateData);

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

      setBusiness({ ...business, ...businessUpdateData } as BusinessType);
      setCompany({ ...company, ...companyUpdateData } as CompanyType);
      
      // Update assigned user if changed
      if (editData.assignedTo && editData.assignedTo !== business.assignedTo) {
        const newAssignedUserDoc = await getDoc(doc(db, 'users', editData.assignedTo));
        if (newAssignedUserDoc.exists()) {
          setAssignedUser(newAssignedUserDoc.data() as UserType);
        }
      }
      
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

  if (!business || !company) {
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
            {business.nome} - {company.nome}
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
                  setEditData({ ...business, ...company });
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
                  <label className="block text-sm font-medium text-gray-300 mb-2">Setup Inicial</label>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editData.setupInicial || editData.valor || 0}
                      onChange={(e) => setEditData(prev => ({ ...prev, setupInicial: Number(e.target.value) }))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <div className="flex items-center gap-2">
                      <DollarSign size={16} className="text-green-400" />
                      <span className="text-white">R$ {(business.setupInicial || business.valor || 0).toLocaleString()}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Vendedor Responsável</label>
                  {isEditing && userData?.role === 'admin' ? (
                    <select
                      value={editData.assignedTo || ''}
                      onChange={(e) => setEditData(prev => ({ ...prev, assignedTo: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Selecione o vendedor</option>
                      {allUsers.map((user) => (
                        <option key={user.uid} value={user.uid}>
                          {user.name} ({user.role === 'admin' ? 'Administrador' : 'Vendedor'})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="flex items-center gap-2">
                      <User size={16} className="text-blue-400" />
                      <span className="text-white">{assignedUser?.name || 'Não atribuído'}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">Descrição do Negócio</label>
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

            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-bold text-white mb-4">Informações da Empresa</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Nome da Empresa</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editData.nome || ''}
                      onChange={(e) => setEditData(prev => ({ ...prev, nome: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-white">{company.nome}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">CNPJ</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editData.cnpj || ''}
                      onChange={(e) => setEditData(prev => ({ ...prev, cnpj: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-white">{company.cnpj || 'Não informado'}</p>
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
                      <span className="text-white">{company.segmento}</span>
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
                      <span className="text-white">{company.regiao}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Tamanho</label>
                  {isEditing ? (
                    <select
                      value={editData.tamanho || ''}
                      onChange={(e) => setEditData(prev => ({ ...prev, tamanho: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Micro (até 9 funcionários)">Micro (até 9 funcionários)</option>
                      <option value="Pequena (10-49 funcionários)">Pequena (10-49 funcionários)</option>
                      <option value="Média (50-249 funcionários)">Média (50-249 funcionários)</option>
                      <option value="Grande (250+ funcionários)">Grande (250+ funcionários)</option>
                    </select>
                  ) : (
                    <p className="text-white">{company.tamanho}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Faturamento</label>
                  {isEditing ? (
                    <select
                      value={editData.faturamento || ''}
                      onChange={(e) => setEditData(prev => ({ ...prev, faturamento: e.target.value }))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="Até R$ 360 mil">Até R$ 360 mil</option>
                      <option value="R$ 360 mil - R$ 4,8 milhões">R$ 360 mil - R$ 4,8 milhões</option>
                      <option value="R$ 4,8 milhões - R$ 300 milhões">R$ 4,8 milhões - R$ 300 milhões</option>
                      <option value="Acima de R$ 300 milhões">Acima de R$ 300 milhões</option>
                      <option value="Não informado">Não informado</option>
                    </select>
                  ) : (
                    <p className="text-white">{company.faturamento}</p>
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
                  <p className="text-gray-300">{company.dores}</p>
                )}
              </div>
            </div>

            {/* Contacts Section */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-bold text-white mb-4">Contatos</h2>
              
              <div className="space-y-4">
                {contacts.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">Nenhum contato cadastrado</p>
                ) : (
                  contacts.map((contact) => (
                    <div key={contact.id} className="bg-gray-700 rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="text-white font-medium">{contact.nome}</h3>
                          <p className="text-gray-400 text-sm">{contact.cargoAlvo}</p>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        {contact.email && (
                          <div className="flex items-center gap-2">
                            <Mail size={16} className="text-blue-400" />
                            <a href={`mailto:${contact.email}`} className="text-blue-400 hover:text-blue-300">
                              {contact.email}
                            </a>
                          </div>
                        )}
                        
                        {contact.whatsapp && (
                          <div className="flex items-center gap-2">
                            <Phone size={16} className="text-green-400" />
                            <a 
                              href={`https://wa.me/${contact.whatsapp.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-green-400 hover:text-green-300"
                            >
                              {contact.whatsapp}
                            </a>
                          </div>
                        )}
                        
                        {contact.linkedin && (
                          <div className="flex items-center gap-2">
                            <Linkedin size={16} className="text-blue-400" />
                            <a
                              href={contact.linkedin}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:text-blue-300"
                            >
                              LinkedIn
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
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

            {/* Quick Actions */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-lg font-bold text-white mb-4">Ações Rápidas</h3>
              <div className="space-y-2">
                {contacts.map((contact) => (
                  <div key={contact.id} className="space-y-2">
                    {contact.email && (
                      <a
                        href={`mailto:${contact.email}`}
                        className="flex items-center gap-2 w-full bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg transition-colors text-sm"
                      >
                        <Mail size={16} />
                        Email - {contact.nome}
                      </a>
                    )}
                    {contact.whatsapp && (
                      <a
                        href={`https://wa.me/${contact.whatsapp.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 w-full bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg transition-colors text-sm"
                      >
                        <Phone size={16} />
                        WhatsApp - {contact.nome}
                      </a>
                    )}
                    {contact.linkedin && (
                      <a
                        href={contact.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 w-full bg-blue-700 hover:bg-blue-800 text-white px-3 py-2 rounded-lg transition-colors text-sm"
                      >
                        <Linkedin size={16} />
                        LinkedIn - {contact.nome}
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
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