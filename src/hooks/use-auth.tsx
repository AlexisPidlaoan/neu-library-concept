
"use client"

import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut, 
  User, 
  GoogleAuthProvider,
  signInAnonymously
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

const { auth, firestore: db } = initializeFirebase();
const googleProvider = new GoogleAuthProvider();

interface AuthContextType {
  user: User | null;
  profile: any | null;
  loading: boolean;
  pendingStudentId: string | null;
  login: () => Promise<void>;
  loginWithId: (studentId: string) => Promise<void>;
  cancelLinking: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  pendingStudentId: null,
  login: async () => {},
  loginWithId: async (id: string) => {},
  cancelLinking: () => {},
  logout: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingStudentId, setPendingStudentId] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // Domain check for Google users
        if (firebaseUser.providerData.length > 0 && firebaseUser.providerData[0].providerId === 'google.com') {
          if (!firebaseUser.email?.endsWith('@neu.edu.ph')) {
            await signOut(auth);
            toast({
              variant: 'destructive',
              title: 'Invalid Institutional Email',
              description: 'Access denied. You must use your official @neu.edu.ph institutional Google account.',
            });
            setUser(null);
            setProfile(null);
            setLoading(false);
            return;
          }
        }

        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.isBlocked) {
            await signOut(auth);
            toast({
              variant: 'destructive',
              title: 'Access Blocked',
              description: 'Your account has been blocked by an administrator.',
            });
            setUser(null);
            setProfile(null);
            setLoading(false);
            return;
          }

          // If we have a pendingStudentId, link it now
          if (pendingStudentId) {
            await updateDoc(userDocRef, {
              studentId: pendingStudentId,
              updatedAt: new Date().toISOString()
            });
            userData.studentId = pendingStudentId;
            setPendingStudentId(null);
            toast({
              title: 'ID Linked!',
              description: `Student ID ${pendingStudentId} is now linked to your account.`,
            });
          }

          setProfile(userData);
          setUser(firebaseUser);
        } else if (firebaseUser.providerData.length > 0) {
          // New Google User
          const newProfile = {
            id: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL,
            role: 'student',
            studentId: pendingStudentId || null,
            isBlocked: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          await setDoc(userDocRef, newProfile);
          setPendingStudentId(null);
          setProfile(newProfile);
          setUser(firebaseUser);
        } else {
          // Anonymous user session for checking existing ID
          setUser(firebaseUser);
        }
      } else {
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [pendingStudentId, toast]);

  const login = async () => {
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error('Login failed:', error);
      toast({
        variant: 'destructive',
        title: 'Authentication Error',
        description: error.message || 'Failed to sign in with Google.',
      });
    } finally {
      setLoading(false);
    }
  };

  const loginWithId = async (studentId: string) => {
    setLoading(true);
    try {
      // Must be signed in (even anonymously) to satisfy security rules for querying users
      if (!auth.currentUser) {
        await signInAnonymously(auth);
      }

      // Query with limit(1) to be efficient and satisfy security rules
      const q = query(
        collection(db, 'users'), 
        where('studentId', '==', studentId),
        limit(1)
      );
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        // First time ID - trigger linking flow
        setPendingStudentId(studentId);
        toast({
          title: 'New Student ID',
          description: 'This ID is not registered. Please sign in with Google to link it.',
        });
        setLoading(false);
        return;
      }

      const userData = querySnapshot.docs[0].data();
      if (userData.isBlocked) {
        throw new Error('This Student ID is currently blocked.');
      }

      setProfile(userData);
      router.push('/dashboard/check-in');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: error.message,
      });
      setLoading(false);
    }
  };

  const cancelLinking = () => {
    setPendingStudentId(null);
  };

  const logout = async () => {
    await signOut(auth);
    setPendingStudentId(null);
    router.push('/');
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, pendingStudentId, login, loginWithId, cancelLinking, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
