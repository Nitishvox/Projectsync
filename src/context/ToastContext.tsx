import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  showToast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: any, type: ToastType = 'info') => {
    let text = message;
    if (typeof message === 'object' && message !== null) {
      text = message.message || message.error || JSON.stringify(message);
    } else if (typeof message !== 'string') {
      text = String(message || 'Notification');
    }

    const id = 'toast-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    setToasts((prev) => [...prev, { id, message: text, type }]);

    setTimeout(() => {
      removeToast(id);
    }, 4000);
  }, [removeToast]);

  const success = useCallback((message: string) => showToast(message, 'success'), [showToast]);
  const error = useCallback((message: string) => showToast(message, 'error'), [showToast]);
  const info = useCallback((message: string) => showToast(message, 'info'), [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, success, error, info }}>
      {children}
      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none px-4">
        {toasts.map((toast) => {
          let bg = 'bg-slate-900 text-white border-slate-700';
          let Icon = Info;
          let iconColor = 'text-blue-400';

          if (toast.type === 'success') {
            bg = 'bg-emerald-900/95 text-emerald-50 border-emerald-700 shadow-emerald-950/20';
            Icon = CheckCircle2;
            iconColor = 'text-emerald-400';
          } else if (toast.type === 'error') {
            bg = 'bg-rose-900/95 text-rose-50 border-rose-700 shadow-rose-950/20';
            Icon = AlertCircle;
            iconColor = 'text-rose-400';
          } else {
            bg = 'bg-slate-900/95 text-slate-50 border-slate-700 shadow-slate-950/20';
            Icon = Info;
            iconColor = 'text-blue-400';
          }

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border shadow-lg backdrop-blur-sm transition-all duration-200 animate-in fade-in slide-in-from-top-2 ${bg}`}
            >
              <Icon className={`w-5 h-5 flex-shrink-0 mt-0.5 ${iconColor}`} />
              <p className="text-sm font-medium flex-1 leading-snug">{toast.message}</p>
              <button
                onClick={() => removeToast(toast.id)}
                className="opacity-70 hover:opacity-100 transition-opacity p-0.5 -mr-1 text-slate-300"
                aria-label="Dismiss notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
