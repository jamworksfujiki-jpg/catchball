"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
} from "firebase/auth";
import { doc, getDoc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
import { auth, db } from "./firebase";
import { Member, Company } from "@/types";

interface AuthContextType {
  user: User | null;
  member: Member | null;
  company: Company | null;
  companyId: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<User>;
  signOut: () => Promise<void>;
  setCurrentCompany: (companyId: string) => void;
  refreshMember: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [member, setMember] = useState<Member | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadMemberAndCompany(uid: string, cId?: string) {
    try {
      let targetCompanyId = cId;
      if (!targetCompanyId) {
        const stored = localStorage.getItem("catchball_companyId");
        if (stored) {
          targetCompanyId = stored;
        } else {
          const companiesSnap = await getDocs(collection(db, "companies"));
          for (const compDoc of companiesSnap.docs) {
            const memberDoc = await getDoc(doc(db, "companies", compDoc.id, "members", uid));
            if (memberDoc.exists()) {
              targetCompanyId = compDoc.id;
              break;
            }
          }
        }
      }
      if (targetCompanyId) {
        const memberDoc = await getDoc(doc(db, "companies", targetCompanyId, "members", uid));
        if (memberDoc.exists()) {
          setMember(memberDoc.data() as Member);
          const companyDoc = await getDoc(doc(db, "companies", targetCompanyId));
          if (companyDoc.exists()) {
            setCompany({ id: companyDoc.id, ...companyDoc.data() } as Company);
          }
          setCompanyId(targetCompanyId);
          localStorage.setItem("catchball_companyId", targetCompanyId);
        }
      }
    } catch (e) {
      console.error("Failed to load member/company:", e);
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        await loadMemberAndCompany(user.uid);
      } else {
        setMember(null);
        setCompany(null);
        setCompanyId(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName });
    return cred.user;
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    localStorage.removeItem("catchball_companyId");
    setMember(null);
    setCompany(null);
    setCompanyId(null);
  };

  const setCurrentCompany = (cId: string) => {
    if (user) {
      loadMemberAndCompany(user.uid, cId);
    }
  };

  const refreshMember = async () => {
    if (user && companyId) {
      await loadMemberAndCompany(user.uid, companyId);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, member, company, companyId, loading, signIn, signUp, signOut, setCurrentCompany, refreshMember }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
