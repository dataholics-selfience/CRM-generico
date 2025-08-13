import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { doc, getDoc, addDoc, collection } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useTheme } from '../contexts/ThemeContext';

const NewSegment = () => {
  const [formData, setFormData] = useState({
    title: '',
    description: ''
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) {
      setError('Usuário não autenticado');
      return;
    }

    setIsSubmitting(true);

    try {
      const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
      const userData = userDoc.data();
      
      if (!userData) {
        setError('Dados do usuário não encontrados');
        return;
      }

      const firstName = userData.name?.split(' ')[0] || '';
      const sessionId = uuidv4().replace(/-/g, '');

      // Create segment first
      const segmentRef = await addDoc(collection(db, 'segments'), {
        userId: auth.currentUser.uid,
        userEmail: auth.currentUser.email,
        company: userData.company,
        title: formData.title,
        description: formData.description,
        sessionId,
        createdAt: new Date().toISOString()
      });

      // Prepare webhook message
      const message = `Olá, sou ${firstName}, um profissional de CRM da empresa ${userData.company || ''}. Estou criando um novo segmento de clientes chamado "${formData.title}". A descrição do segmento é: ${formData.description}. Por favor, me ajude a desenvolver estratégias para este segmento de clientes.`;

      console.log('Sending webhook message:', {
        sessionId,
        message,
        segmentId: segmentRef.id
      });

      // Determine webhook endpoint based on dev mode
      const isDevMode = localStorage.getItem('devMode') === 'true';
      const webhookUrl = isDevMode 
        ? 'https://primary-production-2e3b.up.railway.app/webhook-test/CRM-Generico'
        : 'https://primary-production-2e3b.up.railway.app/webhook/CRM-Generico';

      // Send webhook message
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          sessionId,
        }),
      });

      if (!response.ok) {
        console.error('Webhook response error:', await response.text());
        throw new Error('Failed to send initial message');
      }

      // Save user message
      await addDoc(collection(db, 'segments', segmentRef.id, 'messages'), {
        userId: auth.currentUser.uid,
        role: 'user',
        content: message,
        timestamp: new Date().toISOString(),
        hidden: true
      });

      // Handle webhook response
      try {
        const data = await response.json();
        if (data[0]?.output) {
          await addDoc(collection(db, 'segments', segmentRef.id, 'messages'), {
            userId: auth.currentUser.uid,
            role: 'assistant',
            content: data[0].output,
            timestamp: new Date().toISOString()
          });
        }
      } catch (jsonError) {
        console.error('Error parsing webhook response:', jsonError);
        // Add a default assistant message if JSON parsing fails
        await addDoc(collection(db, 'segments', segmentRef.id, 'messages'), {
          userId: auth.currentUser.uid,
          role: 'assistant',
          content: 'Segmento criado com sucesso! Como posso ajudar você a desenvolver estratégias para este segmento?',
          timestamp: new Date().toISOString()
        });
      }

      // Navigate to home page
      navigate('/');
    } catch (error) {
      console.error('Error creating segment:', error);
      setError('Erro ao criar segmento. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`min-h-screen p-4 ${isDarkMode ? 'bg-black' : 'bg-white'}`}>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate(-1)}
            className={`${isDarkMode ? 'text-gray-300 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}
          >
            <ArrowLeft size={24} />
          </button>
          <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Novo Segmento de Clientes
          </h1>
          <div className="w-6" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="text-red-500 text-center bg-red-900/20 p-3 rounded-md border border-red-800">
              {error}
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Título do Segmento
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  isDarkMode 
                    ? 'bg-gray-800 border-gray-700 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
                placeholder="Digite o título do segmento"
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Descrição do Segmento
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                rows={4}
                className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
                  isDarkMode 
                    ? 'bg-gray-800 border-gray-700 text-white' 
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
                placeholder="Descreva o segmento de clientes em detalhes"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 rounded-md text-white text-lg font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center justify-center gap-2"
          >
            <span>Criar Segmento</span>
            {isSubmitting && <Loader2 className="w-5 h-5 animate-spin" />}
          </button>
        </form>
      </div>
    </div>
  );
};

export default NewSegment;