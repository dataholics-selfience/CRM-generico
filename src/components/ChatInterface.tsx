import { useState, useRef, useEffect } from 'react';
import { Menu, SendHorizontal, Rocket, FolderOpen, Pencil } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { doc, updateDoc, addDoc, collection, query, where, getDocs, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useTheme } from '../contexts/ThemeContext';
import { MessageType, SegmentType, StartupListType } from '../types';
import { LoadingStates } from './LoadingStates';

interface ChatInterfaceProps {
  messages: MessageType[];
  addMessage: (message: Omit<MessageType, 'id' | 'timestamp'>) => void;
  toggleSidebar: () => void;
  isSidebarOpen: boolean;
  currentSegment: SegmentType | undefined;
}

const ChatInterface = ({ messages, addMessage, toggleSidebar, isSidebarOpen, currentSegment }: ChatInterfaceProps) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [userInitials, setUserInitials] = useState('');
  const { isDarkMode } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    title: '',
    description: ''
  });
  const [responseDelay, setResponseDelay] = useState<number>(0);
  const responseTimer = useRef<NodeJS.Timeout>();
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const navigate = useNavigate();

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!auth.currentUser) return;
      
      try {
        const userDoc = await doc(db, 'users', auth.currentUser.uid);
        const userSnapshot = await getDoc(userDoc);
        const userData = userSnapshot.data();
        if (userData?.name) {
          const initials = userData.name
            .split(' ')
            .map((n: string) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
          setUserInitials(initials);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();
  }, []);


  const extractStartupData = (content: string) => {
    try {
      const startMatch = content.indexOf('<startup cards>');
      const endMatch = content.indexOf('</startup cards>');
      
      if (startMatch === -1 || endMatch === -1) return null;
      
      const jsonStr = content.substring(startMatch + 15, endMatch).trim();
      return JSON.parse(jsonStr);
    } catch (error) {
      console.error('Error parsing startup data:', error);
      return null;
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSegment || !auth.currentUser) return;

    try {
      await updateDoc(doc(db, 'segments', currentSegment.id), {
        title: editData.title,
        description: editData.description
      });

      const updateMessage = `Gostaria de atualizar o segmento ${editData.title} com mais informações da descrição: ${editData.description}. Quero que reprocesse esse novo título e descrição e todo histórico deste chat, e me faça uma pergunta sobre estratégias de CRM para este segmento específico. Seja profissional e direto.`;

      await handleSubmit(e, updateMessage);
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating segment:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent, overrideMessage?: string) => {
    e.preventDefault();
    if (!currentSegment || !auth.currentUser) {
      navigate('/new-segment');
      return;
    }
    
    const messageToSend = overrideMessage || input.trim();
    if (messageToSend && !isLoading) {
      setInput('');
      setIsLoading(true);
      
      if (inputRef.current) {
        inputRef.current.style.height = 'auto';
        inputRef.current.disabled = true;
      }

      try {

        if (!overrideMessage) {
          await addMessage({ role: 'user', content: messageToSend });
          scrollToBottom();
        }
        
        responseTimer.current = setTimeout(() => {
          setResponseDelay(prev => prev + 1);
          scrollToBottom();
        }, 3000);

        // Determine webhook endpoint based on dev mode
        const isDevMode = localStorage.getItem('devMode') === 'true';
        const webhookUrl = isDevMode 
          ? 'https://primary-production-2e3b.up.railway.app/webhook-test/CRM-Generico'
          : 'https://primary-production-2e3b.up.railway.app/webhook/CRM-Generico';

        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: messageToSend,
            sessionId: currentSegment.sessionId,
          }),
        });

        if (responseTimer.current) {
          clearTimeout(responseTimer.current);
        }
        setResponseDelay(0);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Webhook error response:', errorText);
          throw new Error(`Failed to send message to webhook: ${response.status} ${response.statusText}`);
        }

        let responseText;
        try {
          responseText = await response.text();
          console.log('Raw webhook response:', responseText);
          
          if (!responseText.trim()) {
            throw new Error('Empty response from webhook');
          }
          
        } catch (jsonError) {
          console.error('JSON parsing error:', jsonError);
          console.error('Response text that failed to parse:', responseText);
          
          // Fallback: add a generic assistant message
          await addMessage({
            role: 'assistant',
            content: 'Recebi sua mensagem e estou processando. Por favor, aguarde um momento.',
            hidden: overrideMessage ? true : false
          });
          return;
        }

        // Try to parse JSON
        let data;
        try {
          data = JSON.parse(responseText);
          console.log('Parsed webhook data:', data);
        } catch (parseError) {
          console.error('Failed to parse JSON:', parseError);
          console.error('Raw response:', responseText);
          
          // If it's not JSON, treat the entire response as the message
          await addMessage({
            role: 'assistant',
            content: responseText,
            hidden: overrideMessage ? true : false
          });
          return;
        }

        // Handle different response formats
        let aiResponse = '';
        
        if (Array.isArray(data) && data.length > 0 && data[0]?.output) {
          // Format: [{ output: "message" }]
          aiResponse = data[0].output;
        } else if (data?.output) {
          // Format: { output: "message" }
          aiResponse = data.output;
        } else if (data?.message) {
          // Format: { message: "message" }
          aiResponse = data.message;
        } else if (typeof data === 'string') {
          // Format: "message"
          aiResponse = data;
        } else {
          console.warn('Unexpected response format:', data);
          aiResponse = 'Recebi sua mensagem, mas houve um problema no formato da resposta.';
        }

        if (aiResponse) {
          const startupData = extractStartupData(aiResponse);

          if (startupData) {
            await addDoc(collection(db, 'startupLists'), {
              userId: auth.currentUser.uid,
              userEmail: auth.currentUser.email,
              segmentId: currentSegment.id,
              segmentTitle: currentSegment.title,
              ...startupData,
              createdAt: new Date().toISOString()
            });

            await addMessage({
              role: 'assistant',
              content: 'Encontrei algumas empresas interessantes para seu segmento! Clique no botão abaixo para ver a lista completa.\n\n<startup-list-button>Ver Lista de Empresas</startup-list-button>',
              hidden: false
            });

            navigate('/startups');
          } else {
            await addMessage({ 
              role: 'assistant', 
              content: aiResponse,
              hidden: overrideMessage ? true : false
            });
            scrollToBottom();
          }
        } else {
          console.error('No valid response content found');
          await addMessage({
            role: 'assistant',
            content: 'Desculpe, não consegui processar sua mensagem adequadamente. Por favor, tente novamente.',
            hidden: overrideMessage ? true : false
          });
        }
      } catch (error) {
        console.error('Error in chat:', error);
        await addMessage({
          role: 'assistant',
          content: 'Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente.'
        });
        scrollToBottom();
      } finally {
        setIsLoading(false);
        if (responseTimer.current) {
          clearTimeout(responseTimer.current);
        }
        setResponseDelay(0);
        if (inputRef.current) {
          inputRef.current.disabled = false;
        }
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleInputClick = () => {
    if (!currentSegment) {
      navigate('/new-segment');
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const target = e.target;
    setInput(target.value);
    target.style.height = 'auto';
    target.style.height = `${Math.min(target.scrollHeight, 200)}px`;
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const renderMessage = (message: MessageType) => {
    if (message.content.includes('<startup-list-button>')) {
      return (
        <div className="space-y-4">
          <p>{message.content.split('<startup-list-button>')[0]}</p>
          <Link
            to="/startups"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg font-bold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
          >
            <Rocket size={20} />
            Ver Lista de Empresas
          </Link>
        </div>
      );
    }


    return <p className="whitespace-pre-wrap">{message.content}</p>;
  };

  const visibleMessages = messages.filter(message => !message.hidden);

  return (
    <div className={`flex flex-col flex-1 h-full overflow-hidden ${isDarkMode ? 'bg-black' : 'bg-white'}`}>
      <div className={`flex flex-col p-3 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}>
        <div className="flex items-center justify-between">
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
          <div className="flex items-center gap-2 flex-1 ml-4">
            <FolderOpen size={20} className={isDarkMode ? 'text-gray-400' : 'text-gray-600'} />
            {isEditing ? (
              <form onSubmit={handleEditSubmit} className="flex-1 space-y-2">
                <input
                  type="text"
                  value={editData.title}
                  onChange={(e) => setEditData(prev => ({ ...prev, title: e.target.value }))}
                  className={`w-full px-3 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    isDarkMode 
                      ? 'bg-gray-800 border-gray-700 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  placeholder="Título do segmento"
                />
                <textarea
                  value={editData.description}
                  onChange={(e) => setEditData(prev => ({ ...prev, description: e.target.value }))}
                  className={`w-full px-3 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
                    isDarkMode 
                      ? 'bg-gray-800 border-gray-700 text-white' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  placeholder="Descrição do segmento"
                  rows={2}
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-white text-sm"
                  >
                    Salvar
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className={`px-3 py-1 rounded text-sm ${
                      isDarkMode 
                        ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                        : 'bg-gray-300 hover:bg-gray-400 text-gray-900'
                    }`}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex items-center justify-between flex-1">
                <div className="flex items-center gap-4">
                  <h2 className={`text-lg font-medium ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    {currentSegment?.title}
                  </h2>
                  <button
                    onClick={() => {
                      setEditData({
                        title: currentSegment?.title || '',
                        description: currentSegment?.description || ''
                      });
                      setIsEditing(true);
                    }}
                    className={`p-1 rounded-full transition-colors ${
                      isDarkMode 
                        ? 'text-gray-400 hover:text-white hover:bg-gray-800'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
                    }`}
                  >
                    <Pencil size={16} />
                  </button>
                </div>
                <StartupListIcons segmentId={currentSegment?.id} />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar">
        {visibleMessages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-3xl rounded-lg p-4 ${
                message.role === 'user'
                  ? 'bg-blue-900 text-white ml-8'
                  : isDarkMode 
                    ? 'bg-gray-800 text-gray-100 mr-8'
                    : 'bg-gray-100 text-gray-900 mr-8'
              }`}
            >
              {message.role === 'assistant' && (
                <div className="flex items-center mb-2">
                  <div className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center text-xs font-semibold mr-2">
                    AI
                  </div>
                  <span className="font-medium">CRM Assistant</span>
                </div>
              )}
              {message.role === 'user' && (
                <div className="flex items-center mb-2 justify-end">
                  <span className="font-medium mr-2">Você</span>
                  <div className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-xs font-semibold">
                    {userInitials}
                  </div>
                </div>
              )}
              {renderMessage(message)}
            </div>
          </div>
        ))}
        {isLoading && responseDelay > 0 && (
          <div className="flex justify-start">
            <div className="max-w-3xl w-full mr-8">
              <LoadingStates />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className={`border-t p-4 ${isDarkMode ? 'border-gray-700' : 'border-gray-300'}`}>
        <form onSubmit={(e) => handleSubmit(e)} className="relative max-w-3xl mx-auto">
          <textarea
            ref={inputRef}
            value={input}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            onClick={handleInputClick}
            placeholder={currentSegment ? "Digite uma mensagem..." : "Selecione um segmento para começar"}
            className={`w-full py-3 pl-4 pr-12 border rounded-lg resize-none overflow-hidden focus:outline-none focus:ring-2 focus:ring-blue-500 max-h-[200px] ${
              isDarkMode 
                ? 'bg-gray-800 border-gray-700 text-gray-100' 
                : 'bg-white border-gray-300 text-gray-900'
            }`}
            rows={1}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className={`absolute right-2 bottom-2.5 p-1.5 rounded-md ${
              input.trim() && !isLoading 
                ? isDarkMode 
                  ? 'text-blue-500 hover:bg-gray-700' 
                  : 'text-blue-500 hover:bg-gray-200'
                : 'text-gray-500'
            } transition-colors`}
          >
            <SendHorizontal size={20} />
          </button>
        </form>
      </div>
    </div>
  );
};

const StartupListIcons = ({ segmentId }: { segmentId?: string }) => {
  const [startupLists, setStartupLists] = useState<StartupListType[]>([]);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    const fetchStartupLists = async () => {
      if (!segmentId) return;
      
      try {
        const q = query(
          collection(db, 'startupLists'),
          where('segmentId', '==', segmentId)
        );
        const querySnapshot = await getDocs(q);
        setStartupLists(querySnapshot.docs.map(
          doc => ({ id: doc.id, ...doc.data() } as StartupListType)
        ));
      } catch (error) {
        console.error('Error fetching startup lists:', error);
      }
    };

    fetchStartupLists();
  }, [segmentId]);

  if (!startupLists.length) return null;

  const visibleLists = showAll ? startupLists : startupLists.slice(0, 3);

  return (
    <div className="flex -space-x-2">
      {visibleLists.map((list) => (
        <Link
          key={list.id}
          to="/startups"
          className="relative group"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center border-2 border-gray-900 hover:border-blue-500 transition-colors shadow-lg hover:shadow-xl">
            <Rocket size={14} className="text-white" />
          </div>
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-xs text-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            Ver lista de empresas
          </div>
        </Link>
      ))}
      {!showAll && startupLists.length > 3 && (
        <button
          onClick={() => setShowAll(true)}
          className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center border-2 border-gray-900 hover:border-gray-700 transition-colors text-gray-400 hover:text-white text-xs font-medium shadow-lg hover:shadow-xl"
        >
          +{startupLists.length - 3}
        </button>
      )}
    </div>
  );
};

export default ChatInterface;