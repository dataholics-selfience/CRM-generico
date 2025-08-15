import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, where, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useTheme } from '../contexts/ThemeContext';
import Sidebar from './Sidebar';
import { UserType } from '../types';
import { doc, getDoc } from 'firebase/firestore';

const Layout = ({ children }: { children: React.ReactNode }) => {
  const { isDarkMode } = useTheme();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [userData, setUserData] = useState<UserType | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!auth.currentUser) {
        setIsLoading(false);
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data() as UserType);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, []);

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
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
        userData={userData}
      />
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
};

export default Layout;