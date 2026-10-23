import React, { useState, useRef } from 'react';
import { ArrowRight, TrendingUp, TrendingDown, Image as ImageIcon, Camera, Trash2, AlertCircle } from 'lucide-react';
import { formatMoney, parseToCents } from '../utils/money';
import { processImageFile } from '../utils/image';

interface AddTradeModalProps {
  isOpen: boolean;
  currentBalanceCents: number;
  tradeCount: number;
  onClose: () => void;
  onSubmit: (resultCents: number, attachmentBase64?: string | null) => Promise<void> | void;
}

export const AddTradeModal: React.FC<AddTradeModalProps> = ({
  isOpen,
  currentBalanceCents,
  tradeCount,
  onClose,
  onSubmit,
}) => {
  const [amountStr, setAmountStr] = useState('');
  const [tradeType, setTradeType] = useState<'positive' | 'negative'>('positive');
  const [attachmentBase64, setAttachmentBase64] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      setErrorMessage('حجم الصورة كبير جداً، يرجى اختيار صورة أقل من 15 ميغابايت.');
      return;
    }

    try {
      setIsSubmitting(true);
      const processed = await processImageFile(file, 1280, 0.82);
      setAttachmentBase64(processed);
      setErrorMessage(null);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'تعذر معالجة الصورة');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    let val = amountStr.trim();
    if (!val) {
      setErrorMessage('يرجى إدخال نتيجة الصفقة.');
      return;
    }

    if (!val.startsWith('+') && !val.startsWith('-')) {
      val = (tradeType === 'negative' ? '-' : '+') + val;
    }

    const parsed = parseToCents(val);
    if (!parsed.valid || parsed.cents === undefined) {
      setErrorMessage(parsed.error || 'يرجى إدخال رقم صحيح.');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit(parsed.cents, attachmentBase64);
      setAmountStr('');
      setAttachmentBase64(null);
      setErrorMessage(null);
      onClose();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'حدث خطأ أثناء حفظ الصفقة.');
    } finally {
      setIsSubmitting(false);
    }
  };

  let expectedBalance = currentBalanceCents;
  if (amountStr.trim()) {
    let val = amountStr.trim();
    if (!val.startsWith('+') && !val.startsWith('-')) {
      val = (tradeType === 'negative' ? '-' : '+') + val;
    }
    const parsed = parseToCents(val);
    if (parsed.valid && parsed.cents !== undefined) {
      expectedBalance = currentBalanceCents + parsed.cents;
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-[#0e1420] border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-2xl max-w-md w-full max-h-[92vh] overflow-y-auto shadow-2xl p-5 text-right">
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
        <input
          type="file"
          ref={cameraInputRef}
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="flex items-center justify-between pb-4 border-b border-slate-800/80 mb-5">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1 text-slate-400 hover:text-slate-100 text-sm font-medium transition-colors"
          >
            <ArrowRight className="w-5 h-5" />
            <span>رجوع</span>
          </button>
          <h2 className="text-base font-bold text-slate-100">
            إضافة صفقة جديدة (الصفقة #{tradeCount + 1})
          </h2>
          <div className="w-10" />
        </div>

        <div className="bg-[#141b2a] border border-slate-800 rounded-2xl p-4 mb-5 text-center shadow-inner">
          <span className="text-xs text-slate-400 font-medium block mb-1">الرصيد الحالي</span>
          <div className="text-2xl font-black text-slate-100 font-['JetBrains_Mono',monospace]">
            {formatMoney(currentBalanceCents)}
          </div>
          {amountStr && (
            <div className="mt-2 text-xs text-amber-400 font-medium flex items-center justify-center gap-1">
              <span>الرصيد المتوقع بعد الصفقة:</span>
              <span className="font-['JetBrains_Mono',monospace] font-bold">
                {formatMoney(expectedBalance)}
              </span>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              نتيجة الصفقة
            </label>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                type="button"
                onClick={() => setTradeType('positive')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                  tradeType === 'positive'
                    ? 'bg-emerald-500/15 border-emerald-500 text-emerald-400 shadow-sm'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                <span>ربح (+)</span>
              </button>
              <button
                type="button"
                onClick={() => setTradeType('negative')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                  tradeType === 'negative'
                    ? 'bg-rose-500/15 border-rose-500 text-rose-400 shadow-sm'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <TrendingDown className="w-4 h-4" />
                <span>خسارة (-)</span>
              </button>
            </div>

            <div className="relative">
              <input
                type="text"
                inputMode="decimal"
                value={amountStr}
                onChange={(e) => {
                  setAmountStr(e.target.value);
                  setErrorMessage(null);
                }}
                placeholder="أدخل الربح أو الخسارة (مثال: 20 أو -15)"
                className="w-full bg-[#141b2a] border border-slate-700/80 rounded-xl px-4 py-3 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 transition-all text-left font-['JetBrains_Mono',monospace]"
                dir="ltr"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5 text-right">
              يمكنك كتابة القيمة مباشرة مثل:{' '}
              <span className="font-mono text-amber-400">20</span> أو{' '}
              <span className="font-mono text-rose-400">-15</span>
            </p>
          </div>

          <div className="bg-[#141b2a] border border-slate-800/80 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-amber-400" />
                <span>إرفاق صورة (اختياري • تخزين سحابي)</span>
              </span>
              {attachmentBase64 && (
                <button
                  type="button"
                  onClick={() => setAttachmentBase64(null)}
                  className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 font-medium"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>حذف الصورة</span>
                </button>
              )}
            </div>

            {attachmentBase64 ? (
              <div className="relative rounded-xl overflow-hidden border border-slate-700 max-h-40 flex items-center justify-center bg-black/40">
                <img
                  src={attachmentBase64}
                  alt="مرفق الصفقة"
                  className="object-contain max-h-40 w-full"
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-700/80 hover:border-amber-400/60 rounded-xl cursor-pointer bg-slate-900/40 hover:bg-slate-900/80 transition-all text-center"
                >
                  <div className="w-9 h-9 rounded-full bg-slate-800/80 flex items-center justify-center text-slate-300 mb-1.5">
                    <ImageIcon className="w-4 h-4 text-amber-400" />
                  </div>
                  <span className="text-xs font-bold text-slate-200">اختر من المعرض</span>
                  <span className="text-[10px] text-slate-400 mt-0.5">صورة الشارت</span>
                </button>
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-700/80 hover:border-amber-400/60 rounded-xl cursor-pointer bg-slate-900/40 hover:bg-slate-900/80 transition-all text-center"
                >
                  <div className="w-9 h-9 rounded-full bg-slate-800/80 flex items-center justify-center text-slate-300 mb-1.5">
                    <Camera className="w-4 h-4 text-amber-400" />
                  </div>
                  <span className="text-xs font-bold text-slate-200">التقط بالكاميرا</span>
                  <span className="text-[10px] text-slate-400 mt-0.5">تصوير مباشر</span>
                </button>
              </div>
            )}
          </div>

          {errorMessage && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 rounded-xl font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 active:scale-[0.98] transition-all shadow-lg shadow-amber-500/15 disabled:opacity-50 disabled:pointer-events-none text-sm"
          >
            {isSubmitting ? 'جاري الرفع وتسجيل الصفقة...' : 'تأكيد الصفقة'}
          </button>
        </form>
      </div>
    </div>
  );
};
