import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, User, Mail, Phone, Building, Calendar, 
  Edit, Save, X, Key, Eye, EyeOff, UserPlus, Settings,
  Shield, Users as UsersIcon, Trash2
} from 'lucide-react';
import { 
  doc, getDoc, updateDoc, collection, query, 
  where, getDocs, onSnapshot, deleteDoc, setDoc
} from 'firebase/firestore';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { auth, db } from '../../firebase';
import { UserType } from '../../types';
import { useTheme } from '../../contexts/ThemeContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const UserManagementPage = () => {
  const navigate = useNavigate();
  const { isDarkMode } = useTheme();
  const [userData, setUserData] = useState<UserType | null>(null);
  const [allUsers, setAllUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserType | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'admin' | 'vendedor'>('all');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserType | null>(null);

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

          // Verificar se é admin
          if (user.role !== 'admin') {
            navigate('/');
            return;
          }

          // Buscar todos os usuários
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
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [navigate]);

  const handleDeleteUser = (user: UserType) => {
    setUserToDelete(user);
    setShowDeleteModal(true);
  };

  const filteredUsers = allUsers.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.role === filterRole;
    return matchesSearch && matchesRole;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Carregando...</div>
      </div>
    );
  }

  if (!userData || userData.role !== 'admin') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold text-white mb-4">Acesso negado</h2>
          <p className="text-gray-400 mb-4">Apenas administradores podem acessar esta página.</p>
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
            Gerenciar Usuários
          </h1>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/cadastro-vendedor')}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <UserPlus size={18} />
            Cadastrar Vendedor
          </button>
          
          <button
            onClick={() => navigate('/cadastro-administrador')}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            <Settings size={18} />
            Cadastrar Admin
          </button>
        </div>
      </div>

      <div className="p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Filtros e Busca */}
          <div className="bg-gray-800 rounded-lg p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Buscar por nome ou email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value as 'all' | 'admin' | 'vendedor')}
                  className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">Todos os usuários</option>
                  <option value="admin">Administradores</option>
                  <option value="vendedor">Vendedores</option>
                </select>
              </div>
            </div>
          </div>

          {/* Estatísticas */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center gap-3">
                <UsersIcon className="text-blue-400" size={24} />
                <div>
                  <h3 className="text-lg font-bold text-white">{allUsers.length}</h3>
                  <p className="text-gray-400 text-sm">Total de Usuários</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center gap-3">
                <Shield className="text-purple-400" size={24} />
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {allUsers.filter(u => u.role === 'admin').length}
                  </h3>
                  <p className="text-gray-400 text-sm">Administradores</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center gap-3">
                <User className="text-green-400" size={24} />
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {allUsers.filter(u => u.role === 'vendedor').length}
                  </h3>
                  <p className="text-gray-400 text-sm">Vendedores</p>
                </div>
              </div>
            </div>
          </div>

          {/* Lista de Usuários */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4">
              Usuários ({filteredUsers.length})
            </h2>
            
            {filteredUsers.length === 0 ? (
              <div className="text-center py-8">
                <UsersIcon size={48} className="text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">Nenhum usuário encontrado</h3>
                <p className="text-gray-400">Tente ajustar os filtros de busca</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredUsers.map((user) => (
                  <UserCard
                    key={user.uid}
                    user={user}
                    currentUser={userData}
                    onChangePassword={(user) => {
                      setSelectedUser(user);
                      setShowChangePassword(true);
                    }}
                    onDeleteUser={handleDeleteUser}
                  />
                ))}
              </div>
            )}
          </div>
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

      {showDeleteModal && userToDelete && (
        <DeleteUserModal
          user={userToDelete}
          allUsers={allUsers.filter(u => u.uid !== userToDelete.uid)}
          onClose={() => {
            setShowDeleteModal(false);
            setUserToDelete(null);
          }}
        />
      )}
    </div>
  );
};

