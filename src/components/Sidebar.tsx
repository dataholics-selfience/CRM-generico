import { useState, useEffect } from 'react';
import { Plus, X, FolderClosed, FolderOpen, Rocket, BarChart3, Sun, Moon, Settings } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { Link, useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { useTheme } from '../contexts/ThemeContext';
import UserProfile from './UserProfile';
import { SegmentType, StartupListType } from '../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
  segments: SegmentType[];
  currentSegmentId: string | null;
  onSelectSegment: (segmentId: string) => void;
}

const Sidebar = ({ isOpen, toggleSidebar, segments, currentSegmentId, onSelectSegment }: SidebarProps) => {
  const navigate = useNavigate();
  const { isDarkMode, toggleTheme } = useTheme();
  const [segmentStartups, setSegmentStartups] = useState<Record<string, StartupListType[]>>({});
  const [savedStartupsCount, setSavedStartupsCount] = useState(0);
  const [isDevMode, setIsDevMode] = useState(false);
  const [isAdminUser, setIsAdminUser] = useState(false);

  useEffect(() => {
    if (auth.currentUser?.email === 'innovagenoi@gmail.com') {
      setIsAdminUser(true);
      const savedMode = localStorage.getItem('devMode');
      setIsDevMode(savedMode === 'true');
    }
  }, []);

  useEffect(() => {
    const fetchStartupLists = async () => {
      const startupsBySegment: Record<string, StartupListType[]> = {};
      for (const segment of segments) {
        const q = query(
          collection(db, 'startupLists'),
          where('segmentId', '==', segment.id)
        );
        const querySnapshot = await getDocs(q);
        startupsBySegment[segment.id] = querySnapshot.docs.map(
          doc => ({ id: doc.id, ...doc.data() } as StartupListType)
        );
      }
      setSegmentStartups(startupsBySegment);
    };

    fetchStartupLists();
  }, [segments]);

  useEffect(() => {
    const fetchSavedStartupsCount = async () => {
      if (!auth.currentUser) return;

      try {
        const q = query(
          collection(db, 'selectedStartups'),
          where('userId', '==', auth.currentUser.uid)
        );
        const querySnapshot = await getDocs(q);
        setSavedStartupsCount(querySnapshot.size);
      } catch (error) {
        console.error('Error fetching saved startups count:', error);
      }
    };

    fetchSavedStartupsCount();
  }, []);

  const toggleDevMode = () => {
    const newMode = !isDevMode;
    setIsDevMode(newMode);
    localStorage.setItem('devMode', newMode.toString());
    localStorage.setItem('webhookEndpoint', newMode ? 'development' : 'production');
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const formatDate = (date: string) => {
    const segmentDate = new Date(date);
    return format(segmentDate, "MMMM 'de' yyyy", { locale: ptBR });
  };

  return (
    <>
      <div 
        className={`fixed inset-0 bg-opacity-50 z-20 ${isOpen ? 'block' : 'hidden'} ${isDarkMode ? 'bg-black' : 'bg-gray-900'}`}
        onClick={toggleSidebar}
      />

      <div 
        className={`fixed inset-y-0 left-0 flex flex-col w-64 z-30 transition-transform duration-300 ease-in-out ${
          isDarkMode ? 'bg-[#1a1b2e] text-gray-300' : 'bg-gray-100 text-gray-700'
        } ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className={`flex items-center justify-between p-4 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-300'}`}>
          <h1 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            CRM DATAHOLICS
          </h1>
          <button
            onClick={toggleSidebar}
            className={`w-8 h-8 flex items-center justify-center focus:outline-none rounded-lg border transition-all ${
              isDarkMode 
                ? 'text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 border-gray-700 hover:border-gray-600'
                : 'text-gray-600 hover:text-gray-900 bg-gray-200 hover:bg-gray-300 border-gray-300 hover:border-gray-400'
            }`}
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar">
          <div className="p-3 space-y-2">
            <Link 
              to="/new-segment"
              className="w-full flex items-center gap-2 text-base font-bold bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 text-white p-3 rounded-lg transition-all shadow-lg hover:shadow-xl"
            >
              <Plus size={18} />
              <span>Novo segmento</span>
            </Link>

            <Link 
              to="/saved-startups"
              className="w-full flex items-center gap-2 text-base font-medium bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-700 hover:to-purple-900 text-white p-3 rounded-lg transition-all shadow-lg hover:shadow-xl"
            >
              <BarChart3 size={18} />
              <span>Pipeline CRM</span>
              {savedStartupsCount > 0 && (
                <span className="ml-auto bg-purple-500 text-white text-xs px-2 py-1 rounded-full">
                  {savedStartupsCount}
                </span>
              )}
            </Link>

            <button
              onClick={toggleTheme}
              className={`w-full flex items-center gap-2 text-base font-medium p-3 rounded-lg transition-all ${
                isDarkMode 
                  ? 'bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white'
                  : 'bg-gray-200 hover:bg-gray-300 text-gray-700 hover:text-gray-900'
              }`}
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
              <span>{isDarkMode ? 'Modo Claro' : 'Modo Escuro'}</span>
            </button>
          </div>
            {isAdminUser && (
              <button
                onClick={toggleDevMode}
                className={`w-full flex items-center gap-2 text-base font-medium p-3 rounded-lg transition-all ${
                  isDevMode
                    ? 'bg-orange-600 hover:bg-orange-700 text-white'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                <Settings size={18} />
                <span>{isDevMode ? 'Desenvolvimento' : 'Produção'}</span>
              </button>
            )}

          <div className="px-3 mb-2">
            <h2 className={`text-sm font-normal mb-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Segmentos
            </h2>
          </div>

          <nav className="px-3">
            {segments.map((segment) => {
              const isActive = currentSegmentId === segment.id;
              const startups = segmentStartups[segment.id] || [];
              
              return (
                <div key={segment.id} className="mb-2">
                  <button
                    onClick={() => onSelectSegment(segment.id)}
                    className={`w-full flex flex-col text-sm p-2 rounded-lg transition-all ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-900/40 to-purple-900/40 text-white'
                        : isDarkMode 
                          ? 'text-gray-400 hover:bg-gray-900 hover:text-white'
                          : 'text-gray-600 hover:bg-gray-200 hover:text-gray-900'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {isActive ? (
                        <FolderOpen size={14} className="text-blue-400" />
                      ) : (
                        <FolderClosed size={14} className={isDarkMode ? 'text-gray-500' : 'text-gray-400'} />
                      )}
                      <span className="truncate text-left flex-1">{segment.title}</span>
                      {startups.length > 0 && (
                        <Rocket size={14} className={isDarkMode ? 'text-gray-500' : 'text-gray-400'} />
                      )}
                    </div>
                    <div className={`text-xs pl-6 mt-1 ${isDarkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                      {formatDate(segment.createdAt)}
                    </div>
                  </button>
                </div>
              );
            })}
          </nav>
        </div>

        <div className={`p-4 border-t ${isDarkMode ? 'border-gray-800' : 'border-gray-300'}`}>
          <div className="flex justify-between items-center">
            <Link to="/profile">
              <UserProfile hideText={false} />
            </Link>
            <button
              onClick={handleLogout}
              className={`text-sm transition-colors ${
                isDarkMode 
                  ? 'text-gray-400 hover:text-white' 
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Sair
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;