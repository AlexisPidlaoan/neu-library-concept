"use client"

import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut, 
  User as FirebaseUser, 
  GoogleAuthProvider,
  signInAnonymously
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

const { auth, firestore: db } = initializeFirebase();
const googleProvider = new GoogleAuthProvider();

interface AuthContextType {
  user: FirebaseUser | null;
  profile: any | null;
  loading: boolean;
  pendingStudentId: string | null;
  login: (asAdmin?: boolean) => Promise<void>;
  loginWithId: (studentId: string) => Promise<void>;
  continueAsGuest: () => void;
  cancelLinking: () => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingStudentId, setPendingStudentId] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      try {
        if (firebaseUser) {
          setUser(firebaseUser);

          // Check for admin status
          const adminDoc = await getDoc(doc(db, 'admins', firebaseUser.uid));
          const isAdmin = adminDoc.exists() || (firebaseUser.email && (
            firebaseUser.email === 'jcesperanza@neu.edu.ph' || 
            firebaseUser.email === 'admin@neu.edu.ph'
          ));

          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const userData = userDoc.data();
            if (userData.isBlocked) {
              await signOut(auth);
              toast({ variant: 'destructive', title: 'Account Blocked', description: 'Contact the library administrator.' });
              setUser(null);
              setProfile(null);
              setLoading(false);
              return;
            }
            setProfile({ 
              ...userData, 
              id: firebaseUser.uid, 
              role: isAdmin ? 'admin' : userData.role || 'student' 
            });
          } else if (!firebaseUser.isAnonymous) {
            // New user from Google Login
            const email = firebaseUser.email || "";
            
            const newProfile = {
              email: email,
              displayName: firebaseUser.displayName || email.split('@')[0] || 'User',
              photoURL: firebaseUser.photoURL || null,
              role: isAdmin ? 'admin' : 'student',
              userType: 'student',
              studentId: pendingStudentId || null,
              isBlocked: false,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            };
            
            await setDoc(userDocRef, newProfile);
            setProfile({ ...newProfile, id: firebaseUser.uid });
            setPendingStudentId(null);
          } else {
            // Guest User (Anonymous)
            setProfile({
              id: firebaseUser.uid,
              displayName: 'Guest Student',
              role: 'student',
              isGuest: true,
              userType: 'student',
              studentId: pendingStudentId || null
            });
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
  }, []);

  const login = async (asAdmin = false) => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      
      const adminDoc = await getDoc(doc(db, 'admins', result.user.uid));
      const isAdminUser = adminDoc.exists() || (result.user.email && (
        result.user.email === 'jcesperanza@neu.edu.ph' || 
        result.user.email === 'admin@neu.edu.ph'
      ));
      
      if (asAdmin && !isAdminUser) {
        await signOut(auth);
        toast({
          variant: 'destructive',
          title: 'Access Denied',
          description: 'This account is not on the administrator whitelist.'
        });
        return;
      }

      if (asAdmin || isAdminUser) {
        router.push('/admin/dashboard');
      } else {
        router.push('/dashboard/check-in');
      }
    } catch (error: any) {
      if (error.code !== 'auth/popup-closed-by-user') {
        toast({ variant: 'destructive', title: 'Login Error', description: error.message });
      }
    } finally {
      setLoading(false);
    }
  };

  const loginWithId = async (studentId: string) => {
    setPendingStudentId(studentId);
    await continueAsGuest();
  };

  const continueAsGuest = async () => {
    setLoading(true);
    try {
      await signInAnonymously(auth);
      router.push('/dashboard/check-in');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
      setLoading(false);
    }
  };

  const cancelLinking = () => {
    setPendingStudentId(null);
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      router.push('/');
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, pendingStudentId, login, loginWithId, continueAsGuest, cancelLinking, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};
