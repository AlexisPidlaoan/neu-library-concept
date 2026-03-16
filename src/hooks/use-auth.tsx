
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  signInWithRedirect, 
  GoogleAuthProvider, 
  signOut, 
  User as FirebaseUser,
  signInAnonymously
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  limit, 
  serverTimestamp 
} from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

const { auth, firestore: db } = initializeFirebase();
const googleProvider = new GoogleAuthProvider();

interface UserProfile {
  id: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: 'student' | 'admin';
  studentId?: string;
  isBlocked: boolean;
  isGuest?: boolean;
}

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  pendingStudentId: string | null;
  login: (isAdmin: boolean) => Promise<void>;
  loginWithId: (id: string) => Promise<void>;
  continueAsGuest: () => Promise<void>;
  cancelLinking: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingStudentId, setPendingStudentId] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Enforce Institutional Domain
        const isInstitutional = firebaseUser.email?.endsWith('@neu.edu.ph');
        const isWhitelisted = ['pampa4858@gmail.com', 'admin@neu.edu.ph'].includes(firebaseUser.email || '');
        
        if (!firebaseUser.isAnonymous && !isInstitutional && !isWhitelisted) {
          await signOut(auth);
          toast({
            variant: 'destructive',
            title: 'Access Denied',
            description: 'Only @neu.edu.ph institutional emails are allowed.'
          });
          setLoading(false);
          return;
        }

        const userRef = doc(db, 'users', firebaseUser.uid);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          const data = userDoc.data() as UserProfile;
          
          if (data.isBlocked) {
            await signOut(auth);
            toast({
              variant: 'destructive',
              title: 'Account Blocked',
              description: 'Your account has been restricted by the library administration.'
            });
            setLoading(false);
            return;
          }

          if (pendingStudentId && !data.studentId && !firebaseUser.isAnonymous) {
            await updateDoc(userRef, { studentId: pendingStudentId });
            data.studentId = pendingStudentId;
            setPendingStudentId(null);
          }
          
          setProfile({ ...data, id: firebaseUser.uid });
          setUser(firebaseUser);
        } else {
          const newProfile: UserProfile = {
            id: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            role: 'student',
            studentId: pendingStudentId || undefined,
            isBlocked: false,
            isGuest: firebaseUser.isAnonymous
          };
          
          await setDoc(userRef, {
            ...newProfile,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          
          setProfile(newProfile);
          setUser(firebaseUser);
          setPendingStudentId(null);
        }
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [pendingStudentId, toast]);

  const login = async (isAdmin: boolean) => {
    try {
      await signInWithRedirect(auth, googleProvider);
    } catch (error) {
      console.error("Login Error:", error);
    }
  };

  const loginWithId = async (id: string) => {
    setLoading(true);
    try {
      const q = query(collection(db, 'users'), where('studentId', '==', id), limit(1));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const userData = querySnapshot.docs[0].data() as UserProfile;
        if (userData.isBlocked) {
          toast({
            variant: 'destructive',
            title: 'Blocked',
            description: 'This ID has been blocked from library access.'
          });
          setLoading(false);
          return;
        }
        setProfile({ ...userData, id: querySnapshot.docs[0].id });
        router.push('/dashboard/check-in');
      } else {
        setPendingStudentId(id);
      }
    } catch (error) {
      console.error("ID Login Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const continueAsGuest = async () => {
    setLoading(true);
    try {
      await signInAnonymously(auth);
      router.push('/dashboard/check-in');
    } catch (error) {
      console.error("Guest Access Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const cancelLinking = () => {
    setPendingStudentId(null);
  };

  const logout = async () => {
    await signOut(auth);
    setProfile(null);
    setUser(null);
    router.push('/');
  };

  return (
    <AuthContext.Provider value={{ 
      user, profile, loading, pendingStudentId, 
      login, loginWithId, 
      continueAsGuest, cancelLinking, logout 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};

export const useAuth = useAuthContext;
