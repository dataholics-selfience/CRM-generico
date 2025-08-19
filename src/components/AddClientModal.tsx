import { useState } from 'react';
import { X, Save, Loader2, Plus, Trash2 } from 'lucide-react';
import { addDoc, collection, doc, setDoc, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { ServiceType, UserType, PipelineStageType } from '../types';

interface AddClientModalProps {
  onClose: () => void;
  services: ServiceType[];
  userData: UserType | null;
  stages: PipelineStageType[];
}

const AddClientModal = ({ onClose, services, userData, stages }: AddClientModalProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [userServices, setUserServices] = useState<ServiceType[]>([]);

  // Filter services based on user role and assigned services
  useState(() => {
    const filterServices = async () => {
      if (!userData) return;
      
      if (userData.role === 'admin') {
        // Admin sees all services
        setUserServices(services);
      } else {
        // Vendedor sees only assigned services
        try {
          const userDoc = await getDocs(query(
            collection(db, 'users'),
            where('uid', '==', userData.uid)
          ));
          
          if (!userDoc.empty) {
            const userDataFromDb = userDoc.docs[0].data();
            const assignedServiceIds = userDataFromDb.serviceIds || [];
            const filteredServices = services.filter(service => 
              assignedServiceIds.includes(service.id)
            );
            setUserServices(filteredServices);
          }
        } catch (error) {
          console.error('Error fetching user services:', error);
          setUserServices([]);
        }
      }
    };

    filterServices();
  });

  // Company data
  const [companyData, setCompanyData] = useState({
    nome: '',
    cnpj: '',
    segmento: '',
    regiao: '',
    tamanho: '',
    faturamento: '',
    dores: ''
  });

  // Contacts data
  const [contacts, setContacts] = useState([{
    nome: '',
    email: '',
    whatsapp: '',
    linkedin: '',
    cargoAlvo: ''
  }]);

  // Business data
  const [businessData, setBusinessData] = useState({
    nome: '',
    valor: 0,
    serviceId: '',
    planId: '',
    stage: stages.length > 0 ? stages[0].id : '',
    description: ''
  });

  const handleCompanyChange = (field: string, value: string) => {
    setCompanyData(prev => ({ ...prev, [field]: value }));
  };

  const handleContactChange = (index: number, field: string, value: string) => {
    setContacts(prev => prev.map((contact, i) => 
      i === index ? { ...contact, [field]: value } : contact
    ));
  };

  const handleBusinessChange = (field: string, value: string | number) => {
    setBusinessData(prev => ({ ...prev, [field]: value }));
  };

  const addContact = () => {
    setContacts(prev => [...prev, {
      nome: '',
      email: '',
      whatsapp: '',
      linkedin: '',
      cargoAlvo: ''
    }]);
  };

  const removeContact = (index: number) => {
    if (contacts.length > 1) {
      setContacts(prev => prev.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !userData) return;

    setIsSubmitting(true);
    setError('');

    try {
      // Create company
      const companyRef = await addDoc(collection(db, 'companies'), {
        ...companyData,
        createdBy: auth.currentUser.uid,
        createdAt: new Date().toISOString()
      });

      // Create contacts
      const contactIds: string[] = [];
      for (const contact of contacts) {
        if (contact.nome.trim()) {
          const contactRef = await addDoc(collection(db, 'contacts'), {
            ...contact,
            companyId: companyRef.id,
            createdBy: auth.currentUser.uid,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
          contactIds.push(contactRef.id);
        }
      }

      // Create business
      await addDoc(collection(db, 'businesses'), {
        ...businessData,
        companyId: companyRef.id,
        contactIds,
        assignedTo: auth.currentUser.uid,
        createdBy: auth.currentUser.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      onClose();
    } catch (error) {
      console.error('Error creating business:', error);
      setError('Erro ao criar negócio. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedService = userServices.find(s => s.id === businessData.serviceId);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">Novo Negócio</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="text-red-500 text-center bg-red-900/20 p-3 rounded-md border border-red-800 mb-6">
              {error}
            </div>
          )}

          {/* Step Navigation */}
          <div className="flex items-center justify-center mb-6">
            <div className="flex items-center space-x-4">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-600 text-gray-400'
              }`}>
                1
              </div>
              <div className={`w-12 h-1 ${currentStep > 1 ? 'bg-blue-600' : 'bg-gray-600'}`} />
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-600 text-gray-400'
              }`}>
                2
              </div>
              <div className={`w-12 h-1 ${currentStep > 2 ? 'bg-blue-600' : 'bg-gray-600'}`} />
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                currentStep >= 3 ? 'bg-blue-600 text-white' : 'bg-gray-600 text-gray-400'
              }`}>
                3
              </div>
            </div>
          </div>

          {/* Step 1: Company Information */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-white mb-4">Informações da Empresa</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Nome da Empresa *
                  </label>
                  <input
                    type="text"
                    value={companyData.nome}
                    onChange={(e) => handleCompanyChange('nome', e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nome da empresa"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    CNPJ
                  </label>
                  <input
                    type="text"
                    value={companyData.cnpj}
                    onChange={(e) => handleCompanyChange('cnpj', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="00.000.000/0000-00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Segmento *
                  </label>
                  <select
                    value={companyData.segmento}
                    onChange={(e) => handleCompanyChange('segmento', e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selecione o segmento</option>
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
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Região *
                  </label>
                  <select
                    value={companyData.regiao}
                    onChange={(e) => handleCompanyChange('regiao', e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selecione a região</option>
                    <option value="Norte">Norte</option>
                    <option value="Nordeste">Nordeste</option>
                    <option value="Centro-Oeste">Centro-Oeste</option>
                    <option value="Sudeste">Sudeste</option>
                    <option value="Sul">Sul</option>
                    <option value="Internacional">Internacional</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Tamanho da Empresa *
                  </label>
                  <select
                    value={companyData.tamanho}
                    onChange={(e) => handleCompanyChange('tamanho', e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selecione o tamanho</option>
                    <option value="Micro (até 9 funcionários)">Micro (até 9 funcionários)</option>
                    <option value="Pequena (10-49 funcionários)">Pequena (10-49 funcionários)</option>
                    <option value="Média (50-249 funcionários)">Média (50-249 funcionários)</option>
                    <option value="Grande (250+ funcionários)">Grande (250+ funcionários)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Faturamento Anual
                  </label>
                  <select
                    value={companyData.faturamento}
                    onChange={(e) => handleCompanyChange('faturamento', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selecione o faturamento</option>
                    <option value="Até R$ 360 mil">Até R$ 360 mil</option>
                    <option value="R$ 360 mil - R$ 4,8 milhões">R$ 360 mil - R$ 4,8 milhões</option>
                    <option value="R$ 4,8 milhões - R$ 300 milhões">R$ 4,8 milhões - R$ 300 milhões</option>
                    <option value="Acima de R$ 300 milhões">Acima de R$ 300 milhões</option>
                    <option value="Não informado">Não informado</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Dores/Necessidades *
                </label>
                <textarea
                  value={companyData.dores}
                  onChange={(e) => handleCompanyChange('dores', e.target.value)}
                  required
                  rows={4}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Descreva as principais dores e necessidades da empresa..."
                />
              </div>
            </div>
          )}

          {/* Step 2: Contacts */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-white">Contatos</h3>
                <button
                  type="button"
                  onClick={addContact}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                >
                  <Plus size={16} />
                  Adicionar Contato
                </button>
              </div>

              {contacts.map((contact, index) => (
                <div key={index} className="bg-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-white font-medium">Contato {index + 1}</h4>
                    {contacts.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeContact(index)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Nome *
                      </label>
                      <input
                        type="text"
                        value={contact.nome}
                        onChange={(e) => handleContactChange(index, 'nome', e.target.value)}
                        required
                        className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Nome completo"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Email *
                      </label>
                      <input
                        type="email"
                        value={contact.email}
                        onChange={(e) => handleContactChange(index, 'email', e.target.value)}
                        required
                        className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="email@empresa.com"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        WhatsApp
                      </label>
                      <input
                        type="text"
                        value={contact.whatsapp}
                        onChange={(e) => handleContactChange(index, 'whatsapp', e.target.value)}
                        className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="(11) 99999-9999"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        LinkedIn
                      </label>
                      <input
                        type="url"
                        value={contact.linkedin}
                        onChange={(e) => handleContactChange(index, 'linkedin', e.target.value)}
                        className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="https://linkedin.com/in/perfil"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Cargo *
                      </label>
                      <input
                        type="text"
                        value={contact.cargoAlvo}
                        onChange={(e) => handleContactChange(index, 'cargoAlvo', e.target.value)}
                        required
                        className="w-full px-3 py-2 bg-gray-600 border border-gray-500 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Ex: CEO, CTO, Diretor de TI"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Step 3: Business Details */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-white mb-4">Detalhes do Negócio</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Nome do Negócio *
                  </label>
                  <input
                    type="text"
                    value={businessData.nome}
                    onChange={(e) => handleBusinessChange('nome', e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nome do negócio"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Setup inicial (R$) *
                  </label>
                  <input
                    type="number"
                    value={businessData.valor}
                    onChange={(e) => handleBusinessChange('valor', Number(e.target.value))}
                    required
                    min="0"
                    step="0.01"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Serviço *
                  </label>
                  <select
                    value={businessData.serviceId}
                    onChange={(e) => handleBusinessChange('serviceId', e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Selecione o serviço</option>
                    {userServices.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Plano *
                  </label>
                  <select
                    value={businessData.planId}
                    onChange={(e) => handleBusinessChange('planId', e.target.value)}
                    required
                    disabled={!selectedService}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    <option value="">Selecione o plano</option>
                    {selectedService?.plans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name} - R$ {plan.price.toLocaleString()} ({plan.duration})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Estágio Inicial *
                  </label>
                  <select
                    value={businessData.stage}
                    onChange={(e) => handleBusinessChange('stage', e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {stages.filter(stage => stage.active).map((stage) => (
                      <option key={stage.id} value={stage.id}>
                        {stage.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Descrição do Negócio
                </label>
                <textarea
                  value={businessData.description}
                  onChange={(e) => handleBusinessChange('description', e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Descreva os detalhes do negócio..."
                />
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-6">
            <div>
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={() => setCurrentStep(prev => prev - 1)}
                  className="py-2 px-4 bg-gray-600 hover:bg-gray-700 rounded-md text-white font-medium transition-colors"
                >
                  Anterior
                </button>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="py-2 px-4 bg-gray-600 hover:bg-gray-700 rounded-md text-white font-medium transition-colors"
              >
                Cancelar
              </button>
              
              {currentStep < 3 ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep(prev => prev + 1)}
                  className="py-2 px-4 bg-blue-600 hover:bg-blue-700 rounded-md text-white font-medium transition-colors"
                >
                  Próximo
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="py-2 px-4 bg-green-600 hover:bg-green-700 rounded-md text-white font-medium transition-colors flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    <>
                      <Save size={20} />
                      Criar Negócio
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddClientModal;