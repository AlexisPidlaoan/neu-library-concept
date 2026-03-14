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
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, limit, serverTimestamp } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

const { auth, firestore: db } = initializeFirebase();
const googleProvider = new GoogleAuthProvider();

// Institutional Admin Emails - Hardcoded for absolute access
const ADMIN_EMAILS = ['alexis.pidlaoan@neu.edu.ph', 'pampa4858@gmail.com'];

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
      try {
        if (firebaseUser) {
          const isGoogleUser = firebaseUser.providerData.some(p => p.providerId === 'google.com');
          const email = firebaseUser.email?.toLowerCase();
          const isInstitutional = email?.endsWith('@neu.edu.ph');
          const isAdminEmail = !!(email && ADMIN_EMAILS.includes(email));

          // 1. Domain Enforcement (Bypass for Super Admins)
          if (isGoogleUser && !isInstitutional && !isAdminEmail) {
            await signOut(auth);
            toast({
              variant: 'destructive',
              title: 'Access Denied',
              description: 'Please use your institutional (@neu.edu.ph) account.',
            });
            setUser(null);
            setProfile(null);
            setLoading(false);
            return;
          }

          setUser(firebaseUser);

          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const adminDocRef = doc(db, 'admins', firebaseUser.uid);
          
          let userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            let userData = { ...userDoc.data(), id: firebaseUser.uid };
            
            if (userData.isBlocked) {
              await signOut(auth);
              toast({ variant: 'destructive', title: 'Account Blocked', description: 'Contact the library administrator.' });
              setUser(null);
              setProfile(null);
              setLoading(false);
              return;
            }

            // Sync Admin Status
            if (isAdminEmail) {
              if (userData.role !== 'admin') {
                await updateDoc(userDocRef, { role: 'admin', updatedAt: serverTimestamp() });
                userData.role = 'admin';
              }
              // Ensure security marker exists for firestore.rules
              setDoc(adminDocRef, { active: true }, { merge: true }).catch(() => {});
            }

            // Handle linking if user was in terminal mode
            if (pendingStudentId) {
              await updateDoc(userDocRef, { studentId: pendingStudentId, updatedAt: serverTimestamp() });
              userData.studentId = pendingStudentId;
              setPendingStudentId(null);
            }

            setProfile(userData);
          } else if (isGoogleUser) {
            // Register New Institutional or Super Admin User
            const newProfile = {
              id: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              photoURL: firebaseUser.photoURL,
              role: isAdminEmail ? 'admin' : 'student',
              studentId: pendingStudentId || null,
              isBlocked: false,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            
            await setDoc(userDocRef, newProfile);
            if (isAdminEmail) {
              await setDoc(adminDocRef, { active: true });
            }
            
            setPendingStudentId(null);
            setProfile(newProfile);
          }
        } else {
          setUser(null);
          setProfile(null);
        }
      } catch (e) {
        console.error("Auth Hook Error:", e);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [pendingStudentId, toast]);

  const login = async () => {
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      if (error.code !== 'auth/popup-closed-by-user') {
        toast({ variant: 'destructive', title: 'Login Error', description: error.message });
      }
      setLoading(false);
    }
  };

  const loginWithId = async (studentId: string) => {
    setLoading(true);
    try {
      if (!auth.currentUser) {
        await signInAnonymously(auth);
      }

      const q = query(collection(db, 'users'), where('studentId', '==', studentId), limit(1));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        setPendingStudentId(studentId);
        toast({ title: 'Registration Required', description: 'Student ID not found. Please link it with your Google account.' });
        setLoading(false);
        return;
      }

      const foundUser = { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() };
      
      if (foundUser.isBlocked) {
        throw new Error('This Student ID is currently restricted.');
      }

      setProfile(foundUser);
      router.push('/dashboard/check-in');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Check-in Failed', description: error.message });
      setLoading(false);
    }
  };

  const cancelLinking = () => {
    setPendingStudentId(null);
    setLoading(false);
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      setPendingStudentId(null);
      setProfile(null);
      router.push('/');
    } catch (error: any) {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, pendingStudentId, login, loginWithId, cancelLinking, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);