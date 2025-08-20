import { useState } from 'react';
import { X, Save, Loader2, Plus, Trash2, Search } from 'lucide-react';
import { addDoc, collection, doc, setDoc, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { ServiceType, UserType, PipelineStageType } from '../types';
import { 
  fetchCNPJData as importedFetchCNPJData, 
  formatCNPJ, 
  mapPorte, 
  mapFaturamento, 
  determineSegmento, 
  determineRegiao 
} from '../utils/cnpjApi';

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
    fantasia: '',
    cnpj: '',
    abertura: '',
    situacao: '',
    tipo: '',
    porte: '',
    natureza_juridica: '',
    atividade_principal: [] as Array<{code: string, text: string}>,
    atividades_secundarias: [] as Array<{code: string, text: string}>,
    qsa: [] as Array<{nome: string, qual: string}>,
    logradouro: '',
    numero: '',
    complemento: '',
    municipio: '',
    bairro: '',
    uf: '',
    cep: '',
    email: '',
    telefone: '',
    data_situacao: '',
    ultima_atualizacao: '',
    capital_social: '',
    efr: '',
    motivo_situacao: '',
    situacao_especial: '',
    data_situacao_especial: '',
    segmento: '',
    regiao: '',
    tamanho: '',
    faturamento: '',
    dores: ''
  });
  const [isLoadingCNPJ, setIsLoadingCNPJ] = useState(false);
  const [cnpjError, setCnpjError] = useState('');

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
    customPlanPrice: 0,
    discountPercentage: 0,
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

  const handleFetchCNPJDataFromApi = async (cnpj: string) => {
    setIsLoadingCNPJ(true);
    setCnpjError('');

    try {
      const data = await importedFetchCNPJData(cnpj);

      // Atualizar dados da empresa
      setCompanyData(prev => ({
        ...prev,
        nome: data.nome || prev.nome,
        fantasia: data.fantasia || '',
        abertura: data.abertura || '',
        situacao: data.situacao || '',
        tipo: data.tipo || '',
        porte: data.porte || '',
        natureza_juridica: data.natureza_juridica || '',
        atividade_principal: data.atividade_principal || [],
        atividades_secundarias: data.atividades_secundarias || [],
        qsa: data.qsa || [],
        logradouro: data.logradouro || '',
        numero: data.numero || '',
        complemento: data.complemento || '',
        municipio: data.municipio || '',
        bairro: data.bairro || '',
        uf: data.uf || '',
        cep: data.cep || '',
        email: data.email || '',
        telefone: data.telefone || '',
        data_situacao: data.data_situacao || '',
        ultima_atualizacao: data.ultima_atualizacao || '',
        capital_social: data.capital_social || '',
        efr: data.efr || '',
        motivo_situacao: data.motivo_situacao || '',
        situacao_especial: data.situacao_especial || '',
        data_situacao_especial: data.data_situacao_especial || '',
        segmento: determineSegmento(data.atividade_principal),
        regiao: determineRegiao(data.uf),
        tamanho: mapPorte(data.porte),
        faturamento: data.capital_social ? mapFaturamento(data.capital_social) : prev.faturamento,
        dores: `Empresa do segmento ${determineSegmento(data.atividade_principal).toLowerCase()}, ${data.porte.toLowerCase()}. Atividade principal: ${data.atividade_principal?.[0]?.text || 'Não informado'}.`
      }));

      // Atualizar contatos com dados da empresa
      if (data.email || data.telefone) {
        setContacts(prev => {
          const newContacts = [...prev];
          if (newContacts.length > 0) {
            newContacts[0] = {
              ...newContacts[0],
              email: data.email || newContacts[0].email,
              whatsapp: data.telefone || newContacts[0].whatsapp,
              nome: newContacts[0].nome || 'Contato Principal'
            };
          }
          return newContacts;
        });
      }

    } catch (error) {
      console.error('Error fetching CNPJ data:', error);
      setCnpjError(error instanceof Error ? error.message : 'Erro ao consultar CNPJ. Tente novamente.');
    } finally {
      setIsLoadingCNPJ(false);
    }
  };

  const handleCNPJChange = (value: string) => {
    const formattedCNPJ = formatCNPJ(value);
    handleCompanyChange('cnpj', formattedCNPJ);
    setCnpjError('');
    
    // Auto-buscar quando CNPJ estiver completo
    const cleanCNPJ = value.replace(/\D/g, '');
    if (cleanCNPJ.length === 14) {
      handleFetchCNPJDataFromApi(formattedCNPJ);
    }
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
  const selectedPlan = selectedService?.plans.find(p => p.id === businessData.planId);
  
  // Calculate final price with discount
  const calculateFinalPrice = () => {
    let basePrice = 0;
    
    if (businessData.planId === 'custom') {
      basePrice = businessData.customPlanPrice;
    } else if (selectedPlan) {
      basePrice = selectedPlan.price;
    }
    
    if (businessData.discountPercentage > 0) {
      const discount = (basePrice * businessData.discountPercentage) / 100;
      return basePrice - discount;
    }
    
    return basePrice;
  };

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
              <h3 className="text-lg font-medium text-white mb-4">Buscar Empresa por CNPJ</h3>
              
              <div className="max-w-md mx-auto">
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    CNPJ da Empresa *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={companyData.cnpj}
                      onChange={(e) => handleCNPJChange(e.target.value)}
                      required
                      className="w-full px-3 py-2 pr-10 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="00.000.000/0000-00"
                      maxLength={18}
                    />
                    {isLoadingCNPJ && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                      </div>
                    )}
                    {!isLoadingCNPJ && companyData.cnpj.replace(/\D/g, '').length === 14 && (
                      <button
                        type="button"
                        onClick={() => handleFetchCNPJDataFromApi(companyData.cnpj)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-400 hover:text-blue-300"
                        title="Buscar dados do CNPJ"
                      >
                        <Search size={16} />
                      </button>
                    )}
                  </div>
                  {cnpjError && (
                    <p className="text-red-400 text-xs mt-1">{cnpjError}</p>
                  )}
                  <p className="text-gray-500 text-xs mt-1">
                    Digite o CNPJ para buscar automaticamente os dados da empresa
                  </p>
                </div>
              </div>

              {/* Show company data if loaded */}
              {companyData.nome && (
                <div className="bg-gray-700 rounded-lg p-4 mt-6">
                  <h4 className="text-white font-medium mb-4">Dados da Empresa</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Razão Social:</span>
                      <p className="text-white">{companyData.nome}</p>
                    </div>
                    
                    {companyData.fantasia && (
                      <div>
                        <span className="text-gray-400">Nome Fantasia:</span>
                        <p className="text-white">{companyData.fantasia}</p>
                      </div>
                    )}
                    
                    <div>
                      <span className="text-gray-400">Situação:</span>
                      <p className={`font-medium ${companyData.situacao === 'ATIVA' ? 'text-green-400' : 'text-red-400'}`}>
                        {companyData.situacao}
                      </p>
                    </div>
                    
                    <div>
                      <span className="text-gray-400">Porte:</span>
                      <p className="text-white">{companyData.porte}</p>
                    </div>
                    
                    <div>
                      <span className="text-gray-400">Abertura:</span>
                      <p className="text-white">{companyData.abertura}</p>
                    </div>
                    
                    <div>
                      <span className="text-gray-400">Tipo:</span>
                      <p className="text-white">{companyData.tipo}</p>
                    </div>
                    
                    {companyData.email && (
                      <div>
                        <span className="text-gray-400">Email:</span>
                        <p className="text-white">{companyData.email}</p>
                      </div>
                    )}
                    
                    {companyData.telefone && (
                      <div>
                        <span className="text-gray-400">Telefone:</span>
                        <p className="text-white">{companyData.telefone}</p>
                      </div>
                    )}
                    
                    {companyData.capital_social && (
                      <div>
                        <span className="text-gray-400">Capital Social:</span>
                        <p className="text-white">R$ {parseFloat(companyData.capital_social).toLocaleString()}</p>
                      </div>
                    )}
                  </div>
                  
                  {companyData.logradouro && (
                    <div className="mt-4">
                      <span className="text-gray-400">Endereço:</span>
                      <p className="text-white">
                        {companyData.logradouro}, {companyData.numero}
                        {companyData.complemento && ` - ${companyData.complemento}`}
                        <br />
                        {companyData.bairro} - {companyData.municipio}/{companyData.uf}
                        <br />
                        CEP: {companyData.cep}
                      </p>
                    </div>
                  )}
                  
                  {companyData.atividade_principal.length > 0 && (
                    <div className="mt-4">
                      <span className="text-gray-400">Atividade Principal:</span>
                      <p className="text-white">
                        {companyData.atividade_principal[0].code} - {companyData.atividade_principal[0].text}
                      </p>
                    </div>
                  )}
                  
                  {companyData.atividades_secundarias.length > 0 && (
                    <div className="mt-4">
                      <span className="text-gray-400">Atividades Secundárias:</span>
                      <div className="text-white">
                        {companyData.atividades_secundarias.map((atividade, index) => (
                          <p key={index} className="text-sm">
                            {atividade.code} - {atividade.text}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {companyData.qsa.length > 0 && (
                    <div className="mt-4">
                      <span className="text-gray-400">Quadro Societário:</span>
                      <div className="text-white">
                        {companyData.qsa.map((socio, index) => (
                          <p key={index} className="text-sm">
                            {socio.nome} - {socio.qual}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
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
                    disabled={!selectedService}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    <option value="">Nenhum (apenas setup)</option>
                    {selectedService?.plans.map((plan) => (
                      <option key={plan.id} value={plan.id}>
                        {plan.name} - R$ {plan.price.toLocaleString()} ({plan.duration})
                      </option>
                    ))}
                    <option value="custom">Personalizado</option>
                  </select>
                </div>

                {businessData.planId === 'custom' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Valor Mensal Personalizado (R$) *
                    </label>
                    <input
                      type="number"
                      value={businessData.customPlanPrice}
                      onChange={(e) => handleBusinessChange('customPlanPrice', Number(e.target.value))}
                      required
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                    />
                  </div>
                )}

                {userData?.role === 'admin' && (businessData.planId && businessData.planId !== '') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Conceder Desconto (%)
                    </label>
                    <input
                      type="number"
                      value={businessData.discountPercentage}
                      onChange={(e) => handleBusinessChange('discountPercentage', Number(e.target.value))}
                      min="0"
                      max="100"
                      step="0.1"
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0"
                    />
                    {businessData.discountPercentage > 0 && (
                      <div className="mt-2 p-2 bg-green-900/20 border border-green-800 rounded">
                        <p className="text-green-400 text-sm">
                          Preço original: R$ {businessData.planId === 'custom' ? businessData.customPlanPrice.toLocaleString() : (selectedPlan?.price.toLocaleString() || '0')}
                        </p>
                        <p className="text-green-400 text-sm">
                          Desconto: R$ {((businessData.planId === 'custom' ? businessData.customPlanPrice : (selectedPlan?.price || 0)) * businessData.discountPercentage / 100).toLocaleString()}
                        </p>
                        <p className="text-green-400 text-sm font-bold">
                          Preço final: R$ {calculateFinalPrice().toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                )}

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
                  disabled={currentStep === 1 && !companyData.nome}
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