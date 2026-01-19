'use client';

import type { FirebaseApp } from 'firebase/app';
import type { Auth } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import type { FirebaseStorage } from 'firebase/storage';
import { createContext, useContext } from 'react';
import { initializeFirebase } from '.';

type FirebaseContextValue = {
  app: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
  storage: FirebaseStorage;
};

const FirebaseContext = createContext<FirebaseContextValue | undefined>(
  undefined,
);

export function FirebaseProvider(props: { children: React.ReactNode }) {
  const { app, auth, firestore, storage } = initializeFirebase();
  return (
    <FirebaseContext.Provider value={{ app, auth, firestore, storage }}>
      {props.children}
    </FirebaseContext.Provider>
  );
}

export function useFirebase() {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
}

export function useFirebaseApp() {
  return useFirebase().app;
}

export function useFirestore() {
  return useFirebase().firestore;
}

export function useAuth() {
  return useFirebase().auth;
}

export function useStorage() {
    return useFirebase().storage;
}
