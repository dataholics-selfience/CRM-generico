import { useState, useEffect } from 'react';
import { X, BarChart3, Sun, Moon, Settings, Users, Building, Edit } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { useTheme } from '../contexts/ThemeContext';
import UserProfile from './UserProfile';
import { UserType } from '../types';

interface SidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
  userData: UserType | null;
}

const Sidebar = ({ isOpen, toggleSidebar, userData }: SidebarProps) => {
  const navigate = useNavigate();
  const { isDarkMode, toggleTheme } = useTheme();

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
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
              to="/"
              className="w-full flex items-center gap-2 text-base font-medium bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 text-white p-3 rounded-lg transition-all shadow-lg hover:shadow-xl"
            >
              <Building size={18} />
              <span>Pipeline</span>
            </Link>

            <Link 
              to="/dashboard"
              className="w-full flex items-center gap-2 text-base font-medium bg-gradient-to-r from-purple-600 to-purple-800 hover:from-purple-700 hover:to-purple-900 text-white p-3 rounded-lg transition-all shadow-lg hover:shadow-xl"
            >
              <BarChart3 size={18} />
              <span>Dashboard</span>
            </Link>

            {userData?.role === 'admin' && (
              <>
                <Link 
                  to="/services"
                  className="w-full flex items-center gap-2 text-base font-medium bg-gradient-to-r from-green-600 to-green-800 hover:from-green-700 hover:to-green-900 text-white p-3 rounded-lg transition-all shadow-lg hover:shadow-xl"
                >
                  <Settings size={18} />
                  <span>Gerenciar Serviços</span>
                </Link>

                <Link 
                  to="/stages"
                  className="w-full flex items-center gap-2 text-base font-medium bg-gradient-to-r from-orange-600 to-orange-800 hover:from-orange-700 hover:to-orange-900 text-white p-3 rounded-lg transition-all shadow-lg hover:shadow-xl"
                >
                  <Edit size={18} />
                  <span>Gerenciar Etapas</span>
                </Link>

                <Link 
                  to="/cadastro-administrador"
                  className="w-full flex items-center gap-2 text-base font-medium bg-gradient-to-r from-indigo-600 to-indigo-800 hover:from-indigo-700 hover:to-indigo-900 text-white p-3 rounded-lg transition-all shadow-lg hover:shadow-xl"
                >
                  <Settings size={18} />
                  <span>Cadastrar Admin</span>
                </Link>

                <div className={`px-3 py-2 text-xs font-semibold uppercase tracking-wide ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Administração
                </div>
              </>
            )}

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
          {userData && (
            <div className={`mt-2 text-xs ${isDarkMode ? 'text-gray-500' : 'text-gray-600'}`}>
              {userData.role === 'admin' ? 'Administrador' : 'Vendedor'}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Sidebar;