import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getAuth, Auth } from "firebase-admin/auth";
import { getFirestore, Firestore } from "firebase-admin/firestore";

function getAdminApp(): App {
  if (getApps().length > 0) return getApps()[0];

  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  if (!privateKey) {
    // During build time, use a mock - the actual API routes won't be called
    return initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID || "mock" });
  }

  return initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: privateKey.replace(/\\n/g, "\n"),
    }),
  });
}

const app = getAdminApp();
export const adminAuth: Auth = getAuth(app);
export const adminDb: Firestore = getFirestore(app);
