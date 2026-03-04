'use client';

import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { useFirestore } from '@/firebase/provider';

interface KitchenConfirmationPopupProps {
  alertId: string;
  cookDisplayName: string;
  onDismiss: () => void;
}

export function KitchenConfirmationPopup({ alertId, cookDisplayName, onDismiss }: KitchenConfirmationPopupProps) {
  const firestore = useFirestore();
  const [status, setStatus] = useState<'pending' | 'confirmed' | 'expired'>('pending');
  const [secondsLeft, setSecondsLeft] = useState(7 * 60); // 7 minutes

  // Listen to the alert document in real time
  useEffect(() => {
    if (!firestore || !alertId) return;

    const alertRef = doc(firestore, 'cookAlerts', alertId);
    const unsubscribe = onSnapshot(alertRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data?.status === 'confirmed') {
          setStatus('confirmed');
        } else if (data?.status === 'expired') {
          setStatus('expired');
        }
      }
    });

    return () => unsubscribe();
  }, [firestore, alertId]);

  // Countdown timer
  useEffect(() => {
    if (status !== 'pending') return;

    const interval = setInterval(() => {
      setSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setStatus('expired');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [status]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timeDisplay = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-8 text-center">

        {status === 'pending' && (
          <>
            <div className="text-5xl mb-4">🍳</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">
              Waiting for {cookDisplayName}...
            </h2>
            <p className="text-gray-500 mb-6">
              We've alerted the cook. Waiting for them to confirm their kitchen is open.
            </p>
            <div className="text-4xl font-bold text-orange-500 mb-2">
              {timeDisplay}
            </div>
            <p className="text-sm text-gray-400">remaining</p>
          </>
        )}

        {status === 'confirmed' && (
          <>
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">
              Kitchen Confirmed!
            </h2>
            <p className="text-gray-500 mb-6">
              Great news! {cookDisplayName} has confirmed their kitchen is open and ready to cook for you!
            </p>
            <button
              onClick={onDismiss}
              className="w-full py-3 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl transition-colors"
            >
              Continue to Basket
            </button>
          </>
        )}

        {status === 'expired' && (
          <>
            <div className="text-5xl mb-4">⏰</div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">
              Kitchen Unavailable
            </h2>
            <p className="text-gray-500 mb-6">
              Sorry, {cookDisplayName} hasn't responded in time. Their kitchen has been marked as closed.
            </p>
            <button
              onClick={onDismiss}
              className="w-full py-3 bg-gray-500 hover:bg-gray-600 text-white font-bold rounded-xl transition-colors"
            >
              OK, understood
            </button>
          </>
        )}

      </div>
    </div>
  );
}
