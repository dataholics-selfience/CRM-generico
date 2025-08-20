import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Users, Building2, MapPin, Mail, Phone, Linkedin, ChevronDown,
  GripVertical, Trash2, Menu, BarChart3, Settings, UserPlus, Move, Edit
} from 'lucide-react';
import { collection, query, where, getDocs, deleteDoc, doc, updateDoc, addDoc, onSnapshot, getDoc, orderBy } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { ClientType, ServiceType, UserType, PipelineStageType, BusinessType, ContactType, CompanyType } from '../types';
import { useTheme } from '../contexts/ThemeContext';
import Sidebar from './Sidebar';
import AddClientModal from './AddClientModal';

const BusinessCard = ({ 
  business, 
  company,
  contacts,
  onClick, 
  onRemove,
  services
}: { 
  business: BusinessType;
  company: CompanyType | null;
  contacts: ContactType[];
  onClick: () => void;
  onRemove: (id: string) => void;
  services: ServiceType[];
}) => {
  const [isRemoving, setIsRemoving] = useState(false);
  const service = services.find(s => s.id === business.serviceId);
  const plan = service?.plans.find(p => p.id === business.planId);

  const handleRemove = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (isRemoving) return;

    setIsRemoving(true);

    try {
      await deleteDoc(doc(db, 'businesses', business.id));
      onRemove(business.id);
    } catch (error) {
      console.error('Error removing business:', error);
    } finally {
      setIsRemoving(false);
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', business.id);
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
            <h3 className="text-white font-medium text-sm">{company?.nome || 'Empresa não encontrada'}</h3>
            <p className="text-green-400 text-xs font-medium">R$ {business.valor.toLocaleString()}</p>
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

      {service && (
        <div className="bg-gray-800 rounded p-2">
          <div className="text-blue-400 font-medium text-xs">{service.name}</div>
          {plan && (
            <div className="text-gray-400 text-xs">
              {plan.name} - R$ {plan.price.toLocaleString()}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const PipelineStage = ({ 
  stage, 
  businesses,
  companies,
  contacts,
  onDrop, 
  onBusinessClick,
  onRemoveBusiness,
  services,
  navigate
}: { 
  stage: PipelineStageType;
  businesses: BusinessType[];
  companies: CompanyType[];
  contacts: ContactType[];
  onDrop: (businessId: string, newStage: string) => void;
  onBusinessClick: (businessId: string) => void;
  onRemoveBusiness: (id: string) => void;
  services: ServiceType[];
  navigate: (path: string) => void;
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
    
    const businessId = e.dataTransfer.getData('text/plain');
    if (businessId) {
      onDrop(businessId, stage.id);
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
        <div className="flex items-center gap-2">
          <h3 className={`font-bold text-sm px-3 py-1 rounded-full border ${stage.color}`}>
            {stage.name}
          </h3>
          <button
            onClick={() => navigate('/stages')}
            className="text-gray-400 hover:text-white p-1 rounded transition-colors"
            title="Editar etapas"
          >
            <Edit size={14} />
          </button>
        </div>
        <span className="text-gray-400 text-xs">
          {businesses.length} negócio{businesses.length !== 1 ? 's' : ''}
        </span>
      </div>
      
      <div className="space-y-2">
        {businesses.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Plus size={24} className="mx-auto mb-2 opacity-50" />
            <p className="text-xs">Arraste negócios aqui</p>
          </div>
        ) : (
          businesses.map((business) => {
            const company = companies.find(c => c.id === business.companyId);
            const businessContacts = contacts.filter(c => business.contactIds.includes(c.id));
            
            return (
              <BusinessCard
                key={business.id}
                business={business}
                company={company || null}
                contacts={businessContacts}
                onRemove={onRemoveBusiness}
                onClick={() => onBusinessClick(business.id)}
                services={services}
              />
            );
          })
        )}
      </div>
    </div>
  );
};

const Pipeline = () => {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  const [businesses, setBusinesses] = useState<BusinessType[]>([]);
  const [companies, setCompanies] = useState<CompanyType[]>([]);
  const [contacts, setContacts] = useState<ContactType[]>([]);
  const [services, setServices] = useState<ServiceType[]>([]);
  const [stages, setStages] = useState<PipelineStageType[]>([]);
  const [userData, setUserData] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showAddBusiness, setShowAddBusiness] = useState(false);
  const [showAddClient, setShowAddClient] = useState(false);
  const [showAddCompany, setShowAddCompany] = useState(false);
  const [showNewDropdown, setShowNewDropdown] = useState(false);

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

    // Fetch pipeline stages
    const stagesQuery = query(
      collection(db, 'pipelineStages'),
      orderBy('position', 'asc')
    );

    const unsubscribeStages = onSnapshot(stagesQuery, (snapshot) => {
      const stagesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as PipelineStageType[];
      setStages(stagesData);
    });

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

    const unsubscribeBusinesses = onSnapshot(businessesQuery, (snapshot) => {
      const businessesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as BusinessType[];
      
      businessesData.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      setBusinesses(businessesData);
    });

    // Fetch companies
    const companiesQuery = query(collection(db, 'companies'));
    const unsubscribeCompanies = onSnapshot(companiesQuery, (snapshot) => {
      const companiesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CompanyType[];
      setCompanies(companiesData);
    });

    // Fetch contacts
    const contactsQuery = query(collection(db, 'contacts'));
    const unsubscribeContacts = onSnapshot(contactsQuery, (snapshot) => {
      const contactsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ContactType[];
      setContacts(contactsData);
      setLoading(false);
    });

    return () => {
      unsubscribeStages();
      unsubscribeServices();
      unsubscribeBusinesses();
      unsubscribeCompanies();
      unsubscribeContacts();
    };
  }, [userData]);

  const handleStageChange = async (businessId: string, newStage: string) => {
    try {
      const business = businesses.find(b => b.id === businessId);
      if (!business) return;

      await updateDoc(doc(db, 'businesses', businessId), {
        stage: newStage,
        updatedAt: new Date().toISOString()
      });

      // Add interaction record
      await addDoc(collection(db, 'interactions'), {
        businessId,
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
    } catch (error) {
      console.error('Error updating stage:', error);
    }
  };

  const handleBusinessClick = (businessId: string) => {
    navigate(`/negocio/${businessId}`);
  };

  const handleRemoveBusiness = (removedId: string) => {
    setBusinesses(prev => prev.filter(business => business.id !== removedId));
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

  const activeStages = stages.filter(stage => stage.active);

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
            {/* Dropdown "Novo" - movido para primeira posição */}
            <div className="relative">
              <button
                onClick={() => setShowNewDropdown(!showNewDropdown)}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <Plus size={18} />
                Novo
                <ChevronDown size={16} className={`transition-transform ${showNewDropdown ? 'rotate-180' : ''}`} />
              </button>
              
              {showNewDropdown && (
                <div className="absolute left-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-lg border border-gray-700 z-50">
                  <div className="py-2">
                    <button
                      onClick={() => {
                        setShowAddClient(true);
                        setShowNewDropdown(false);
                      }}
                      className="w-full text-left px-4 py-2 text-white hover:bg-gray-700 transition-colors flex items-center gap-2"
                    >
                      <Building2 size={16} />
                      Negócio
                    </button>
                    
                    {userData?.role === 'admin' && (
                      <>
                        <button
                          onClick={() => {
                            navigate('/services');
                            setShowNewDropdown(false);
                          }}
                          className="w-full text-left px-4 py-2 text-white hover:bg-gray-700 transition-colors flex items-center gap-2"
                        >
                          <Settings size={16} />
                          Serviço
                        </button>
                        
                        <button
                          onClick={() => {
                            navigate('/cadastro-vendedor');
                            setShowNewDropdown(false);
                          }}
                          className="w-full text-left px-4 py-2 text-white hover:bg-gray-700 transition-colors flex items-center gap-2"
                        >
                          <UserPlus size={16} />
                          Vendedor
                        </button>
                        
                        <button
                          onClick={() => {
                            navigate('/cadastro-administrador');
                            setShowNewDropdown(false);
                          }}
                          className="w-full text-left px-4 py-2 text-white hover:bg-gray-700 transition-colors flex items-center gap-2"
                        >
                          <Settings size={16} />
                          Administrador
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {userData?.role === 'admin' && (
              <>
                {/* Desktop buttons */}
                <div className="hidden md:flex items-center gap-3">
                  <button
                    onClick={() => navigate('/services')}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    <Settings size={18} />
                    Serviços
                  </button>
                  
                  <button
                    onClick={() => navigate('/stages')}
                    className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    <Edit size={18} />
                    Etapas
                  </button>
                  
                  <button
                    onClick={() => navigate('/dashboard')}
                    className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    <BarChart3 size={18} />
                    Dashboard
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-x-auto p-6">
          <div className="grid gap-4 h-full grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4" style={{ gridTemplateColumns: activeStages.length <= 4 ? `repeat(${activeStages.length}, 1fr)` : undefined }}>
            {activeStages.map((stage) => {
              const stageBusinesses = businesses.filter(business => business.stage === stage.id);
              
              return (
                <div key={stage.id} className="min-w-0">
                  <PipelineStage
                    stage={stage}
                    businesses={stageBusinesses}
                    companies={companies}
                    contacts={contacts}
                    onDrop={handleStageChange}
                    onBusinessClick={handleBusinessClick}
                    onRemoveBusiness={handleRemoveBusiness}
                    services={services}
                    navigate={navigate}
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
          stages={stages}
        />
      )}
      
      {/* Fechar dropdown ao clicar fora */}
      {showNewDropdown && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowNewDropdown(false)}
        />
      )}
    </div>
  );
};

export default Pipeline;