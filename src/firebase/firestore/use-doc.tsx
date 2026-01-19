'use client';

import {
  onSnapshot,
  type DocumentReference,
  type DocumentData,
} from 'firebase/firestore';
import { useEffect, useState } from 'react';

export function useDoc<T>(ref: DocumentReference<T> | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ref) {
      setData(null);
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        if (snapshot.exists()) {
          const data: T = {
            ...(snapshot.data() as T),
            id: snapshot.id,
          };
          setData(data);
        } else {
          setData(null);
        }
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching document:', error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [ref]);

  return { data, loading };
}
