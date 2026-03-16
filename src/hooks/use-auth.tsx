
"use client"

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { 
onAuthStateChanged, 
signInWithPopup, 
signOut, 
  User, 
  User as FirebaseUser, 
GoogleAuthProvider,
  signInAnonymously,
  signInWithEmailAndPassword
  signInAnonymously
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, limit, serverTimestamp } from 'firebase/firestore';
import { useAuth as useFirebaseAuth, useFirestore } from '@/firebase';
import { doc, getDoc, setDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

const { auth, firestore: db } = initializeFirebase();
const googleProvider = new GoogleAuthProvider();

// Authorized Admin Emails
const ADMIN_EMAILS = [
  'alexis.pidlaoan@neu.edu.ph', 
  'pampa4858@gmail.com', 
  'admin@neu.edu.ph',
  'jcesperanza@neu.edu.ph'
];

interface AuthContextType {
  user: User | null;
  user: FirebaseUser | null;
profile: any | null;
loading: boolean;
pendingStudentId: string | null;
  login: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  login: (asAdmin?: boolean) => Promise<void>;
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
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const auth = useFirebaseAuth();
  const db = useFirestore();
  const [user, setUser] = useState<User | null>(null);
  const [user, setUser] = useState<FirebaseUser | null>(null);
const [profile, setProfile] = useState<any | null>(null);
const [loading, setLoading] = useState(true);
const [pendingStudentId, setPendingStudentId] = useState<string | null>(null);
const { toast } = useToast();
const router = useRouter();

  const isTerminalSession = useRef(false);
const isSearchingId = useRef(false);
  const isLoggingIn = useRef(false);
  const profileFetchedRef = useRef<string | null>(null);

useEffect(() => {
    if (!auth || !db) return;

const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
try {
if (firebaseUser) {
setUser(firebaseUser);

if (isSearchingId.current) {
            return;
          }

          if (isTerminalSession.current && profile) {
            setLoading(false);
            return;
          }

          if (profileFetchedRef.current === firebaseUser.uid && profile && !isTerminalSession.current) {
setLoading(false);
return;
}

          const email = firebaseUser.email?.toLowerCase();
          const isInstitutional = email?.endsWith('@neu.edu.ph');
          const isAdminEmail = !!(email && ADMIN_EMAILS.includes(email));
          const isGoogleUser = firebaseUser.providerData.some(p => p.providerId === 'google.com');

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

          if (firebaseUser.isAnonymous && !isTerminalSession.current && !pendingStudentId) {
             const guestProfile = {
              id: firebaseUser.uid,
              displayName: 'Guest Student',
              role: 'student',
              isGuest: true,
              studentId: profile?.studentId || null
            };
            setProfile(guestProfile);
            setLoading(false);
            return;
          }
          // First check if user is an admin
          const adminDoc = await getDoc(doc(db, 'admins', firebaseUser.uid));
          const isAdmin = adminDoc.exists() || (firebaseUser.email && (
            firebaseUser.email === 'jcesperanza@neu.edu.ph' || 
            firebaseUser.email === 'admin@neu.edu.ph'
          ));

const userDocRef = doc(db, 'users', firebaseUser.uid);
          const adminDocRef = doc(db, 'admins', firebaseUser.uid);
          
          let userDoc = await getDoc(userDocRef);
          const userDoc = await getDoc(userDocRef);

if (userDoc.exists()) {
            let userData = { ...userDoc.data(), id: firebaseUser.uid };
            
            const userData = userDoc.data();
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
            setProfile({ ...userData, id: firebaseUser.uid, role: isAdmin ? 'admin' : userData.role || 'student' });
} else if (!firebaseUser.isAnonymous) {
            // New user from Google Login
            const email = firebaseUser.email || "";
            
const newProfile = {
              id: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || email?.split('@')[0] || 'User',
              email: email,
              displayName: firebaseUser.displayName || email.split('@')[0] || 'User',
photoURL: firebaseUser.photoURL || null,
              role: isAdminEmail ? 'admin' : 'student',
              role: isAdmin ? 'admin' : 'student',
              userType: 'student',
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
            
            setProfile({ ...newProfile, id: firebaseUser.uid });
setPendingStudentId(null);
            setProfile(newProfile);
            profileFetchedRef.current = firebaseUser.uid;
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
          if (!isTerminalSession.current) {
            setProfile(null);
            profileFetchedRef.current = null;
          }
          setProfile(null);
}
} catch (e) {
console.error("Auth Hook Error:", e);
@@ -185,138 +116,88 @@ export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
});

return () => unsubscribe();
  }, [pendingStudentId, toast, auth, db]);
  }, [auth, db]);

  const login = async () => {
    if (isLoggingIn.current) return;
    isLoggingIn.current = true;
    isTerminalSession.current = false;
    
  const login = async (asAdmin = false) => {
    setLoading(true);
try {
      await signInWithPopup(auth, googleProvider);
      const result = await signInWithPopup(auth, googleProvider);
      
      // Check if user is an admin by UID or Email
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
      // Handle technical Firebase errors silently to prevent annoying toasts
      const ignoredCodes = ['auth/popup-closed-by-user', 'auth/cancelled-popup-request'];
      if (!ignoredCodes.includes(error.code)) {
      if (error.code !== 'auth/popup-closed-by-user') {
toast({ variant: 'destructive', title: 'Login Error', description: error.message });
}
} finally {
      isLoggingIn.current = false;
setLoading(false);
}
};

  const loginWithEmail = async (email: string, pass: string) => {
    setLoading(true);
    isTerminalSession.current = false;
    
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
  const loginWithId = async (studentId: string) => {
    setPendingStudentId(studentId);
    await continueAsGuest();
};

  const loginWithId = async (studentId: string) => {
  const continueAsGuest = async () => {
setLoading(true);
    isSearchingId.current = true;
try {
      if (!auth.currentUser) {
        await signInAnonymously(auth);
      }

      const q = query(collection(db, 'users'), where('studentId', '==', studentId), limit(1));
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) {
        setPendingStudentId(studentId);
        isTerminalSession.current = false;
        isSearchingId.current = false;
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

      isTerminalSession.current = true;
      isSearchingId.current = false;
      setPendingStudentId(null);
      setProfile(foundUser);
      await signInAnonymously(auth);
router.push('/dashboard/check-in');
} catch (error: any) {
      isSearchingId.current = false;
      console.error("Terminal Login Error:", error);
      toast({ variant: 'destructive', title: 'Check-in Failed', description: error.message || 'Permission denied.' });
      toast({ variant: 'destructive', title: 'Error', description: error.message });
    } finally {
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
    isSearchingId.current = false;
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
    } catch (error) {
      console.error(error);
    } finally {
setLoading(false);
}
};

return (
    <AuthContext.Provider value={{ user, profile, loading, pendingStudentId, login, loginWithEmail, loginWithId, continueAsGuest, cancelLinking, logout }}>
    <AuthContext.Provider value={{ user, profile, loading, pendingStudentId, login, loginWithId, continueAsGuest, cancelLinking, logout }}>
{children}
</AuthContext.Provider>
);
};

export const useAuth = () => useContext(AuthContext);
export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};
