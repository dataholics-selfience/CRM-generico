import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { UserType } from '../types';

interface UserProfileProps {
  hideText?: boolean;
}

const UserProfile = ({ hideText = false }: UserProfileProps) => {
  const [userData, setUserData] = useState<UserType | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!auth.currentUser) return;
      
      try {
        const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
        if (userDoc.exists()) {
          setUserData(userDoc.data() as UserType);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();
  }, []);

  if (!userData) return null;

  const initials = userData.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const firstName = userData.name.split(' ')[0];

  return (
    <div className="flex items-center space-x-3">
      <div className="w-9 h-9 rounded-full bg-blue-900 flex items-center justify-center text-white font-semibold">
        {initials}
      </div>
      {!hideText && (
        <div className="flex flex-col">
          <span className="text-sm font-medium text-gray-300">{firstName}</span>
        </div>
      )}
    </div>
  );
};

export default UserProfile;