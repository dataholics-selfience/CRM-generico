import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useTheme } from '../contexts/ThemeContext';
import Sidebar from './Sidebar';
import ChatInterface from './ChatInterface';
import { MessageType, SegmentType } from '../types';

const welcomeMessages = [
  "Olá! Sou seu assistente de CRM inteligente. Crie um novo segmento de clientes e vou ajudar você a desenvolver estratégias personalizadas!",
  "Bem-vindo ao CRM DATAHOLICS! Estou aqui para ajudar você a gerenciar e otimizar seus segmentos de clientes.",
  "Oi! Sou seu consultor de CRM. Vamos criar segmentos de clientes eficazes e estratégias de relacionamento?",
  "Olá! Como seu assistente de CRM, estou pronto para ajudar você a segmentar e engajar seus clientes. Vamos começar?",
  "Bem-vindo! Sou especialista em CRM e estou aqui para transformar seus dados de clientes em insights valiosos!"
];

const Layout = () => {
  const { isDarkMode } = useTheme();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [segments, setSegments] = useState<SegmentType[]>([]);
  const [currentSegmentId, setCurrentSegmentId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!auth.currentUser) {
      setIsLoading(false);
      return;
    }

    const segmentsQuery = query(
      collection(db, 'segments'),
      where('userId', '==', auth.currentUser.uid)
    );

    const unsubscribeSegments = onSnapshot(segmentsQuery, (snapshot) => {
      const newSegments = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as SegmentType[];
      
      // Sort by createdAt on the client side
      newSegments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      
      setSegments(newSegments);

      if (newSegments.length === 0) {
        const randomMessage = welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
        setMessages([{
          id: 'welcome',
          role: 'assistant',
          content: randomMessage,
          timestamp: new Date().toISOString()
        }]);
      } else if (!currentSegmentId) {
        setCurrentSegmentId(newSegments[0].id);
      }
      
      setIsLoading(false);
    }, (error) => {
      console.error('Error fetching segments:', error);
      setIsLoading(false);
    });

    return () => unsubscribeSegments();
  }, [currentSegmentId]);

  useEffect(() => {
    if (!auth.currentUser || !currentSegmentId) return;

    const messagesQuery = query(
      collection(db, 'segments', currentSegmentId, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const newMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as MessageType[];
      setMessages(newMessages);
    });

    return () => unsubscribe();
  }, [currentSegmentId]);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const addMessage = async (message: Omit<MessageType, 'id' | 'timestamp'>) => {
    if (!auth.currentUser || !currentSegmentId) return;

    const newMessage = {
      ...message,
      timestamp: new Date().toISOString(),
      userId: auth.currentUser.uid
    };

    try {
      await addDoc(collection(db, 'segments', currentSegmentId, 'messages'), newMessage);
    } catch (error) {
      console.error('Error adding message:', error);
    }
  };

  const selectSegment = (segmentId: string) => {
    setCurrentSegmentId(segmentId);
    setIsSidebarOpen(false);
  };

  if (isLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDarkMode ? 'bg-black' : 'bg-white'}`}>
        <div className="animate-pulse text-white text-lg">Carregando...</div>
      </div>
    );
  }

  return (
    <div className={`flex h-screen ${isDarkMode ? 'bg-black text-gray-100' : 'bg-white text-gray-900'}`}>
      <Sidebar 
        isOpen={isSidebarOpen} 
        toggleSidebar={toggleSidebar}
        segments={segments}
        currentSegmentId={currentSegmentId}
        onSelectSegment={selectSegment}
      />
      <ChatInterface 
        messages={messages} 
        addMessage={addMessage} 
        toggleSidebar={toggleSidebar}
        isSidebarOpen={isSidebarOpen}
        currentSegment={segments.find(s => s.id === currentSegmentId)}
      />
    </div>
  );
};

export default Layout;