import * as Haptics from 'expo-haptics';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Toast, type ToastConfig } from './toast';

export interface ToastOptions {
  message: string;
  actionText?: string;
  onActionPress?: () => void;
}

interface ToastContextValue {
  showToast: (options: ToastOptions) => void;
}

interface ToastEntry extends ToastConfig {
  /** Exit animation is running; the entry no longer occupies a stack slot. */
  exiting?: boolean;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

/**
 * Hosts a stack of toasts above its children. Each new toast enters at the
 * front and pushes the earlier ones up and back a step. A dismissing toast is
 * taken out of the stack immediately so the ones behind spring forward while
 * it fades.
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  const nextId = useRef(1);

  const showToast = useCallback((options: ToastOptions) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setToasts((current) => [...current, { id: nextId.current++, ...options }]);
  }, []);

  const handleDismissStart = useCallback((id: number) => {
    setToasts((current) =>
      current.map((t) => (t.id === id ? { ...t, exiting: true } : t)),
    );
  }, []);

  const handleDismissed = useCallback((id: number) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  // Oldest renders first so newer toasts naturally sit on top of the stack.
  // Ids only grow, so "newer active entries" is the distance from the front.
  return (
    <ToastContext.Provider value={value}>
      {children}
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          toast={toast}
          index={
            toasts.filter((t) => !t.exiting && t.id > toast.id).length
          }
          onDismissStart={handleDismissStart}
          onDismissed={handleDismissed}
        />
      ))}
    </ToastContext.Provider>
  );
}
