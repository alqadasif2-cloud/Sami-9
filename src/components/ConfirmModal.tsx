import React from 'react';
import { X, Rocket, RotateCcw, Sparkles } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  type?: 'start' | 'reset' | 'new_challenge';
  title: string;
  message: string;
  highlightText?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  type = 'start',
  title,
  message,
  highlightText,
  confirmLabel = 'تأكيد',
  cancelLabel = 'إلغاء',
  isDestructive = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#121824] border border-slate-800 rounded-2xl p-6 max-w-sm w-full shadow-2xl text-center relative">
        <button
          onClick={onCancel}
          className="absolute top-4 left-4 text-slate-400 hover:text-slate-200"
          type="button"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex justify-center mb-4">
          {type === 'start' && (
            <div className="w-16 h-16 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Rocket className="w-8 h-8 transform rotate-45" />
            </div>
          )}
          {type === 'reset' && (
            <div className="w-16 h-16 rounded-full bg-red-500/15 border border-red-500/30 flex items-center justify-center text-red-400">
              <RotateCcw className="w-8 h-8" />
            </div>
          )}
          {type === 'new_challenge' && (
            <div className="w-16 h-16 rounded-full bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Sparkles className="w-8 h-8" />
            </div>
          )}
        </div>

        <h3 className="text-lg font-bold text-slate-100 mb-2">{title}</h3>

        {highlightText && (
          <div className="my-2 text-2xl font-black text-amber-400 font-['JetBrains_Mono',monospace]">
            {highlightText}
          </div>
        )}

        <p className="text-sm text-slate-300 mb-6 leading-relaxed whitespace-pre-line">
          {message}
        </p>

        <div className="flex items-center gap-3">
          <button
            onClick={onConfirm}
            type="button"
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all shadow-md active:scale-95 ${
              isDestructive
                ? 'bg-red-600 hover:bg-red-500 text-white'
                : 'bg-amber-400 hover:bg-amber-300 text-slate-950'
            }`}
          >
            {confirmLabel}
          </button>
          <button
            onClick={onCancel}
            type="button"
            className="flex-1 py-3 px-4 rounded-xl font-bold text-sm bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition-all active:scale-95"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
