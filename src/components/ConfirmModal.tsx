import React from 'react';
import { AlertTriangle, Trash2, X, Loader2 } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  confirmText?: string;
  cancelLabel?: string;
  cancelText?: string;
  isDestructive?: boolean;
  isDanger?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onClose?: () => void;
  onCancel?: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel,
  confirmText,
  cancelLabel,
  cancelText,
  isDestructive,
  isDanger,
  isLoading = false,
  onConfirm,
  onClose,
  onCancel,
}) => {
  if (!isOpen) return null;

  const handleClose = onClose || onCancel || (() => {});
  const resolvedConfirmLabel = confirmLabel || confirmText || 'Yes, Delete';
  const resolvedCancelLabel = cancelLabel || cancelText || 'No, Cancel';
  const resolvedIsDestructive = isDestructive !== undefined ? isDestructive : (isDanger !== undefined ? isDanger : true);

  return (
    <div
      className="fixed inset-0 z-[80] overflow-y-auto flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-gray-900/60 dark:bg-black/75 backdrop-blur-xs transition-opacity"
        onClick={!isLoading ? handleClose : undefined}
      />

      {/* Modal Dialog Box */}
      <div
        className="relative z-10 w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-800 text-gray-900 dark:text-white overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div
              className={`p-3 rounded-full flex-shrink-0 ${
                resolvedIsDestructive
                  ? 'bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400'
                  : 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400'
              }`}
            >
              {resolvedIsDestructive ? <AlertTriangle className="w-6 h-6" /> : <Trash2 className="w-6 h-6" />}
            </div>

            <div className="flex-1">
              <h3 className="text-base font-bold text-gray-900 dark:text-white leading-6">{title}</h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-slate-400 leading-relaxed">{message}</p>
            </div>

            <button
              onClick={handleClose}
              disabled={isLoading}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Buttons: Cancel (No) vs Confirm (Yes) */}
        <div className="px-6 py-4 bg-gray-50/80 dark:bg-slate-800/80 border-t border-gray-100 dark:border-slate-800 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-gray-300 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 active:bg-gray-100 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {resolvedCancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg shadow-sm transition-colors cursor-pointer disabled:opacity-50 min-w-[110px] ${
              resolvedIsDestructive
                ? 'bg-red-600 hover:bg-red-700 active:bg-red-800'
                : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800'
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                {resolvedConfirmLabel}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
