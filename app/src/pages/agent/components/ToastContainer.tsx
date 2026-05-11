import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageSquare, UserPlus } from 'lucide-react';
import { useAgent } from '../store';
import type { Toast } from '../types';

const easeOut = [0.16, 1, 0.3, 1] as [number, number, number, number];

function ToastItem({ toast }: { toast: Toast }) {
  const { dispatch } = useAgent();

  useEffect(() => {
    if (toast.autoDismiss) {
      const timer = setTimeout(() => {
        dispatch({ type: 'REMOVE_TOAST', payload: toast.id });
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast, dispatch]);

  const borderColor =
    toast.type === 'new_message'
      ? '#4F7BF7'
      : toast.type === 'new_session'
        ? '#10B981'
        : toast.type === 'transfer'
          ? '#F59E0B'
          : '#9CA3AF';

  const icon = toast.type === 'new_session' ? (
    <UserPlus className="h-4 w-4 text-[#10B981]" />
  ) : (
    <MessageSquare className="h-4 w-4 text-[#4F7BF7]" />
  );

  return (
    <motion.div
      layout
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ duration: 0.4, ease: easeOut }}
      className="mb-2 flex items-start gap-3 rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-lg"
      style={{ borderLeftWidth: 4, borderLeftColor: borderColor }}
    >
      {toast.avatar ? (
        <img src={toast.avatar} alt="" className="mt-0.5 h-9 w-9 flex-shrink-0 rounded-full" />
      ) : (
        <div className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-gray-100">
          {icon}
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-gray-700">{toast.title}</p>
        {toast.message && (
          <p className="mt-0.5 truncate text-xs text-gray-400">{toast.message}</p>
        )}
      </div>
      <button
        onClick={() => dispatch({ type: 'REMOVE_TOAST', payload: toast.id })}
        className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </motion.div>
  );
}

export default function ToastContainer() {
  const { state } = useAgent();

  return (
    <div className="pointer-events-none fixed right-4 top-[72px] z-[100] w-[360px] max-w-[calc(100vw-32px)]">
      <AnimatePresence mode="popLayout">
        {state.toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastItem toast={toast} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
