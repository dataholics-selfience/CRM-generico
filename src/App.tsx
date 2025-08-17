import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';
import { ThemeProvider } from './contexts/ThemeContext';
import Layout from './components/Layout';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import ForgotPassword from './components/auth/ForgotPassword';
import UserManagement from './components/UserProfile/UserManagement';
import EmailVerification from './components/auth/EmailVerification';
import AccountDeleted from './components/AccountDeleted';
import Pipeline from './components/Pipeline';
import ClientDetail from './components/ClientDetail';
import BusinessDetail from './components/BusinessDetail';
import SalesmanRegistration from './components/SalesmanRegistration';
import AdminRegistration from './components/AdminRegistration';
import ServiceManagement from './components/ServiceManagement';
import Dashboard from './components/Dashboard';
import StageManagement from './components/StageManagement';
import { UserType } from './types';

function App() {
  const [user, setUser] = useState<any>(null);
  const [userData, setUserData] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists() && userDoc.data().disabled) {
            await signOut(auth);
            setUser(null);
            setUserData(null);
          } else {
            setUser(user);
            if (userDoc.exists()) {
              setUserData(userDoc.data() as UserType);
            }
          }
        } catch (error) {
          console.error('Error checking user status:', error);
          setUser(user);
        }
      } else {
        setUser(null);
        setUserData(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Carregando...</div>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <Router>
        <Routes>
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/" replace />} />
          <Route path="/register" element={!user ? <Register /> : <Navigate to="/" replace />} />
          <Route path="/forgot-password" element={!user ? <ForgotPassword /> : <Navigate to="/" replace />} />
          <Route path="/verify-email" element={<EmailVerification />} />
          <Route path="/profile" element={userData?.emailVerified ? <UserManagement /> : <Navigate to="/verify-email" replace />} />
          <Route path="/client/:id" element={userData?.emailVerified ? <ClientDetail /> : <Navigate to="/verify-email" replace />} />
          <Route path="/negocio/:id" element={userData?.emailVerified ? <BusinessDetail /> : <Navigate to="/verify-email" replace />} />
          <Route path="/cadastro-vendedor" element={userData?.emailVerified && userData?.role === 'admin' ? <SalesmanRegistration /> : <Navigate to="/" replace />} />
          <Route path="/cadastro-administrador" element={userData?.emailVerified && userData?.role === 'admin' ? <AdminRegistration /> : <Navigate to="/" replace />} />
          <Route path="/services" element={userData?.emailVerified && userData?.role === 'admin' ? <ServiceManagement /> : <Navigate to="/" replace />} />
          <Route path="/stages" element={userData?.emailVerified && userData?.role === 'admin' ? <StageManagement /> : <Navigate to="/" replace />} />
          <Route path="/dashboard" element={userData?.emailVerified ? <Dashboard /> : <Navigate to="/verify-email" replace />} />
          <Route path="/account-deleted" element={<AccountDeleted />} />
          <Route path="/" element={
            user ? (
              userData?.emailVerified ? (
                <Pipeline />
              ) : (
                <Navigate to="/verify-email" replace />
              )
            ) : (
              <Navigate to="/login" replace />
            )
          } />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;