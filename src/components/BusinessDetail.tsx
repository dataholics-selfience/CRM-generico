import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Mail, Phone, Linkedin, Building2, MapPin, 
  User, Briefcase, DollarSign, Calendar, MessageSquare,
  Plus, Edit, Save, X, Trash2, Clock, FileText, ChevronLeft, ChevronRight
} from 'lucide-react';
import { 
  doc, getDoc, updateDoc, addDoc, collection, 
  query, where, onSnapshot, deleteDoc, getDocs
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { BusinessType, ServiceType, UserType, PipelineStageType, CompanyType, ContactType } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface BusinessInteractionType {
  id: string;
  businessId: string;
  userId: string;
  userName: string;
  type: 'whatsapp' | 'email' | 'call' | 'social' | 'note' | 'stage_change' | 'field_change';
  title: string;
  description: string;
  date: string;
  createdAt: string;
  metadata?: {
    previousValue?: string;
    newValue?: string;
    field?: string;
  };
}

const BusinessDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  const [business, setBusiness] = useState<BusinessType | null>(null);
  const [company, setCompany] = useState<CompanyType | null>(null);
  const [contacts, setContacts] = useState<ContactType[]>([]);
  const [services, setServices] = useState<ServiceType[]>([]);
  const [stages, setStages] = useState<PipelineStageType[]>([]);
  const [interactions, setInteractions] = useState<BusinessInteractionType[]>([]);
  const [userData, setUserData] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showAddInteraction, setShowAddInteraction] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [showAddContact, setShowAddContact] = useState(false);

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
              const companyData = { id: companyDoc.id, ...companyDoc.data() } as CompanyType;
              setCompany(companyData);
              setEditData(prev => ({ ...prev, company: companyData }));
            }
          }

          // Fetch contacts
          if (businessData.contactIds && businessData.contactIds.length > 0) {
            const contactsQuery = query(
              collection(db, 'contacts'),
              where('__name__', 'in', businessData.contactIds)
            );
            const contactsSnapshot = await getDocs(contactsQuery);
            const contactsData = contactsSnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            })) as ContactType[];
            setContacts(contactsData);
            setEditData(prev => ({ ...prev, contacts: contactsData }));
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
          collection(db, 'businessInteractions'),
          where('businessId', '==', id)
        );
        
        const unsubscribe = onSnapshot(interactionsQuery, (snapshot) => {
          const interactionsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as BusinessInteractionType[];
          
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
      const businessUpdates: any = {
        nome: editData.nome,
        valor: editData.valor,
        serviceId: editData.serviceId,
        planId: editData.planId,
        description: editData.description,
        updatedAt: new Date().toISOString()
      };

      await updateDoc(doc(db, 'businesses', id), businessUpdates);

      if (editData.company && company) {
        const companyUpdates = {
          nome: editData.company.nome,
          segmento: editData.company.segmento,
          regiao: editData.company.regiao,
          tamanho: editData.company.tamanho,
          faturamento: editData.company.faturamento,
          dores: editData.company.dores,
          updatedAt: new Date().toISOString()
        };

        await updateDoc(doc(db, 'companies', company.id), companyUpdates);
        setCompany({ ...company, ...companyUpdates });
      }

      // Update contacts
      if (editData.contacts && contacts.length > 0) {
        for (let i = 0; i < editData.contacts.length; i++) {
          const contact = editData.contacts[i];
          const originalContact = contacts[i];
          if (originalContact) {
            const contactUpdates = {
              nome: contact.nome,
              email: contact.email,
              whatsapp: contact.whatsapp,
              linkedin: contact.linkedin,
              cargoAlvo: contact.cargoAlvo,
              updatedAt: new Date().toISOString()
            };

            await updateDoc(doc(db, 'contacts', originalContact.id), contactUpdates);
          }
        }
      }

      // Add interaction for business update
      await addDoc(collection(db, 'businessInteractions'), {
        businessId: id,
        userId: auth.currentUser?.uid,
        userName: userData?.name || 'Unknown',
        type: 'field_change',
        title: 'Dados Atualizados',
        description: 'Informações do negócio foram atualizadas',
        date: new Date().toISOString(),
        createdAt: new Date().toISOString()
      });

      setBusiness({ ...business, ...businessUpdates });
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating business:', error);
    }
  };

  const handleStageChange = async (newStage: string) => {
    if (!business || !id) return;

    const oldStage = stages.find(s => s.id === business.stage);
    const newStageObj = stages.find(s => s.id === newStage);

    try {
      await updateDoc(doc(db, 'businesses', id), {
        stage: newStage,
        updatedAt: new Date().toISOString()
      });

      // Add interaction for stage change
      await addDoc(collection(db, 'businessInteractions'), {
        businessId: id,
        userId: auth.currentUser?.uid,
        userName: userData?.name || 'Unknown',
        type: 'stage_change',
        title: 'Mudança de Estágio',
        description: `Negócio movido de "${oldStage?.name || 'Desconhecido'}" para "${newStageObj?.name || 'Desconhecido'}"`,
        date: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        metadata: {
          previousValue: oldStage?.name || 'Desconhecido',
          newValue: newStageObj?.name || 'Desconhecido',
          previousStage: business.stage,
          newStage: newStage
        }
      });

      setBusiness({ ...business, stage: newStage });
    } catch (error) {
      console.error('Error updating stage:', error);
    }
  };

  const handleStageNavigation = (direction: 'prev' | 'next') => {
    const currentIndex = stages.findIndex(s => s.id === business?.stage);
    if (currentIndex === -1) return;

    let newIndex;
    if (direction === 'prev' && currentIndex > 0) {
      newIndex = currentIndex - 1;
    } else if (direction === 'next' && currentIndex < stages.length - 1) {
      newIndex = currentIndex + 1;
    } else {
      return;
    }

    const newStage = stages[newIndex];
    if (newStage) {
      handleStageChange(newStage.id);
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
  const currentStageIndex = stages.findIndex(s => s.id === business.stage);

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
            {company?.nome || 'Empresa'} - {business.nome}
          </h1>
          
          {/* Stage Navigation */}
          {currentStage && (
            <div className="flex items-center gap-2 ml-6">
              <button
                onClick={() => handleStageNavigation('prev')}
                disabled={currentStageIndex === 0}
                className={`p-1 rounded transition-colors ${
                  currentStageIndex === 0
                    ? 'text-gray-600 cursor-not-allowed'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <ChevronLeft size={20} />
              </button>
              
              <div className={`px-3 py-1 rounded-full border text-sm font-medium ${currentStage.color}`}>
                {currentStage.name}
              </div>
              
              <button
                onClick={() => handleStageNavigation('next')}
                disabled={currentStageIndex === stages.length - 1}
                className={`p-1 rounded transition-colors ${
                  currentStageIndex === stages.length - 1
                    ? 'text-gray-600 cursor-not-allowed'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}
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
                  setEditData({ ...business, company, contacts });
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
        <div className="flex gap-6 h-[calc(100vh-120px)]">
          {/* Business and Company Information */}
          <div className="flex-1 space-y-6 overflow-y-auto">
            {/* Business Details */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-bold text-white mb-4">Detalhes do Negócio</h2>
              
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
                  <label className="block text-sm font-medium text-gray-300 mb-2">Valor (R$)</label>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editData.valor || 0}
                      onChange={(e) => setEditData(prev => ({ ...prev, valor: Number(e.target.value) }))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <p className="text-green-400 font-bold">R$ {business.valor.toLocaleString()}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Serviço</label>
                  {isEditing ? (
                    <select
                      value={editData.serviceId || ''}
                      onChange={(e) => setEditData(prev => ({ ...prev, serviceId: e.target.value, planId: '' }))}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Selecione o serviço</option>
                      {services.map((service) => (
                        <option key={service.id} value={service.id}>
                          {service.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-white">{service?.name || 'Não definido'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Plano</label>
                  {isEditing ? (
                    <select
                      value={editData.planId || ''}
                      onChange={(e) => setEditData(prev => ({ ...prev, planId: e.target.value }))}
                      disabled={!editData.serviceId}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      <option value="">Selecione o plano</option>
                      {services.find(s => s.id === editData.serviceId)?.plans.map((plan) => (
                        <option key={plan.id} value={plan.id}>
                          {plan.name} - R$ {plan.price.toLocaleString()}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-white">{plan?.name || 'Não definido'}</p>
                  )}
                </div>
              </div>

              {/* Service Information moved here */}
              {service && (
                <div className="mt-6 pt-6 border-t border-gray-700">
                  <h3 className="text-lg font-bold text-white mb-4">Informações do Serviço</h3>
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
                  <p className="text-gray-300">{business.description || 'Sem descrição'}</p>
                )}
              </div>
            </div>

            {/* Company Information */}
            {company && (
              <div className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-xl font-bold text-white mb-4">Informações da Empresa</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Nome da Empresa</label>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editData.company?.nome || ''}
                        onChange={(e) => setEditData(prev => ({ 
                          ...prev, 
                          company: { ...prev.company, nome: e.target.value }
                        }))}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <p className="text-white">{company.nome}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Segmento</label>
                    {isEditing ? (
                      <select
                        value={editData.company?.segmento || ''}
                        onChange={(e) => setEditData(prev => ({ 
                          ...prev, 
                          company: { ...prev.company, segmento: e.target.value }
                        }))}
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
                        value={editData.company?.regiao || ''}
                        onChange={(e) => setEditData(prev => ({ 
                          ...prev, 
                          company: { ...prev.company, regiao: e.target.value }
                        }))}
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
                        value={editData.company?.tamanho || ''}
                        onChange={(e) => setEditData(prev => ({ 
                          ...prev, 
                          company: { ...prev.company, tamanho: e.target.value }
                        }))}
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
                        value={editData.company?.faturamento || ''}
                        onChange={(e) => setEditData(prev => ({ 
                          ...prev, 
                          company: { ...prev.company, faturamento: e.target.value }
                        }))}
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
                      value={editData.company?.dores || ''}
                      onChange={(e) => setEditData(prev => ({ 
                        ...prev, 
                        company: { ...prev.company, dores: e.target.value }
                      }))}
                      rows={4}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  ) : (
                    <p className="text-gray-300">{company.dores}</p>
                  )}
                </div>
              </div>
            )}

            {/* Contacts Information */}
            {contacts.length > 0 && (
              <div className="bg-gray-800 rounded-lg p-6">
                <h2 className="text-xl font-bold text-white mb-4">Contatos</h2>
                
                {contacts.map((contact, index) => (
                  <div key={contact.id} className="mb-6 last:mb-0 pb-6 last:pb-0 border-b border-gray-700 last:border-b-0">
                    <h3 className="text-lg font-medium text-white mb-3">Contato {index + 1}</h3>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Nome</label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editData.contacts?.[index]?.nome || ''}
                            onChange={(e) => {
                              const newContacts = [...(editData.contacts || contacts)];
                              newContacts[index] = { ...newContacts[index], nome: e.target.value };
                              setEditData(prev => ({ ...prev, contacts: newContacts }));
                            }}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        ) : (
                          <p className="text-white">{contact.nome}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                        {isEditing ? (
                          <input
                            type="email"
                            value={editData.contacts?.[index]?.email || ''}
                            onChange={(e) => {
                              const newContacts = [...(editData.contacts || contacts)];
                              newContacts[index] = { ...newContacts[index], email: e.target.value };
                              setEditData(prev => ({ ...prev, contacts: newContacts }));
                            }}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <Mail size={16} className="text-blue-400" />
                            <a href={`mailto:${contact.email}`} className="text-blue-400 hover:text-blue-300">
                              {contact.email}
                            </a>
                          </div>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">WhatsApp</label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editData.contacts?.[index]?.whatsapp || ''}
                            onChange={(e) => {
                              const newContacts = [...(editData.contacts || contacts)];
                              newContacts[index] = { ...newContacts[index], whatsapp: e.target.value };
                              setEditData(prev => ({ ...prev, contacts: newContacts }));
                            }}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        ) : (
                          contact.whatsapp && (
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
                          )
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">LinkedIn</label>
                        {isEditing ? (
                          <input
                            type="url"
                            value={editData.contacts?.[index]?.linkedin || ''}
                            onChange={(e) => {
                              const newContacts = [...(editData.contacts || contacts)];
                              newContacts[index] = { ...newContacts[index], linkedin: e.target.value };
                              setEditData(prev => ({ ...prev, contacts: newContacts }));
                            }}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="https://linkedin.com/in/perfil"
                          />
                        ) : (
                          contact.linkedin && (
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
                          )
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Cargo</label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={editData.contacts?.[index]?.cargoAlvo || ''}
                            onChange={(e) => {
                              const newContacts = [...(editData.contacts || contacts)];
                              newContacts[index] = { ...newContacts[index], cargoAlvo: e.target.value };
                              setEditData(prev => ({ ...prev, contacts: newContacts }));
                            }}
                            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        ) : (
                          <p className="text-white">{contact.cargoAlvo}</p>
                        )}
                      </div>
                    </div>

                    {/* Botões para remover contatos durante edição */}
                    {isEditing && (editData.contacts || contacts).length > 1 && (
                      <div className="flex justify-end mt-4 pt-4 border-t border-gray-600">
                        <button
                          type="button"
                          onClick={() => {
                            const newContacts = [...(editData.contacts || contacts)];
                            newContacts.splice(index, 1);
                            setEditData(prev => ({ ...prev, contacts: newContacts }));
                          }}
                          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
                        >
                          <Trash2 size={16} />
                          Remover Contato
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                
                {/* Botão para adicionar novo contato */}
                <div className="flex justify-center pt-4 border-t border-gray-700">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddContact(true);
                    }}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    <Plus size={16} />
                    Novo Contato
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Timeline Sidebar */}
          <div className="w-1/2 flex flex-col h-full">
            {/* Timeline */}
            <div className="bg-gray-800 rounded-lg p-6 flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Timeline</h3>
                <button
                  onClick={() => setShowAddInteraction(true)}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  <Plus size={16} />
                  Nova Anotação
                </button>
              </div>

              <div className="space-y-4 flex-1 overflow-y-auto">
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
        </div>
      </div>

      {showAddInteraction && (
        <AddInteractionModal
          businessId={id!}
          onClose={() => setShowAddInteraction(false)}
          userData={userData}
        />
      )}

      {showAddContact && (
        <AddContactModal businessId={id!} companyId={company?.id} onClose={() => setShowAddContact(false)} />
      )}
    </div>
  );
};

const InteractionCard = ({ interaction }: { interaction: BusinessInteractionType }) => {
  const getInteractionIcon = (type: string) => {
    switch (type) {
      case 'call': return <Phone size={16} className="text-blue-400" />;
      case 'email': return <Mail size={16} className="text-green-400" />;
      case 'whatsapp': return <MessageSquare size={16} className="text-green-400" />;
      case 'social': return <User size={16} className="text-purple-400" />;
      case 'note': return <FileText size={16} className="text-gray-400" />;
      case 'stage_change': return <Calendar size={16} className="text-orange-400" />;
      case 'field_change': return <Edit size={16} className="text-blue-400" />;
      default: return <MessageSquare size={16} className="text-gray-400" />;
    }
  };

  const getInteractionColor = (type: string) => {
    switch (type) {
      case 'stage_change': return 'border-l-orange-400';
      case 'field_change': return 'border-l-blue-400';
      case 'whatsapp': return 'border-l-green-400';
      case 'email': return 'border-l-green-400';
      case 'call': return 'border-l-blue-400';
      case 'social': return 'border-l-purple-400';
      default: return 'border-l-gray-400';
    }
  };

  return (
    <div className={`bg-gray-700 rounded-lg p-4 border-l-4 ${getInteractionColor(interaction.type)}`}>
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
    description: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const interactionTypes = [
    { value: 'note', label: 'Anotação' },
    { value: 'whatsapp', label: 'WhatsApp' },
    { value: 'email', label: 'Email' },
    { value: 'call', label: 'Ligação' },
    { value: 'social', label: 'Redes Sociais' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !userData) return;

    setIsSubmitting(true);

    try {
      await addDoc(collection(db, 'businessInteractions'), {
        businessId,
        userId: auth.currentUser.uid,
        userName: userData.name,
        type: formData.type,
        title: getDefaultTitle(formData.type),
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

  const getDefaultTitle = (type: string) => {
    const titles = {
      note: 'Anotação',
      whatsapp: 'Contato via WhatsApp',
      email: 'Contato via Email',
      call: 'Ligação',
      social: 'Contato via Redes Sociais'
    };
    return titles[type as keyof typeof titles] || 'Interação';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">Nova Anotação</h2>
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
              {interactionTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
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

const AddContactModal = ({ 
  businessId, 
  companyId,
  onClose 
}: { 
  businessId: string;
  companyId?: string;
  onClose: () => void;
}) => {
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    whatsapp: '',
    linkedin: '',
    cargoAlvo: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !companyId) return;

    setIsSubmitting(true);
    setError('');

    try {
      // Criar o novo contato
      const contactRef = await addDoc(collection(db, 'contacts'), {
        ...formData,
        companyId,
        createdBy: auth.currentUser.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      // Buscar o negócio atual para atualizar os contactIds
      const businessDoc = await getDoc(doc(db, 'businesses', businessId));
      if (businessDoc.exists()) {
        const businessData = businessDoc.data();
        const currentContactIds = businessData.contactIds || [];
        
        // Adicionar o novo contato aos contactIds do negócio
        await updateDoc(doc(db, 'businesses', businessId), {
          contactIds: [...currentContactIds, contactRef.id],
          updatedAt: new Date().toISOString()
        });
      }

      // Adicionar interação
      await addDoc(collection(db, 'businessInteractions'), {
        businessId,
        userId: auth.currentUser.uid,
        userName: 'Sistema',
        type: 'note',
        title: 'Novo Contato Adicionado',
        description: `Contato ${formData.nome} foi adicionado ao negócio`,
        date: new Date().toISOString(),
        createdAt: new Date().toISOString()
      });

      onClose();
      // Recarregar a página para mostrar o novo contato
      window.location.reload();
    } catch (error) {
      console.error('Error adding contact:', error);
      setError('Erro ao adicionar contato. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">Novo Contato</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="text-red-500 text-center bg-red-900/20 p-3 rounded-md border border-red-800">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Nome *
            </label>
            <input
              type="text"
              value={formData.nome}
              onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
              required
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nome completo"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Email *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              required
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="email@empresa.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              WhatsApp
            </label>
            <input
              type="text"
              value={formData.whatsapp}
              onChange={(e) => setFormData(prev => ({ ...prev, whatsapp: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="(11) 99999-9999"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              LinkedIn
            </label>
            <input
              type="url"
              value={formData.linkedin}
              onChange={(e) => setFormData(prev => ({ ...prev, linkedin: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="https://linkedin.com/in/perfil"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Cargo *
            </label>
            <input
              type="text"
              value={formData.cargoAlvo}
              onChange={(e) => setFormData(prev => ({ ...prev, cargoAlvo: e.target.value }))}
              required
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Ex: CEO, CTO, Diretor de TI"
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
              className="flex-1 py-2 px-4 bg-green-600 hover:bg-green-700 rounded-md text-white font-medium transition-colors"
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