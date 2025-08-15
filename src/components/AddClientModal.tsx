import { useState } from 'react';
import { X, Save, Loader2, ChevronDown } from 'lucide-react';
import { addDoc, collection, query, getDocs, where, setDoc, doc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { ClientType, ServiceType, UserType, PipelineStageType, CompanyType } from '../types';

interface AddClientModalProps {
  onClose: () => void;
  services: ServiceType[];
  userData: UserType | null;
  stages: PipelineStageType[];
}

const AddClientModal = ({ onClose, services, userData, stages }: AddClientModalProps) => {
  const [formData, setFormData] = useState<Omit<ClientType, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'assignedTo'>>({
    nome: '',
    empresa: '',
    cnpj: '',
    email: '',
    whatsapp: '',
    linkedin: '',
    segmento: '',
    regiao: '',
    tamanho: '',
    faturamento: '',
    cargoAlvo: '',
    dores: '',
    stage: stages.length > 0 ? stages[0].id : '',
    serviceId: '',
    planId: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [companies, setCompanies] = useState<CompanyType[]>([]);
  const [showCompanySuggestions, setShowCompanySuggestions] = useState(false);
  const [filteredCompanies, setFilteredCompanies] = useState<CompanyType[]>([]);

  const selectedService = services.find(s => s.id === formData.serviceId);
  const activeStages = stages.filter(stage => stage.active).sort((a, b) => a.position - b.position);

  // Fetch companies for autocomplete
  const fetchCompanies = async () => {
    try {
      const companiesQuery = query(collection(db, 'companies'));
      const companiesSnapshot = await getDocs(companiesQuery);
      const companiesData = companiesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as CompanyType[];
      setCompanies(companiesData);
    } catch (error) {
      console.error('Error fetching companies:', error);
    }
  };

  // Initialize companies on mount
  useState(() => {
    fetchCompanies();
  }, []);
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
      // Reset planId when service changes
      ...(name === 'serviceId' ? { planId: '' } : {})
    }));

    // Handle company autocomplete
    if (name === 'empresa') {
      const filtered = companies.filter(company => 
        company.name.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredCompanies(filtered);
      setShowCompanySuggestions(value.length > 0 && filtered.length > 0);
    }
  };

  const handleCompanySelect = (companyName: string) => {
    setFormData(prev => ({ ...prev, empresa: companyName }));
    setShowCompanySuggestions(false);
  };

  const saveCompanyIfNew = async (companyName: string) => {
    if (!auth.currentUser || !companyName.trim()) return;

    const existingCompany = companies.find(c => 
      c.name.toLowerCase() === companyName.toLowerCase()
    );

    if (!existingCompany) {
      try {
        const companyData: Omit<CompanyType, 'id'> = {
          name: companyName.trim(),
          createdBy: auth.currentUser.uid,
          createdAt: new Date().toISOString()
        };
        
        await addDoc(collection(db, 'companies'), companyData);
        await fetchCompanies(); // Refresh companies list
      } catch (error) {
        console.error('Error saving company:', error);
      }
    }
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !userData) return;

    if (!formData.serviceId || !formData.planId) {
      setError('Serviço e plano são obrigatórios');
      return;
    }

    if (!formData.stage) {
      setError('Etapa é obrigatória');
      return;
    }
    setIsSubmitting(true);
    setError('');

    try {
      // Save company if it's new
      await saveCompanyIfNew(formData.empresa);

      const clientData: Omit<ClientType, 'id'> = {
        ...formData,
        assignedTo: auth.currentUser.uid,
        createdBy: auth.currentUser.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'clients'), clientData);

      // Add initial interaction
      await addDoc(collection(db, 'interactions'), {
        clientId: 'temp', // Will be updated after client creation
        userId: auth.currentUser.uid,
        userName: userData.name,
        type: 'note',
        title: 'Cliente Criado',
        description: `Cliente ${formData.nome} da empresa ${formData.empresa} foi adicionado ao pipeline`,
        date: new Date().toISOString(),
        createdAt: new Date().toISOString()
      });

      onClose();
    } catch (error) {
      console.error('Error adding client:', error);
      setError('Erro ao adicionar cliente. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">Novo Cliente</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="text-red-500 text-center bg-red-900/20 p-3 rounded-md border border-red-800">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Nome do Contato *
              </label>
              <input
                type="text"
                name="nome"
                value={formData.nome}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nome completo"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Empresa *
              </label>
              <input
                type="text"
                name="empresa"
                value={formData.empresa}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nome da empresa"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Serviço *
              </label>
              <select
                name="serviceId"
                value={formData.serviceId}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecione o serviço</option>
                {services.map(service => (
                  <option key={service.id} value={service.id}>
                    {service.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Plano *
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Etapa *
              </label>
              <select
                name="stage"
                value={formData.stage}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecione a etapa</option>
                {activeStages.map(stage => (
                  <option key={stage.id} value={stage.id}>
                    {stage.name}
                  </option>
                ))}
              </select>
            </div>
              </label>
              <select
                name="planId"
                value={formData.planId}
                onChange={handleChange}
                required
                disabled={!selectedService}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <option value="">Selecione o plano</option>
                {selectedService?.plans.filter(plan => plan.active).map(plan => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} - R$ {plan.price.toLocaleString()} ({plan.duration})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Email *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="email@empresa.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                WhatsApp
              </label>
              <input
                type="text"
                name="whatsapp"
                value={formData.whatsapp}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="(11) 99999-9999"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Segmento *
              </label>
              <select
                name="segmento"
                value={formData.segmento}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                name="regiao"
                value={formData.regiao}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                name="tamanho"
                value={formData.tamanho}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                Cargo Alvo *
              </label>
              <input
                type="text"
                name="cargoAlvo"
                value={formData.cargoAlvo}
                onChange={handleChange}
                required
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: CEO, CTO, Diretor de TI"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Dores/Necessidades *
            </label>
            <textarea
              name="dores"
              value={formData.dores}
              onChange={handleChange}
              required
              rows={4}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Descreva as principais dores e necessidades da empresa..."
            />
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
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save size={20} />
                  Adicionar Cliente
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddClientModal;