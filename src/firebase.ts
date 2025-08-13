import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBpWG5w5ENIP0qPLTpcFSJj0bTsWcHrWzo",
  authDomain: "crm-generico-857f1.firebaseapp.com",
  projectId: "crm-generico-857f1",
  storageBucket: "crm-generico-857f1.firebasestorage.app",
  messagingSenderId: "825440015706",
  appId: "1:825440015706:web:4f964e45a793f418804f63"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get Auth and Firestore instances
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;