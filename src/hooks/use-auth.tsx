
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

// List of institutional emails that are automatically admins
const ADMIN_EMAILS = ['alexis.pidlaoan@neu.edu.ph'];

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
          // Enforce NEU email domain for Google logins
          const isGoogleUser = firebaseUser.providerData.some(p => p.providerId === 'google.com');
          if (isGoogleUser && firebaseUser.email && !firebaseUser.email.endsWith('@neu.edu.ph')) {
            await signOut(auth);
            toast({
              variant: 'destructive',
              title: 'Invalid Institutional Email',
              description: 'Access denied. Use @neu.edu.ph account.',
            });
            setUser(null);
            setProfile(null);
            return;
          }

          setUser(firebaseUser);

          // Attempt to fetch profile
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const adminDocRef = doc(db, 'admins', firebaseUser.uid);
          
          const userDoc = await getDoc(userDocRef);
          const isAdminEmail = firebaseUser.email && ADMIN_EMAILS.includes(firebaseUser.email);

          if (userDoc.exists()) {
            let userData = { id: firebaseUser.uid, ...userDoc.data() };
            
            if (userData.isBlocked) {
              await signOut(auth);
              toast({ variant: 'destructive', title: 'Access Blocked', description: 'Your account is restricted.' });
              setUser(null);
              setProfile(null);
              return;
            }

            // Sync Admin privileges markers for security rules
            const adminMarker = await getDoc(adminDocRef);
            if (isAdminEmail && (!adminMarker.exists() || userData.role !== 'admin')) {
              await updateDoc(userDocRef, { role: 'admin' });
              userData.role = 'admin';
              await setDoc(adminDocRef, { active: true }, { merge: true });
            }

            // Handle linking pending student ID
            if (pendingStudentId) {
              await updateDoc(userDocRef, {
                studentId: pendingStudentId,
                updatedAt: new Date().toISOString()
              });
              userData.studentId = pendingStudentId;
              setPendingStudentId(null);
              toast({ title: 'ID Linked Successfully!' });
            }

            setProfile(userData);
          } else if (isGoogleUser) {
            // Create new profile for Google users
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
      } catch (e: any) {
        console.error("Auth sync error:", e);
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
      toast({ variant: 'destructive', title: 'Login Error', description: error.message });
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
        toast({ title: 'New Student ID', description: 'Please sign in with Google to link it.' });
        setLoading(false);
        return;
      }

      const userData = { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() };
      if (userData.isBlocked) throw new Error('Student ID is blocked.');

      setProfile(userData);
      router.push('/dashboard/check-in');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Check-in Error', description: error.message });
      setLoading(false);
    }
  };

  const cancelLinking = () => setPendingStudentId(null);

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
