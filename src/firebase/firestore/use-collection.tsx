'use client';

import {
  onSnapshot,
  type CollectionReference,
  type DocumentData,
  type Query,
} from 'firebase/firestore';
import { useEffect, useState } from 'react';

export function useCollection<T>(query: CollectionReference<T> | Query<T> | null) {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!query) {
      setData(null);
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      query,
      (snapshot) => {
        const data: T[] = snapshot.docs.map((doc) => ({
          ...(doc.data() as T),
          id: doc.id,
        }));
        setData(data);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching collection:', error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [query]);

  return { data, loading };
}
