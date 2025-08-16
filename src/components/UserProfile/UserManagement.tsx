import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, User, Mail, Phone, Building, Calendar, 
  Edit, Save, X, Key, Eye, EyeOff
} from 'lucide-react';
import { 
  doc, getDoc, updateDoc, collection, query, 
  where, getDocs, onSnapshot 
} from 'firebase/firestore';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { auth, db } from '../../firebase';
import { UserType } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const UserManagement = () => {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  const [userData, setUserData] = useState<UserType | null>(null);
  const [allUsers, setAllUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!auth.currentUser) {
        navigate('/login');
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          const user = userDoc.data() as UserType;
          setUserData(user);

          // Se for admin, buscar todos os usuários
          if (user.role === 'admin') {
            const usersQuery = query(collection(db, 'users'));
            const unsubscribe = onSnapshot(usersQuery, (snapshot) => {
              const users = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
              })) as UserType[];
              
              users.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
              setAllUsers(users);
            });

            return () => unsubscribe();
          }
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Carregando...</div>
      </div>
    );
  }

  if (!userData) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-white mb-4">Usuário não encontrado</h2>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Voltar ao Dashboard
          </button>
        </div>
      </div>
    );
  }

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
            Gerenciamento de Usuários
          </h1>
        </div>
      </div>

      <div className="p-6">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Perfil do usuário atual */}
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Meu Perfil</h2>
              <button
                onClick={() => {
                  setSelectedUser(userData);
                  setShowChangePassword(true);
                }}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <Key size={18} />
                Alterar Senha
              </button>
            </div>

            <UserCard user={userData} />
          </div>

          {/* Lista de todos os usuários (apenas para admin) */}
          {userData.role === 'admin' && (
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-xl font-bold text-white mb-4">Todos os Usuários</h2>
              
              <div className="space-y-4">
                {allUsers.map((user) => (
                  <div key={user.uid} className="bg-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <UserCard user={user} compact />
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setShowChangePassword(true);
                        }}
                        className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        <Key size={16} />
                        Alterar Senha
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {showChangePassword && selectedUser && (
        <ChangePasswordModal
          user={selectedUser}
          currentUser={userData}
          onClose={() => {
            setShowChangePassword(false);
            setSelectedUser(null);
          }}
        />
      )}
    </div>
  );
};

const UserCard = ({ user, compact = false }: { user: UserType; compact?: boolean }) => {
  const getRoleColor = (role: string) => {
    return role === 'admin' 
      ? 'bg-purple-900/30 text-purple-400 border border-purple-800'
      : 'bg-blue-900/30 text-blue-400 border border-blue-800';
  };

  const getRoleLabel = (role: string) => {
    return role === 'admin' ? 'Administrador' : 'Vendedor';
  };

  if (compact) {
    return (
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-blue-900 flex items-center justify-center text-white font-semibold">
          {user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-white font-medium">{user.name}</h3>
            <span className={`px-2 py-1 rounded text-xs font-medium ${getRoleColor(user.role)}`}>
              {getRoleLabel(user.role)}
            </span>
          </div>
          <p className="text-gray-400 text-sm">{user.email}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-blue-900 flex items-center justify-center text-white font-semibold text-xl">
            {user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-xl font-bold text-white">{user.name}</h3>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRoleColor(user.role)}`}>
                {getRoleLabel(user.role)}
              </span>
            </div>
            <p className="text-gray-400">{user.email}</p>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-gray-300">
            <Phone size={16} className="text-green-400" />
            <span>{user.phone}</span>
          </div>
          
          {user.company && (
            <div className="flex items-center gap-2 text-gray-300">
              <Building size={16} className="text-purple-400" />
              <span>{user.company}</span>
            </div>
          )}
          
          <div className="flex items-center gap-2 text-gray-300">
            <Calendar size={16} className="text-blue-400" />
            <span>Criado em {format(new Date(user.createdAt), 'dd/MM/yyyy', { locale: ptBR })}</span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-medium text-gray-300 mb-2">Status da Conta</h4>
          <div className="space-y-2">
            <div className={`px-3 py-2 rounded text-sm ${
              user.emailVerified 
                ? 'bg-green-900/30 text-green-400 border border-green-800'
                : 'bg-red-900/30 text-red-400 border border-red-800'
            }`}>
              {user.emailVerified ? 'Email Verificado' : 'Email Não Verificado'}
            </div>
          </div>
        </div>

        {user.cpf && (
          <div>
            <h4 className="text-sm font-medium text-gray-300 mb-2">CPF</h4>
            <p className="text-white">{user.cpf}</p>
          </div>
        )}
      </div>
    </div>
  );
};

const ChangePasswordModal = ({ 
  user, 
  currentUser,
  onClose 
}: { 
  user: UserType;
  currentUser: UserType;
  onClose: () => void;
}) => {
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const isOwnAccount = user.uid === currentUser.uid;

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ 
      ...prev, 
      newPassword: password,
      confirmPassword: password
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.newPassword !== formData.confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    if (formData.newPassword.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (isOwnAccount) {
        // Alterar própria senha - precisa reautenticar
        if (!formData.currentPassword) {
          setError('Senha atual é obrigatória.');
          setIsSubmitting(false);
          return;
        }

        const credential = EmailAuthProvider.credential(
          auth.currentUser!.email!,
          formData.currentPassword
        );

        await reauthenticateWithCredential(auth.currentUser!, credential);
        await updatePassword(auth.currentUser!, formData.newPassword);
      } else {
        // Admin alterando senha de outro usuário
        // Nota: Isso requer privilégios administrativos no Firebase
        // Por enquanto, vamos apenas mostrar a nova senha para o admin
        alert(`Nova senha para ${user.name}: ${formData.newPassword}\n\nPor favor, informe ao usuário.`);
      }

      onClose();
    } catch (error: any) {
      console.error('Error updating password:', error);
      if (error.code === 'auth/wrong-password') {
        setError('Senha atual incorreta.');
      } else if (error.code === 'auth/weak-password') {
        setError('A senha deve ter pelo menos 6 caracteres.');
      } else {
        setError('Erro ao alterar senha. Tente novamente.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">
            Alterar Senha - {user.name}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="text-red-500 text-center bg-red-900/20 p-3 rounded-md border border-red-800">
              {error}
            </div>
          )}

          {isOwnAccount && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Senha Atual *
              </label>
              <div className="relative">
                <input
                  type={showPasswords.current ? 'text' : 'password'}
                  value={formData.currentPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, currentPassword: e.target.value }))}
                  required
                  className="w-full px-3 py-2 pr-10 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Digite sua senha atual"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswords(prev => ({ ...prev, current: !prev.current }))}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  {showPasswords.current ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Nova Senha *
            </label>
            <div className="relative">
              <input
                type={showPasswords.new ? 'text' : 'password'}
                value={formData.newPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, newPassword: e.target.value }))}
                required
                className="w-full px-3 py-2 pr-10 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Digite a nova senha"
              />
              <button
                type="button"
                onClick={() => setShowPasswords(prev => ({ ...prev, new: !prev.new }))}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showPasswords.new ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Confirmar Nova Senha *
            </label>
            <div className="relative">
              <input
                type={showPasswords.confirm ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                required
                className="w-full px-3 py-2 pr-10 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Confirme a nova senha"
              />
              <button
                type="button"
                onClick={() => setShowPasswords(prev => ({ ...prev, confirm: !prev.confirm }))}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white"
              >
                {showPasswords.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={generatePassword}
            className="w-full py-2 px-4 bg-purple-600 hover:bg-purple-700 rounded-md text-white font-medium transition-colors"
          >
            Gerar Senha Aleatória
          </button>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 bg-gray-600 hover:bg-gray-700 rounded-md text-white font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 rounded-md text-white font-medium transition-colors"
            >
              {isSubmitting ? 'Alterando...' : 'Alterar Senha'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserManagement;