
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
import { useAuth as useFirebaseAuth, useFirestore } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

const googleProvider = new GoogleAuthProvider();

// Authorized Admin Emails
const ADMIN_EMAILS = [
  'alexis.pidlaoan@neu.edu.ph', 
  'pampa4858@gmail.com', 
  'admin@neu.edu.ph'
];

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
  const auth = useFirebaseAuth();
  const db = useFirestore();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingStudentId, setPendingStudentId] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();
  
  const isTerminalSession = useRef(false);
  const profileFetchedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!auth || !db) return;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          // If we are in an active terminal session, we trust the profile manually set by loginWithId
          if (isTerminalSession.current && profile) {
            setUser(firebaseUser);
            setLoading(false);
            return;
          }

          // Optimization: Skip refetching if user hasn't changed and not in terminal mode
          if (profileFetchedRef.current === firebaseUser.uid && profile && !isTerminalSession.current) {
            setUser(firebaseUser);
            setLoading(false);
            return;
          }

          const email = firebaseUser.email?.toLowerCase();
          const isInstitutional = email?.endsWith('@neu.edu.ph');
          const isAdminEmail = !!(email && ADMIN_EMAILS.includes(email));
          const isGoogleUser = firebaseUser.providerData.some(p => p.providerId === 'google.com');

          // Restrict standard Google users to institutional domain
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

          // If it's a guest account that isn't handled by the terminal session logic yet
          if (firebaseUser.isAnonymous && !isTerminalSession.current) {
             const guestProfile = {
              id: firebaseUser.uid,
              displayName: 'Guest Student',
              role: 'student',
              isGuest: true,
              studentId: pendingStudentId
            };
            setProfile(guestProfile);
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

            // Ensure Admin role is synchronized for authorized emails
            if (isAdminEmail && userData.role !== 'admin') {
              await updateDoc(userDocRef, { role: 'admin', updatedAt: serverTimestamp() });
              userData.role = 'admin';
              setDoc(adminDocRef, { active: true }, { merge: true }).catch(() => {});
            }

            setProfile(userData);
            profileFetchedRef.current = firebaseUser.uid;
          } else if (!firebaseUser.isAnonymous) {
            // New User Profile Creation (Non-Guest)
            const newProfile = {
              id: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || email?.split('@')[0] || 'User',
              photoURL: firebaseUser.photoURL || null,
              role: isAdminEmail ? 'admin' : 'student',
              studentId: pendingStudentId || null,
              isBlocked: false,
              isGuest: false,
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
  }, [pendingStudentId, toast, auth, db]); // Removed profile from dependency to prevent re-subscription loops

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
    
    // Normalize email shorthand
    const finalEmail = email.toLowerCase() === 'admin' ? 'admin@neu.edu.ph' : email;

    try {
      await signInWithEmailAndPassword(auth, finalEmail, pass);
      toast({ title: 'Welcome Admin', description: `Authenticated as ${finalEmail}` });
    } catch (error: any) {
      let msg = error.message;
      if (error.code === 'auth/invalid-credential') {
        msg = "Invalid credentials. Please verify the email and password in the Firebase Console.";
      }
      toast({ 
        variant: 'destructive', 
        title: 'Admin Login Failed', 
        description: msg
      });
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

      const foundUser = { 
        id: querySnapshot.docs[0].id, 
        ...querySnapshot.docs[0].data(),
        isGuest: false 
      };
      
      if (foundUser.isBlocked) {
        throw new Error('This Student ID is currently restricted.');
      }

      // CRITICAL: Set these before redirecting to ensure consistency
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
    const guestProfile = {
      id: `guest-${Date.now()}`,
      displayName: 'Guest Student',
      studentId: pendingStudentId,
      role: 'student',
      isGuest: true
    };
    setProfile(guestProfile);
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