const UserCard = ({ 
  user, 
  currentUser,
  onChangePassword,
  onDeleteUser
}: { 
  user: UserType;
  currentUser: UserType;
  onChangePassword: (user: UserType) => void;
  onDeleteUser: (user: UserType) => void;
}) => {
  const getRoleColor = (role: string) => {
    return role === 'admin' 
      ? 'bg-purple-900/30 text-purple-400 border border-purple-800'
      : 'bg-blue-900/30 text-blue-400 border border-blue-800';
  };

  const getRoleLabel = (role: string) => {
    return role === 'admin' ? 'Administrador' : 'Vendedor';
  };

  const getRoleIcon = (role: string) => {
    return role === 'admin' ? Shield : User;
  };

  const RoleIcon = getRoleIcon(user.role);

  return (
    <div className="bg-gray-700 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4 flex-1">
          <div className="w-12 h-12 rounded-full bg-blue-900 flex items-center justify-center text-white font-semibold">
            {user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
          </div>
          
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-white font-medium">{user.name}</h3>
              <span className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1 ${getRoleColor(user.role)}`}>
                <RoleIcon size={12} />
                {getRoleLabel(user.role)}
              </span>
              {user.uid === currentUser.uid && (
                <span className="px-2 py-1 rounded text-xs font-medium bg-yellow-900/30 text-yellow-400 border border-yellow-800">
                  Você
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <div className="flex items-center gap-1">
                <Mail size={12} />
                <span>{user.email}</span>
              </div>
              
              {user.phone && (
                <div className="flex items-center gap-1">
                  <Phone size={12} />
                  <span>{user.phone}</span>
                </div>
              )}
              
              <div className="flex items-center gap-1">
                <Calendar size={12} />
                <span>{format(new Date(user.createdAt), 'dd/MM/yyyy', { locale: ptBR })}</span>
              </div>
            </div>
            
            {user.company && (
              <div className="flex items-center gap-1 text-sm text-gray-400 mt-1">
                <Building size={12} />
                <span>{user.company}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className={`px-2 py-1 rounded text-xs ${
            user.emailVerified 
              ? 'bg-green-900/30 text-green-400 border border-green-800'
              : 'bg-red-900/30 text-red-400 border border-red-800'
          }`}>
            {user.emailVerified ? 'Verificado' : 'Não Verificado'}
          </div>
          
          <button
            onClick={() => onChangePassword(user)}
            className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
          >
            <Key size={14} />
            Alterar Senha
          </button>
          
          {user.uid !== currentUser.uid && (
            <button
              onClick={() => onDeleteUser(user)}
              className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm font-medium transition-colors"
            >
              <Trash2 size={14} />
              Excluir
            </button>
          )}
        </div>
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
        
        alert('Senha alterada com sucesso!');
      } else {
        // Admin alterando senha de outro usuário
        // Mostrar a nova senha para o admin informar ao usuário
        alert(`Nova senha para ${user.name}: ${formData.newPassword}\n\nPor favor, informe ao usuário esta nova senha.`);
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

const DeleteUserModal = ({
  user,
  allUsers,
  onClose
}: {
  user: UserType;
  allUsers: UserType[];
  onClose: () => void;
}) => {
  const [selectedReassignUser, setSelectedReassignUser] = useState<string>('');
  const [userBusinesses, setUserBusinesses] = useState<any[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserBusinesses = async () => {
      try {
        const businessesQuery = query(
          collection(db, 'businesses'),
          where('assignedTo', '==', user.uid)
        );
        const businessesSnapshot = await getDocs(businessesQuery);
        const businesses = businessesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setUserBusinesses(businesses);
      } catch (error) {
        console.error('Error fetching user businesses:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserBusinesses();
  }, [user.uid]);

  const handleDeleteUser = async () => {
    if (userBusinesses.length > 0 && !selectedReassignUser) {
      alert('Por favor, selecione um usuário para herdar os negócios.');
      return;
    }

    if (!confirm(`Tem certeza que deseja excluir o usuário ${user.email}?`)) {
      return;
    }

    setIsDeleting(true);

    try {
      // Reatribuir negócios se necessário
      if (userBusinesses.length > 0 && selectedReassignUser) {
        const updatePromises = userBusinesses.map(business =>
          updateDoc(doc(db, 'businesses', business.id), {
            assignedTo: selectedReassignUser,
            updatedAt: new Date().toISOString()
          })
        );
        await Promise.all(updatePromises);
      }

      // Excluir usuário do Firestore
      await deleteDoc(doc(db, 'users', user.uid));
      
      // Adicionar registro de exclusão para GDPR
      await setDoc(doc(collection(db, 'deletedUsers'), user.uid), {
        email: user.email,
        deletedAt: new Date().toISOString(),
        deletedBy: auth.currentUser?.uid,
        businessesReassignedTo: selectedReassignUser || null,
        businessesCount: userBusinesses.length
      });

      alert('Usuário excluído com sucesso.');
      onClose();
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Erro ao excluir usuário.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800 rounded-lg p-6">
          <div className="text-white">Carregando informações do usuário...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white">
            Excluir Usuário
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Trash2 className="text-red-400" size={20} />
              <h3 className="text-red-400 font-medium">Atenção!</h3>
            </div>
            <p className="text-gray-300 text-sm">
              Você está prestes a excluir o usuário <strong>{user.name}</strong> ({user.email}).
              Esta ação não pode ser desfeita.
            </p>
          </div>

          {userBusinesses.length > 0 && (
            <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Building size={20} className="text-yellow-400" />
                <h3 className="text-yellow-400 font-medium">Negócios Atribuídos</h3>
              </div>
              <p className="text-gray-300 text-sm mb-3">
                Este usuário possui <strong>{userBusinesses.length}</strong> negócio(s) atribuído(s).
                Selecione um usuário para herdar essas atribuições:
              </p>
              
              <select
                value={selectedReassignUser}
                onChange={(e) => setSelectedReassignUser(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Selecione um usuário</option>
                {allUsers.map((availableUser) => (
                  <option key={availableUser.uid} value={availableUser.uid}>
                    {availableUser.name} ({availableUser.role === 'admin' ? 'Admin' : 'Vendedor'})
                  </option>
                ))}
              </select>
              
              <div className="mt-3 text-xs text-gray-400">
                <p>Negócios que serão transferidos:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  {userBusinesses.slice(0, 3).map((business) => (
                    <li key={business.id}>{business.nome}</li>
                  ))}
                  {userBusinesses.length > 3 && (
                    <li>... e mais {userBusinesses.length - 3} negócio(s)</li>
                  )}
                </ul>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 bg-gray-600 hover:bg-gray-700 rounded-md text-white font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleDeleteUser}
              disabled={isDeleting || (userBusinesses.length > 0 && !selectedReassignUser)}
              className="flex-1 py-2 px-4 bg-red-600 hover:bg-red-700 rounded-md text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isDeleting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Excluindo...
                </>
              ) : (
                <>
                  <Trash2 size={16} />
                  Excluir Usuário
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserManagementPage;