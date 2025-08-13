import { useState } from 'react';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { addDoc, collection } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { ManualCompanyType } from '../types';

interface AddManualCompanyProps {
  onBack: () => void;
  onCompanyAdded: () => void;
}

const AddManualCompany = ({ onBack, onCompanyAdded }: AddManualCompanyProps) => {
  const [formData, setFormData] = useState<Omit<ManualCompanyType, 'id' | 'createdAt' | 'updatedAt'>>({
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
    dores: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    setIsSubmitting(true);
    setError('');

    try {
      const companyData: Omit<ManualCompanyType, 'id'> = {
        ...formData,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Add to selectedStartups collection with "mapeada" stage
      await addDoc(collection(db, 'selectedStartups'), {
        userId: auth.currentUser.uid,
        userEmail: auth.currentUser.email,
        challengeId: 'manual',
        challengeTitle: 'Empresa Adicionada Manualmente',
        startupName: formData.empresa,
        startupData: {
          name: formData.empresa,
          description: formData.dores,
          rating: 0,
          website: '',
          category: formData.segmento,
          vertical: formData.segmento,
          foundedYear: '',
          teamSize: formData.tamanho,
          businessModel: '',
          email: formData.email,
          ipoStatus: '',
          city: formData.regiao,
          reasonForChoice: 'Empresa adicionada manualmente',
          socialLinks: {
            linkedin: formData.linkedin
          }
        },
        manualCompanyData: companyData,
        selectedAt: new Date().toISOString(),
        stage: 'mapeada',
        updatedAt: new Date().toISOString(),
        isManual: true
      });

      onCompanyAdded();
    } catch (error) {
      console.error('Error adding company:', error);
      setError('Erro ao adicionar empresa. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black">
      <div className="flex flex-col p-3 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="text-gray-300 hover:text-white focus:outline-none"
          >
            <ArrowLeft size={20} />
          </button>
          <div className="flex items-center gap-2 flex-1 ml-4">
            <h2 className="text-lg font-medium text-white">Adicionar Empresa Manualmente</h2>
          </div>
        </div>
      </div>

      <div className="p-8">
        <div className="max-w-2xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="text-red-500 text-center bg-red-900/20 p-3 rounded-md border border-red-800">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nome da empresa"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  CNPJ
                </label>
                <input
                  type="text"
                  name="cnpj"
                  value={formData.cnpj}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="00.000.000/0000-00"
                />
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
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="(11) 99999-9999"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  LinkedIn
                </label>
                <input
                  type="url"
                  name="linkedin"
                  value={formData.linkedin}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://linkedin.com/in/perfil"
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
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  name="faturamento"
                  value={formData.faturamento}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Selecione o faturamento</option>
                  <option value="Até R$ 360 mil">Até R$ 360 mil</option>
                  <option value="R$ 360 mil - R$ 4,8 milhões">R$ 360 mil - R$ 4,8 milhões</option>
                  <option value="R$ 4,8 milhões - R$ 300 milhões">R$ 4,8 milhões - R$ 300 milhões</option>
                  <option value="Acima de R$ 300 milhões">Acima de R$ 300 milhões</option>
                  <option value="Não informado">Não informado</option>
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
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Descreva as principais dores e necessidades da empresa..."
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 rounded-md text-white text-lg font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save size={20} />
                  Adicionar Empresa
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddManualCompany;