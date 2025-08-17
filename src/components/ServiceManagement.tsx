import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Plus, Edit, Trash2, Save, X, Settings,
  DollarSign, Clock, CheckCircle, XCircle, Users
} from 'lucide-react';
import { 
  collection, query, onSnapshot, addDoc, updateDoc, 
  deleteDoc, doc, where, getDocs 
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { ServiceType, ServicePlan } from '../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useTheme } from '../contexts/ThemeContext';

const ServiceManagement = () => {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  const [services, setServices] = useState<ServiceType[]>([]);
  const [showAddService, setShowAddService] = useState(false);
  const [editingService, setEditingService] = useState<ServiceType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const servicesQuery = query(collection(db, 'services'));
    
    const unsubscribe = onSnapshot(servicesQuery, (snapshot) => {
      const servicesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ServiceType[];
      
      servicesData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setServices(servicesData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Initialize default services if none exist
  useEffect(() => {
    const initializeDefaultServices = async () => {
      if (services.length === 0 && !loading && auth.currentUser) {
        const defaultServices = [
          {
            name: 'Credit Score DATAHOLICS',
            description: 'Análise completa de score de crédito e risco',
            plans: [
              {
                id: 'basic',
                name: 'Básico',
                price: 299,
                duration: 'mensal',
                features: ['Consulta básica', 'Relatório simples', 'Suporte por email'],
                active: true
              },
              {
                id: 'premium',
                name: 'Premium',
                price: 599,
                duration: 'mensal',
                features: ['Consulta avançada', 'Relatório detalhado', 'Suporte prioritário', 'API access'],
                active: true
              }
            ],
            active: true,
            createdBy: auth.currentUser.uid,
            createdAt: new Date().toISOString()
          },
          {
            name: 'Gen.OI inovação aberta',
            description: 'Plataforma de inovação aberta e conexão com startups',
            plans: [
              {
                id: 'startup',
                name: 'Startup',
                price: 1999,
                duration: 'mensal',
                features: ['Acesso à plataforma', 'Matching com startups', 'Relatórios mensais'],
                active: true
              },
              {
                id: 'enterprise',
                name: 'Enterprise',
                price: 4999,
                duration: 'mensal',
                features: ['Acesso completo', 'Consultoria especializada', 'Eventos exclusivos', 'Suporte 24/7'],
                active: true
              }
            ],
            active: true,
            createdBy: auth.currentUser.uid,
            createdAt: new Date().toISOString()
          },
          {
            name: 'PatentScope',
            description: 'Análise e monitoramento de patentes',
            plans: [
              {
                id: 'individual',
                name: 'Individual',
                price: 199,
                duration: 'mensal',
                features: ['Busca de patentes', 'Alertas básicos', 'Relatório mensal'],
                active: true
              },
              {
                id: 'corporate',
                name: 'Corporativo',
                price: 899,
                duration: 'mensal',
                features: ['Busca avançada', 'Alertas personalizados', 'Análise competitiva', 'Consultoria'],
                active: true
              }
            ],
            active: true,
            createdBy: auth.currentUser.uid,
            createdAt: new Date().toISOString()
          }
        ];

        for (const service of defaultServices) {
          await addDoc(collection(db, 'services'), service);
        }
      }
    };

    initializeDefaultServices();
  }, [services.length, loading]);

  const handleDeleteService = async (serviceId: string) => {
    // Check if service is being used by any clients
    const clientsQuery = query(
      collection(db, 'clients'),
      where('serviceId', '==', serviceId)
    );
    
    const clientsSnapshot = await getDocs(clientsQuery);
    
    if (!clientsSnapshot.empty) {
      alert('Este serviço não pode ser excluído pois está sendo usado por clientes.');
      return;
    }

    if (confirm('Tem certeza que deseja excluir este serviço?')) {
      await deleteDoc(doc(db, 'services', serviceId));
    }
  };

  const toggleServiceStatus = async (serviceId: string, currentStatus: boolean) => {
    await updateDoc(doc(db, 'services', serviceId), {
      active: !currentStatus
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Carregando serviços...</div>
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
            Gerenciar Serviços
          </h1>
        </div>
        
        <button
          onClick={() => setShowAddService(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <Plus size={18} />
          Novo Serviço
        </button>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {services.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              onEdit={setEditingService}
              onDelete={handleDeleteService}
              onToggleStatus={toggleServiceStatus}
            />
          ))}
        </div>
      </div>

      {showAddService && (
        <ServiceModal
          onClose={() => setShowAddService(false)}
          onSave={() => setShowAddService(false)}
        />
      )}

      {editingService && (
        <ServiceModal
          service={editingService}
          onClose={() => setEditingService(null)}
          onSave={() => setEditingService(null)}
        />
      )}
    </div>
  );
};

const ServiceCard = ({ 
  service, 
  onEdit, 
  onDelete, 
  onToggleStatus
}: { 
  service: ServiceType;
  onEdit: (service: ServiceType) => void;
  onDelete: (id: string) => void;
  onToggleStatus: (id: string, currentStatus: boolean) => void;
}) => {
  return (
    <div className="bg-gray-800 rounded-lg p-6 flex gap-6 h-[400px]">
      {/* Informações do Serviço - 50% da largura */}
      <div className="w-1/2 space-y-4 overflow-y-auto pr-4 custom-scrollbar">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-bold text-white">{service.name}</h3>
              {service.active ? (
                <CheckCircle size={16} className="text-green-400" />
              ) : (
                <XCircle size={16} className="text-red-400" />
              )}
            </div>
            <p className="text-gray-400 text-sm">{service.description}</p>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-300">Planos:</h4>
          {service.plans.map((plan) => (
            <div key={plan.id} className="bg-gray-700 rounded p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-white">{plan.name}</span>
                <div className="flex items-center gap-2">
                  <DollarSign size={14} className="text-green-400" />
                  <span className="text-green-400 font-bold">
                    R$ {plan.price.toLocaleString()}
                  </span>
                  <Clock size={14} className="text-gray-400" />
                  <span className="text-gray-400 text-sm">{plan.duration}</span>
                </div>
              </div>
              <div className="text-xs text-gray-400">
                {plan.features.join(' • ')}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => onToggleStatus(service.id, service.active)}
            className={`flex-1 py-2 px-3 rounded text-sm font-medium transition-colors ${
              service.active
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {service.active ? 'Desativar' : 'Ativar'}
          </button>
        </div>
      </div>

      {/* Timeline/Ações - 50% da largura */}
      <div className="w-1/2 space-y-4 overflow-y-auto pl-4 border-l border-gray-700 custom-scrollbar">
        <h4 className="text-sm font-medium text-gray-300">Ações:</h4>
        
        <div className="space-y-2">
          <button
            onClick={() => onEdit(service)}
            className="w-full flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
          >
            <Edit size={16} />
            Editar Serviço
          </button>
          
          <button
            onClick={() => onDelete(service.id)}
            className="w-full flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded text-sm font-medium transition-colors"
          >
            <Trash2 size={16} />
            Excluir Serviço
          </button>
        </div>

        <div className="pt-4 border-t border-gray-700">
          <h5 className="text-xs font-medium text-gray-400 mb-2">Informações:</h5>
          <div className="space-y-1 text-xs text-gray-500">
            <p>Criado em: {format(new Date(service.createdAt), 'dd/MM/yyyy', { locale: ptBR })}</p>
            <p>Status: {service.active ? 'Ativo' : 'Inativo'}</p>
            <p>Planos: {service.plans.length}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const ServiceModal = ({ 
  service, 
  onClose, 
  onSave 
}: { 
  service?: ServiceType;
  onClose: () => void;
  onSave: () => void;
}) => {
  const [formData, setFormData] = useState({
    name: service?.name || '',
    description: service?.description || '',
    plans: service?.plans || [
      {
        id: 'basic',
        name: 'Básico',
        price: 0,
        duration: 'mensal',
        features: [''],
        active: true
      }
    ]
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    setIsSubmitting(true);

    try {
      const serviceData = {
        ...formData,
        plans: formData.plans.map(plan => ({
          ...plan,
          features: plan.features.filter(f => f.trim() !== '')
        })),
        active: true,
        createdBy: auth.currentUser.uid,
        ...(service ? {} : { createdAt: new Date().toISOString() })
      };

      if (service) {
        await updateDoc(doc(db, 'services', service.id), serviceData);
      } else {
        await addDoc(collection(db, 'services'), serviceData);
      }

      onSave();
    } catch (error) {
      console.error('Error saving service:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const addPlan = () => {
    setFormData(prev => ({
      ...prev,
      plans: [
        ...prev.plans,
        {
          id: `plan_${Date.now()}`,
          name: '',
          price: 0,
          duration: 'mensal',
          features: [''],
          active: true
        }
      ]
    }));
  };

  const removePlan = (index: number) => {
    setFormData(prev => ({
      ...prev,
      plans: prev.plans.filter((_, i) => i !== index)
    }));
  };

  const updatePlan = (index: number, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      plans: prev.plans.map((plan, i) => 
        i === index ? { ...plan, [field]: value } : plan
      )
    }));
  };

  const addFeature = (planIndex: number) => {
    setFormData(prev => ({
      ...prev,
      plans: prev.plans.map((plan, i) => 
        i === planIndex 
          ? { ...plan, features: [...plan.features, ''] }
          : plan
      )
    }));
  };

  const updateFeature = (planIndex: number, featureIndex: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      plans: prev.plans.map((plan, i) => 
        i === planIndex 
          ? { 
              ...plan, 
              features: plan.features.map((feature, j) => 
                j === featureIndex ? value : feature
              )
            }
          : plan
      )
    }));
  };

  const removeFeature = (planIndex: number, featureIndex: number) => {
    setFormData(prev => ({
      ...prev,
      plans: prev.plans.map((plan, i) => 
        i === planIndex 
          ? { 
              ...plan, 
              features: plan.features.filter((_, j) => j !== featureIndex)
            }
          : plan
      )
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">
            {service ? 'Editar Serviço' : 'Novo Serviço'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Nome do Serviço *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                required
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nome do serviço"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Descrição *
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                required
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Descrição do serviço"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-white">Planos</h3>
              <button
                type="button"
                onClick={addPlan}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
              >
                <Plus size={16} />
                Adicionar Plano
              </button>
            </div>

            <div className="space-y-4">
              {formData.plans.map((plan, planIndex) => (
                <div key={planIndex} className="bg-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-white font-medium">Plano {planIndex + 1}</h4>
                    {formData.plans.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removePlan(planIndex)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Nome do Plano *
                      </label>
                      <input
                        type="text"
                        value={plan.name}
                        onChange={(e) => updatePlan(planIndex, 'name', e.target.value)}
                        required
                        className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Nome do plano"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Preço (R$) *
                      </label>
                      <input
                        type="number"
                        value={plan.price}
                        onChange={(e) => updatePlan(planIndex, 'price', Number(e.target.value))}
                        required
                        min="0"
                        step="0.01"
                        className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Duração *
                      </label>
                      <select
                        value={plan.duration}
                        onChange={(e) => updatePlan(planIndex, 'duration', e.target.value)}
                        required
                        className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="mensal">Mensal</option>
                        <option value="anual">Anual</option>
                        <option value="único">Pagamento Único</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-gray-300">
                        Funcionalidades
                      </label>
                      <button
                        type="button"
                        onClick={() => addFeature(planIndex)}
                        className="text-blue-400 hover:text-blue-300 text-sm"
                      >
                        + Adicionar
                      </button>
                    </div>
                    <div className="space-y-2">
                      {plan.features.map((feature, featureIndex) => (
                        <div key={featureIndex} className="flex gap-2">
                          <input
                            type="text"
                            value={feature}
                            onChange={(e) => updateFeature(planIndex, featureIndex, e.target.value)}
                            className="flex-1 px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="Funcionalidade"
                          />
                          {plan.features.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeFeature(planIndex, featureIndex)}
                              className="text-red-400 hover:text-red-300"
                            >
                              <X size={16} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-gray-600 hover:bg-gray-700 rounded-md text-white font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-700 rounded-md text-white font-medium transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save size={20} />
                  {service ? 'Atualizar' : 'Criar'} Serviço
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const ContactManagementModal = ({ 
  service, 
  onClose 
}: { 
  service: ServiceType;
  onClose: () => void;
}) => {
  const [contacts, setContacts] = useState<any[]>([]);
  const [showAddContact, setShowAddContact] = useState(false);
  const [editingContact, setEditingContact] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const contactsQuery = query(
          collection(db, 'serviceContacts'),
          where('serviceId', '==', service.id)
        );
        
        const unsubscribe = onSnapshot(contactsQuery, (snapshot) => {
          const contactsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          contactsData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setContacts(contactsData);
          setLoading(false);
        });

        return () => unsubscribe();
      } catch (error) {
        console.error('Error fetching contacts:', error);
        setLoading(false);
      }
    };

    fetchContacts();
  }, [service.id]);

  const handleDeleteContact = async (contactId: string) => {
    if (confirm('Tem certeza que deseja excluir este contato?')) {
      await deleteDoc(doc(db, 'serviceContacts', contactId));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">
            Contatos - {service.name}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddContact(true)}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              <Plus size={18} />
              Novo Contato
            </button>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <X size={24} />
            </button>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="text-white">Carregando contatos...</div>
            </div>
          ) : contacts.length === 0 ? (
            <div className="text-center py-8">
              <Users size={48} className="text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">Nenhum contato cadastrado</h3>
              <p className="text-gray-400 mb-4">Adicione contatos para este serviço</p>
              <button
                onClick={() => setShowAddContact(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Adicionar Primeiro Contato
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {contacts.map((contact) => (
                <div key={contact.id} className="bg-gray-700 rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-white font-medium">{contact.name}</h3>
                      <p className="text-gray-400 text-sm">{contact.email}</p>
                      {contact.phone && (
                        <p className="text-gray-400 text-sm">{contact.phone}</p>
                      )}
                      {contact.company && (
                        <p className="text-gray-400 text-sm">{contact.company}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setEditingContact(contact)}
                        className="text-blue-400 hover:text-blue-300 p-1"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDeleteContact(contact.id)}
                        className="text-red-400 hover:text-red-300 p-1"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    Criado em {format(new Date(contact.createdAt), 'dd/MM/yyyy', { locale: ptBR })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showAddContact && (
        <ContactModal
          serviceId={service.id}
          onClose={() => setShowAddContact(false)}
          onSave={() => setShowAddContact(false)}
        />
      )}

      {editingContact && (
        <ContactModal
          serviceId={service.id}
          contact={editingContact}
          onClose={() => setEditingContact(null)}
          onSave={() => setEditingContact(null)}
        />
      )}
    </div>
  );
};

const ContactModal = ({ 
  serviceId,
  contact,
  onClose, 
  onSave 
}: { 
  serviceId: string;
  contact?: any;
  onClose: () => void;
  onSave: () => void;
}) => {
  const [formData, setFormData] = useState({
    name: contact?.name || '',
    email: contact?.email || '',
    phone: contact?.phone || '',
    company: contact?.company || '',
    notes: contact?.notes || ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    setIsSubmitting(true);

    try {
      const contactData = {
        ...formData,
        serviceId,
        createdBy: auth.currentUser.uid,
        ...(contact ? { updatedAt: new Date().toISOString() } : { createdAt: new Date().toISOString() })
      };

      if (contact) {
        await updateDoc(doc(db, 'serviceContacts', contact.id), contactData);
      } else {
        await addDoc(collection(db, 'serviceContacts'), contactData);
      }

      onSave();
    } catch (error) {
      console.error('Error saving contact:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[60] p-4">
      <div className="bg-gray-800 rounded-lg max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">
            {contact ? 'Editar Contato' : 'Novo Contato'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Nome *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nome do contato"
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
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="email@exemplo.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Telefone
            </label>
            <input
              type="text"
              value={formData.phone}
              onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="(11) 99999-9999"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Empresa
            </label>
            <input
              type="text"
              value={formData.company}
              onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Nome da empresa"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Observações
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Observações sobre o contato..."
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
              {isSubmitting ? 'Salvando...' : contact ? 'Atualizar' : 'Criar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ServiceManagement;