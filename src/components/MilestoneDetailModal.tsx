import React from 'react';
import { ArrowRight, Check, X, Clock, Calendar, Eye } from 'lucide-react';
import { Milestone } from '../types';
import { formatMoney } from '../utils/money';
import { CloudImage } from './CloudImage';

interface MilestoneDetailModalProps {
  milestone: Milestone | null;
  onClose: () => void;
  onViewImage: (url: string) => void;
}

function formatDate(timestamp?: number | null): string {
  if (!timestamp) return '-';
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(
    d.getMinutes()
  ).padStart(2, '0')}`;
}

export const MilestoneDetailModal: React.FC<MilestoneDetailModalProps> = ({
  milestone,
  onClose,
  onViewImage,
}) => {
  if (!milestone) return null;
  const isWin = milestone.status === 'WIN';
  const isLoss = milestone.status === 'LOSS';
  const isPending = milestone.status === 'PENDING';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0e1420] border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-2xl max-w-md w-full max-h-[92vh] overflow-y-auto shadow-2xl p-5 text-right">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-5">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1 text-slate-400 hover:text-slate-100 text-sm font-medium transition-colors cursor-pointer"
          >
            <ArrowRight className="w-5 h-5" />
            <span>رجوع</span>
          </button>
          <h2 className="text-base font-bold text-slate-100">تفاصيل المحطة</h2>
          <div className="w-10" />
        </div>

        <div className="bg-[#141b2a] border border-slate-800/90 rounded-2xl p-5 mb-5 shadow-inner">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-black text-slate-100 font-['JetBrains_Mono',monospace]">
              المحطة #{milestone.milestoneNumber}
            </h3>
            {isWin && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                <span>WIN</span>
              </span>
            )}
            {isLoss && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-500/15 border border-rose-500/40 text-rose-400 flex items-center gap-1">
                <X className="w-3.5 h-3.5" />
                <span>LOSS</span>
              </span>
            )}
            {isPending && (
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-400 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                <span>لم تبدأ بعد</span>
              </span>
            )}
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between py-2 border-b border-slate-800/60">
              <span className="text-slate-400">الربح</span>
              <span
                className={`font-['JetBrains_Mono',monospace] font-bold ${
                  isWin ? 'text-emerald-400' : isLoss ? 'text-rose-400' : 'text-slate-400'
                }`}
              >
                {formatMoney(milestone.profitCents, true)}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-slate-800/60">
              <span className="text-slate-400">رصيد الحساب</span>
              <span className="font-['JetBrains_Mono',monospace] font-bold text-slate-100">
                {formatMoney(milestone.balanceCents)}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className="text-slate-400 flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-slate-500" />
                <span>تاريخ الصفقة</span>
              </span>
              <span className="font-['JetBrains_Mono',monospace] text-xs font-semibold text-slate-300">
                {formatDate(milestone.timestamp)}
              </span>
            </div>
          </div>
        </div>

        {milestone.attachmentPath && (
          <div className="bg-[#141b2a] border border-slate-800/90 rounded-2xl p-4 mb-5">
            <span className="text-xs font-bold text-slate-300 block mb-3">معلومات إضافية</span>
            <div className="flex items-center justify-between gap-3 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
              <div className="w-16 h-16 rounded-lg overflow-hidden bg-black/60 border border-slate-700/60 shrink-0">
                <CloudImage
                  src={milestone.attachmentPath}
                  alt="مرفق المحطة"
                  className="w-full h-full object-cover"
                />
              </div>
              <button
                type="button"
                onClick={() => onViewImage(milestone.attachmentPath!)}
                className="flex items-center gap-1.5 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                <Eye className="w-4 h-4" />
                <span>عرض الصورة</span>
              </button>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-slate-800 hover:bg-slate-700 font-bold text-slate-200 text-sm transition-colors cursor-pointer"
        >
          إغلاق
        </button>
      </div>
    </div>
  );
};
