import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword, sendEmailVerification } from 'firebase/auth';
import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { useTheme } from '../../contexts/ThemeContext';
import { v4 as uuidv4 } from 'uuid';

const Register = () => {
  const { isDarkMode } = useTheme();
  const [formData, setFormData] = useState({
    name: '',
    cpf: '',
    company: '',
    email: '',
    phone: '',
    password: '',
    terms: false
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const isAdminEmail = (email: string) => {
    const adminEmails = ['daniel.mendes@dataholics.io', 'thays.perpetua@dataholics.io'];
    return adminEmails.includes(email.toLowerCase().trim());
  };

  const checkDeletedUser = async (email: string) => {
    const q = query(
      collection(db, 'deletedUsers'),
      where('email', '==', email.toLowerCase().trim())
    );
    
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.terms) {
      setError('Você precisa aceitar os termos de uso para continuar.');
      return;
    }
    
    setError('');
    setIsLoading(true);

    try {
      // Check if email was previously deleted
      const isDeleted = await checkDeletedUser(formData.email);
      if (isDeleted) {
        setError('Email e dados já excluídos da plataforma');
        setIsLoading(false);
        return;
      }

      // Create the authentication user
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        formData.email.trim(), 
        formData.password
      );
      const user = userCredential.user;

      const transactionId = crypto.randomUUID();
      const isAdmin = isAdminEmail(formData.email);

      // Prepare user data
      const userData = {
        uid: user.uid,
        name: formData.name.trim(),
        cpf: formData.cpf.trim(),
        company: formData.company.trim(),
        email: formData.email.trim().toLowerCase(),
        phone: formData.phone.trim(),
        role: isAdmin ? 'admin' : 'vendedor',
        emailVerified: isAdmin, // Admin emails don't need verification
        acceptedTerms: true,
        createdAt: new Date().toISOString(),
        termsAcceptanceId: transactionId
      };

      // Create the user document in Firestore
      await setDoc(doc(db, 'users', user.uid), userData);


      // Create GDPR compliance record for terms acceptance
      await setDoc(doc(collection(db, 'gdprCompliance'), transactionId), {
        uid: user.uid,
        email: formData.email.trim().toLowerCase(),
        type: 'terms_acceptance',
        acceptedTerms: true,
        acceptedAt: new Date().toISOString(),
        transactionId
      });

      // Create GDPR compliance record for registration
      await setDoc(doc(collection(db, 'gdprCompliance'), crypto.randomUUID()), {
        uid: user.uid,
        email: formData.email.trim().toLowerCase(),
        type: 'registration',
        registeredAt: new Date().toISOString(),
        transactionId: crypto.randomUUID()
      });

      // Send email verification only for non-admin users
      if (!isAdmin) {
        await sendEmailVerification(user);
        navigate('/verify-email');
      } else {
        // Admin users go directly to the app
        navigate('/');
      }

    } catch (error: any) {
      console.error('Registration error:', error);
      if (error.code === 'auth/email-already-in-use') {
        setError('Este email já está em uso. Por favor, use outro email ou faça login.');
      } else if (error.code === 'auth/invalid-email') {
        setError('Email inválido. Por favor, verifique o email informado.');
      } else if (error.code === 'auth/weak-password') {
        setError('A senha deve ter pelo menos 6 caracteres.');
      } else {
        setError('Erro ao criar conta. Por favor, tente novamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  return (
    <div className={`min-h-screen flex items-center justify-center p-4 ${isDarkMode ? 'bg-black' : 'bg-white'}`}>
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className={`text-4xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            CRM DATAHOLICS
          </h1>
          <h2 className={`mt-6 text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>Criar Conta</h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="text-red-500 text-center bg-red-900/20 p-3 rounded-md border border-red-800">
              {error}
            </div>
          )}
          <div className="space-y-4">
            <input
              type="text"
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
              className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isDarkMode 
                  ? 'bg-gray-800 border-gray-700 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
              placeholder="Nome completo"
            />
            <input
              type="text"
              name="cpf"
              required
              value={formData.cpf}
              onChange={handleChange}
              className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isDarkMode 
                  ? 'bg-gray-800 border-gray-700 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
              placeholder="CPF"
            />
            <input
              type="text"
              name="company"
              required
              value={formData.company}
              onChange={handleChange}
              className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isDarkMode 
                  ? 'bg-gray-800 border-gray-700 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
              placeholder="Empresa"
            />
            <input
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isDarkMode 
                  ? 'bg-gray-800 border-gray-700 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
              placeholder="Email"
            />
            <input
              type="tel"
              name="phone"
              required
              value={formData.phone}
              onChange={handleChange}
              className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isDarkMode 
                  ? 'bg-gray-800 border-gray-700 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
              placeholder="Celular"
            />
            <input
              type="password"
              name="password"
              required
              value={formData.password}
              onChange={handleChange}
              className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                isDarkMode 
                  ? 'bg-gray-800 border-gray-700 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
              placeholder="Senha"
              minLength={6}
            />
            <div className="flex items-center">
              <input
                type="checkbox"
                name="terms"
                checked={formData.terms}
                onChange={handleChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                required
              />
              <label className={`ml-2 block text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Li e aceito os termos de uso
              </label>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading || !formData.terms}
              className={`w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 rounded-md text-white text-lg font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
                isLoading || !formData.terms ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isLoading ? 'Criando conta...' : 'Criar conta'}
            </button>
          </div>

          <div className="text-center">
            <Link to="/login" className="text-lg text-blue-400 hover:text-blue-500 font-medium">
              Já tem uma conta? Faça login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;