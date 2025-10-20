import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trash2, Save, X } from 'lucide-react';
import {
  collection, getDocs, doc, deleteDoc, updateDoc, query, where
} from 'firebase/firestore';
import { getAuth, updatePassword, signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '../../firebase';
import { UserType } from '../../types';

const UserManagementPage = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserType[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<UserType | null>(null);
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    cpf: '',
    newPassword: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      if (!auth.currentUser) {
        navigate('/login');
        return;
      }

      const userDoc = await getDocs(query(collection(db, 'users'), where('uid', '==', auth.currentUser.uid)));
      if (!userDoc.empty) {
        const userData = userDoc.docs[0].data() as UserType;
        setCurrentUser(userData);

        if (userData.role !== 'admin') {
          navigate('/');
          return;
        }
      }

      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersData = usersSnapshot.docs.map(doc => ({
        ...doc.data(),
        uid: doc.id
      })) as UserType[];

      setUsers(usersData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Tem certeza que deseja excluir este usuário?')) return;

    try {
      await deleteDoc(doc(db, 'users', userId));
      setUsers(users.filter(u => u.uid !== userId));
      alert('Usuário excluído com sucesso');
    } catch (error) {
      console.error('Error deleting user:', error);
      alert('Erro ao excluir usuário');
    }
  };

  const handleEditUser = (user: UserType) => {
    setEditingUser(user);
    setEditForm({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      company: user.company || '',
      cpf: user.cpf || '',
      newPassword: ''
    });
  };

  const handleSaveUser = async () => {
    if (!editingUser) return;

    try {
      const updateData: any = {
        name: editForm.name,
        email: editForm.email,
        phone: editForm.phone,
        company: editForm.company,
        cpf: editForm.cpf
      };

      await updateDoc(doc(db, 'users', editingUser.uid), updateData);

      if (editForm.newPassword && editForm.newPassword.trim() !== '') {
        if (editForm.newPassword.length < 6) {
          alert('A senha deve ter pelo menos 6 caracteres');
          return;
        }

        const currentUserEmail = auth.currentUser?.email;
        const targetUserEmail = editingUser.email;

        if (currentUserEmail && currentUserEmail !== targetUserEmail) {
          alert(
            `Atenção: Para que a senha seja alterada, é necessário que ${editingUser.name} faça login novamente.\n\n` +
            `Nova senha: ${editForm.newPassword}\n\n` +
            `Por favor, informe ao usuário.`
          );
        } else if (currentUserEmail === targetUserEmail) {
          try {
            const user = auth.currentUser;
            if (user) {
              await updatePassword(user, editForm.newPassword);
              alert('Dados e senha atualizados com sucesso');
            }
          } catch (error: any) {
            console.error('Error updating password:', error);
            if (error.code === 'auth/requires-recent-login') {
              alert('Erro: É necessário fazer login novamente para alterar a senha.');
            } else {
              alert('Erro ao atualizar senha: ' + error.message);
            }
            return;
          }
        }
      }

      setUsers(users.map(u => u.uid === editingUser.uid ? { ...u, ...updateData } : u));
      setEditingUser(null);

      if (!editForm.newPassword || editForm.newPassword.trim() === '') {
        alert('Usuário atualizado com sucesso');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      alert('Erro ao atualizar usuário');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Carregando...</div>
      </div>
    );
  }

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Acesso negado</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="flex items-center gap-4 p-4 border-b border-gray-800">
        <button onClick={() => navigate('/')} className="text-gray-400 hover:text-white">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-white">Gerenciar Usuários</h1>
      </div>

      <div className="p-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-gray-900 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-left text-white">Nome</th>
                  <th className="px-4 py-3 text-left text-white">Email</th>
                  <th className="px-4 py-3 text-left text-white">Telefone</th>
                  <th className="px-4 py-3 text-left text-white">Empresa</th>
                  <th className="px-4 py-3 text-left text-white">Função</th>
                  <th className="px-4 py-3 text-left text-white">Ações</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.uid} className="border-t border-gray-800">
                    <td className="px-4 py-3 text-white">{user.name || '-'}</td>
                    <td className="px-4 py-3 text-white">{user.email || '-'}</td>
                    <td className="px-4 py-3 text-white">{user.phone || '-'}</td>
                    <td className="px-4 py-3 text-white">{user.company || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs ${
                        user.role === 'admin' ? 'bg-cyan-900 text-cyan-300' : 'bg-blue-900 text-blue-300'
                      }`}>
                        {user.role === 'admin' ? 'Admin' : 'Vendedor'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditUser(user)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm"
                        >
                          Editar
                        </button>
                        {user.uid !== currentUser.uid && (
                          <button
                            onClick={() => handleDeleteUser(user.uid)}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm"
                          >
                            Excluir
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-lg max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">Editar Usuário</h2>
              <button onClick={() => setEditingUser(null)} className="text-gray-400 hover:text-white">
                <X size={24} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Nome</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Telefone</label>
                <input
                  type="text"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Empresa</label>
                <input
                  type="text"
                  value={editForm.company}
                  onChange={(e) => setEditForm({...editForm, company: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">CPF</label>
                <input
                  type="text"
                  value={editForm.cpf}
                  onChange={(e) => setEditForm({...editForm, cpf: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Nova Senha (deixe em branco para não alterar)</label>
                <input
                  type="password"
                  value={editForm.newPassword}
                  onChange={(e) => setEditForm({...editForm, newPassword: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white"
                  placeholder="Digite a nova senha"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setEditingUser(null)}
                  className="flex-1 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveUser}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded flex items-center justify-center gap-2"
                >
                  <Save size={16} />
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagementPage;
