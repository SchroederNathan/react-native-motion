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
import { Toast, type ToastConfig, type ToastPosition } from './toast';

export type { ToastPosition } from './toast';

export interface ToastOptions {
  message: string;
  /** Screen edge for this toast. Defaults to the provider's `position`. */
  position?: ToastPosition;
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
 * front and pushes the earlier ones back a step. A dismissing toast is taken
 * out of the stack immediately so the ones behind spring forward while it
 * fades. The top and bottom edges each hold their own stack.
 */
export function ToastProvider({
  children,
  position = 'bottom',
}: {
  children: ReactNode;
  /** Edge the toasts stack against unless a toast sets its own `position`. */
  position?: ToastPosition;
}) {
  const [toasts, setToasts] = useState<ToastEntry[]>([]);
  // Layout heights by id. Toasts can be one to three lines tall, and the
  // stack offsets are computed from the front toast's height.
  const [heights, setHeights] = useState<Record<number, number>>({});
  const nextId = useRef(1);

  const showToast = useCallback(
    (options: ToastOptions) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setToasts((current) => [
        ...current,
        {
          id: nextId.current++,
          ...options,
          position: options.position ?? position,
        },
      ]);
    },
    [position],
  );

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

  // Each edge is its own stack. The newest non-exiting toast on an edge is
  // that stack's front; the rest peek out beyond it.
  const frontHeightFor = (edge: ToastPosition) => {
    const active = toasts.filter((t) => !t.exiting && t.position === edge);
    return active.length ? heights[active[active.length - 1].id] : undefined;
  };
  const frontHeights: Record<ToastPosition, number | undefined> = {
    top: frontHeightFor('top'),
    bottom: frontHeightFor('bottom'),
  };

  // Oldest renders first so newer toasts naturally sit on top of the stack.
  // Ids only grow, so "newer active entries on the same edge" is the distance
  // from that stack's front.
  return (
    <ToastContext.Provider value={value}>
      {children}
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          toast={toast}
          index={
            toasts.filter(
              (t) =>
                !t.exiting && t.position === toast.position && t.id > toast.id,
            ).length
          }
          height={heights[toast.id]}
          frontHeight={frontHeights[toast.position]}
          onHeightChange={handleHeightChange}
          onDismissStart={handleDismissStart}
          onDismissed={handleDismissed}
        />
      ))}
    </ToastContext.Provider>
  );
}
