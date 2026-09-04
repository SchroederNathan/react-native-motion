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
  // Layout heights by id. Toasts can be one to three lines tall, and the
  // stack offsets are computed from the front toast's height.
  const [heights, setHeights] = useState<Record<number, number>>({});
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
    setHeights((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
  }, []);

  const handleHeightChange = useCallback((id: number, height: number) => {
    setHeights((current) =>
      current[id] === height ? current : { ...current, [id]: height },
    );
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  // The newest non-exiting toast is the front; the rest peek above its top.
  const active = toasts.filter((t) => !t.exiting);
  const frontHeight = active.length
    ? heights[active[active.length - 1].id]
    : undefined;

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
          height={heights[toast.id]}
          frontHeight={frontHeight}
          onHeightChange={handleHeightChange}
          onDismissStart={handleDismissStart}
          onDismissed={handleDismissed}
        />
      ))}
    </ToastContext.Provider>
  );
}
