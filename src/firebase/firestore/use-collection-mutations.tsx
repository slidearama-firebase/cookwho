'use client';

import {
    addDoc,
    deleteDoc,
    doc,
    setDoc,
    updateDoc,
    type CollectionReference,
    type DocumentData,
  } from 'firebase/firestore';
  
  export function useCollectionMutations<T extends DocumentData>(ref: CollectionReference<T> | null) {
  
    const addDocument = async (data: T) => {
      if (!ref) {
        throw new Error('Collection reference is not available.');
      }
      try {
        const docRef = await addDoc(ref, data);
        return docRef;
      } catch (error) {
        console.error('Error adding document:', error);
        throw error;
      }
    };
  
    const updateDocument = async (id: string, data: Partial<T>) => {
        if (!ref) {
          throw new Error('Collection reference is not available.');
        }
        try {
          const docRef = doc(ref, id);
          await updateDoc(docRef, data);
          return docRef;
        } catch (error) {
          console.error('Error updating document:', error);
          throw error;
        }
      };
    
      const setDocument = async (id: string, data: T) => {
        if (!ref) {
          throw new Error('Collection reference is not available.');
        }
        try {
          const docRef = doc(ref, id);
          await setDoc(docRef, data);
          return docRef;
        } catch (error) {
          console.error('Error setting document:', error);
          throw error;
        }
      };
    
      const deleteDocument = async (id: string) => {
        if (!ref) {
          throw new Error('Collection reference is not available.');
        }
        try {
          const docRef = doc(ref, id);
          await deleteDoc(docRef);
        } catch (error) {
          console.error('Error deleting document:', error);
          throw error;
        }
      };
  
    return { addDocument, updateDocument, setDocument, deleteDocument };
  }
  