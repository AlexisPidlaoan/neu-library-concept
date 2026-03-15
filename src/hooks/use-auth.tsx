
"use client"

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut, 
  User, 
  GoogleAuthProvider,
  signInAnonymously,
  signInWithEmailAndPassword
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, limit, serverTimestamp } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

const { auth, firestore: db } = initializeFirebase();
const googleProvider = new GoogleAuthProvider();

const ADMIN_EMAILS = ['alexis.pidlaoan@neu.edu.ph', 'pampa4858@gmail.com'];

interface AuthContextType {
  user: User | null;
  profile: any | null;
  loading: boolean;
  pendingStudentId: string | null;
  login: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  loginWithId: (studentId: string) => Promise<void>;
  continueAsGuest: () => void;
  cancelLinking: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  pendingStudentId: null,
  login: async () => {},
  loginWithEmail: async (email: string, pass: string) => {},
  loginWithId: async (id: string) => {},
  continueAsGuest: () => {},
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
  
  const isTerminalSession = useRef(false);
  const profileFetchedRef = useRef<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          if (profileFetchedRef.current === firebaseUser.uid && profile && !isTerminalSession.current) {
            setUser(firebaseUser);
            setLoading(false);
            return;
          }

          const email = firebaseUser.email?.toLowerCase();
          const isInstitutional = email?.endsWith('@neu.edu.ph');
          const isAdminEmail = !!(email && ADMIN_EMAILS.includes(email));
          const isGoogleUser = firebaseUser.providerData.some(p => p.providerId === 'google.com');

          // Allow email/pass users for admins even if not Google provider
          if (isGoogleUser && !isInstitutional && !isAdminEmail) {
            await signOut(auth);
            toast({
              variant: 'destructive',
              title: 'Access Denied',
              description: 'Please use your institutional (@neu.edu.ph) account.',
            });
            setUser(null);
            setProfile(null);
            profileFetchedRef.current = null;
            setLoading(false);
            return;
          }

          setUser(firebaseUser);

          if (isTerminalSession.current && profile) {
            setLoading(false);
            return;
          }

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
              profileFetchedRef.current = null;
              setLoading(false);
              return;
            }

            if (isAdminEmail && userData.role !== 'admin') {
              await updateDoc(userDocRef, { role: 'admin', updatedAt: serverTimestamp() });
              userData.role = 'admin';
              setDoc(adminDocRef, { active: true }, { merge: true }).catch(() => {});
            }

            setProfile(userData);
            profileFetchedRef.current = firebaseUser.uid;
          } else {
            // New User profile creation
            const newProfile = {
              id: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || email?.split('@')[0] || 'Admin',
              photoURL: firebaseUser.photoURL || null,
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
            profileFetchedRef.current = firebaseUser.uid;
          }
        } else {
          setUser(null);
          if (!isTerminalSession.current) {
            setProfile(null);
            profileFetchedRef.current = null;
          }
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
    isTerminalSession.current = false;
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      if (error.code !== 'auth/popup-closed-by-user') {
        toast({ variant: 'destructive', title: 'Login Error', description: error.message });
      }
      setLoading(false);
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    setLoading(true);
    isTerminalSession.current = false;
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Admin Login Failed', description: 'Check your credentials and try again.' });
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
        isTerminalSession.current = false;
        toast({ 
          title: 'Student ID Not Found', 
          description: 'This ID is not yet registered. You can link a Google account or continue as guest.' 
        });
        setLoading(false);
        return;
      }

      const foundUser = { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() };
      
      if (foundUser.isBlocked) {
        throw new Error('This Student ID is currently restricted.');
      }

      isTerminalSession.current = true;
      setPendingStudentId(null);
      setProfile(foundUser);
      router.push('/dashboard/check-in');
    } catch (error: any) {
      console.error("Terminal Login Error:", error);
      toast({ variant: 'destructive', title: 'Check-in Failed', description: error.message || 'Permission denied.' });
      setLoading(false);
    }
  };

  const continueAsGuest = () => {
    setLoading(true);
    isTerminalSession.current = true;
    setProfile({
      id: `guest-${Date.now()}`,
      displayName: 'Guest Student',
      studentId: pendingStudentId,
      role: 'student',
      isGuest: true
    });
    setPendingStudentId(null);
    router.push('/dashboard/check-in');
    setLoading(false);
  };

  const cancelLinking = () => {
    setPendingStudentId(null);
    isTerminalSession.current = false;
    setLoading(false);
  };

  const logout = async () => {
    setLoading(true);
    try {
      isTerminalSession.current = false;
      await signOut(auth);
      setPendingStudentId(null);
      setProfile(null);
      profileFetchedRef.current = null;
      router.push('/');
    } catch (error: any) {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, pendingStudentId, login, loginWithEmail, loginWithId, continueAsGuest, cancelLinking, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
