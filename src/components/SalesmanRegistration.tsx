import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Loader2, UserPlus } from 'lucide-react';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { doc, setDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { ServiceType } from '../types';
import { useTheme } from '../contexts/ThemeContext';

const SalesmanRegistration = () => {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  const [services, setServices] = useState<ServiceType[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    linkedin: '',
    description: '',
    serviceIds: [] as string[],
    password: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useState(() => {
    const fetchServices = async () => {
      try {
        const servicesSnapshot = await getDocs(collection(db, 'services'));
        const servicesData = servicesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as ServiceType[];
        setServices(servicesData.filter(s => s.active));
      } catch (error) {
        console.error('Error fetching services:', error);
      }
    };

    fetchServices();
  });

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, password }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (name === 'serviceIds') {
      const checkbox = e.target as HTMLInputElement;
      if (checkbox.checked) {
        setFormData(prev => ({
          ...prev,
          serviceIds: [...prev.serviceIds, value]
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          serviceIds: prev.serviceIds.filter(id => id !== value)
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      // Check if email already exists
      const existingUserQuery = query(
        collection(db, 'users'),
        where('email', '==', formData.email.toLowerCase().trim())
      );
      const existingUserSnapshot = await getDocs(existingUserQuery);
      
      if (!existingUserSnapshot.empty) {
        setError('Este email já está em uso.');
        setIsSubmitting(false);
        return;
      }

      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email.trim(),
        formData.password
      );
      const newUser = userCredential.user;

      // Create user document in Firestore
      const userData = {
        uid: newUser.uid,
        name: formData.name.trim(),
        cpf: '', // Campo obrigatório mas vazio para vendedores
        company: 'DATAHOLICS', // Empresa padrão
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        linkedin: formData.linkedin.trim(),
        description: formData.description.trim(),
        serviceIds: formData.serviceIds,
        role: 'vendedor',
        emailVerified: true, // Vendedores não precisam verificar email
        createdAt: new Date().toISOString(),
        createdBy: auth.currentUser.uid
      };

      await setDoc(doc(db, 'users', newUser.uid), userData);

      setSuccess(`Vendedor cadastrado com sucesso! O vendedor pode fazer login diretamente com email: ${formData.email} e senha: ${formData.password}`);
      
      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        linkedin: '',
        description: '',
        serviceIds: [],
        password: ''
      });

    } catch (error: any) {
      console.error('Error creating salesman:', error);
      if (error.code === 'auth/email-already-in-use') {
        setError('Este email já está em uso.');
      } else if (error.code === 'auth/invalid-email') {
        setError('Email inválido.');
      } else if (error.code === 'auth/weak-password') {
        setError('A senha deve ter pelo menos 6 caracteres.');
      } else {
        setError('Erro ao cadastrar vendedor. Tente novamente.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

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
            Cadastro de Vendedor
          </h1>
        </div>
      </div>

      <div className="p-6">
        <div className="max-w-2xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="text-red-500 text-center bg-red-900/20 p-3 rounded-md border border-red-800">
                {error}
              </div>
            )}

            {success && (
              <div className="text-green-500 text-center bg-green-900/20 p-3 rounded-md border border-green-800">
                {success}
              </div>
            )}

            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-bold text-white mb-4">Informações Pessoais</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Nome completo do vendedor"
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
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="email@empresa.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    WhatsApp *
                  </label>
                  <input
                    type="text"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    required
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
                    name="linkedin"
                    value={formData.linkedin}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://linkedin.com/in/perfil"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Descrição do Vendedor
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={4}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Descreva a experiência e especialidades do vendedor..."
                />
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-bold text-white mb-4">Serviços Designados</h2>
              
              <div className="space-y-3">
                {services.map((service) => (
                  <label key={service.id} className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      name="serviceIds"
                      value={service.id}
                      checked={formData.serviceIds.includes(service.id)}
                      onChange={handleChange}
                      className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
                    />
                    <div className="flex-1">
                      <div className="text-white font-medium">{service.name}</div>
                      <div className="text-gray-400 text-sm">{service.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-bold text-white mb-4">Senha de Acesso</h2>
              
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Senha Temporária *
                  </label>
                  <input
                    type="text"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Senha que será enviada por email"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={generatePassword}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md font-medium transition-colors"
                  >
                    Gerar Senha
                  </button>
                </div>
              </div>
              
              <p className="text-gray-400 text-sm mt-2">
                O vendedor receberá um email com esta senha e deverá verificar sua conta antes de fazer login.
              </p>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || formData.serviceIds.length === 0}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 rounded-md text-white text-lg font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Cadastrando...
                </>
              ) : (
                <>
                  <UserPlus size={20} />
                  Cadastrar Vendedor
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SalesmanRegistration;