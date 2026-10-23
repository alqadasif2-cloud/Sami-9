import React from 'react';
import { AlertTriangle, Sparkles, ArrowLeft, Download } from 'lucide-react';
import { AppUpdateConfig, CURRENT_CLIENT_VERSION_NAME, CURRENT_CLIENT_VERSION_CODE } from '../services/appUpdates';

interface AppUpdateModalProps {
  config: AppUpdateConfig;
  isOpen: boolean;
  onDismiss: () => void;
}

export const AppUpdateModal: React.FC<AppUpdateModalProps> = ({ config, isOpen, onDismiss }) => {
  if (!isOpen) return null;
  const isMandatory = Boolean(config.isMandatory);

  const handleDownload = () => {
    const url = config.downloadUrl?.trim();
    if (!url) return;
    const targetUrl = !url.startsWith('http://') && !url.startsWith('https://') ? `https://${url}` : url;
    window.open(targetUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-sm bg-[#090d17] border border-amber-500/40 rounded-3xl p-6 shadow-2xl text-center space-y-4">
        <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400/20 to-amber-500/10 border border-amber-400/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/10">
          {isMandatory ? (
            <AlertTriangle className="w-8 h-8 text-rose-500" />
          ) : (
            <Sparkles className="w-8 h-8 text-amber-400" />
          )}
        </div>

        <div>
          <h3 className="text-base font-black text-white">
            {isMandatory ? 'تحديث إجباري متوفر للتطبيق' : 'تحديث جديد متوفر للتطبيق'}
          </h3>
          <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full text-[11px] font-bold border border-amber-400/30 bg-amber-400/10 text-amber-300">
            {isMandatory ? (
              <span className="text-rose-400">⚠️ يلزم التحديث للمتابعة وحماية البيانات</span>
            ) : (
              <span>✨ ميزات جديدة وتحسينات متاحة الآن</span>
            )}
          </div>
        </div>

        <div className="bg-[#0f1523] border border-amber-500/20 rounded-2xl p-3.5 flex items-center justify-around">
          <div className="text-center">
            <span className="block text-[10px] text-slate-400 font-medium">الإصدار المثبت</span>
            <span className="text-xs font-bold text-slate-200">v{CURRENT_CLIENT_VERSION_NAME}</span>
            <span className="block text-[9px] text-slate-500">كود {CURRENT_CLIENT_VERSION_CODE}</span>
          </div>

          <ArrowLeft className="w-4 h-4 text-amber-400" />

          <div className="text-center">
            <span className="block text-[10px] text-amber-400 font-bold">الإصدار الجديد</span>
            <span className="text-sm font-black text-amber-300">v{config.versionName}</span>
            <span className="block text-[9px] text-amber-200/80">كود {config.versionCode}</span>
          </div>
        </div>

        {config.description && (
          <div className="bg-[#0d121f] border border-slate-800 rounded-2xl p-3.5 text-right">
            <span className="block text-[11px] font-bold text-amber-400 mb-1">
              📋 وصف التحديث والميزات الجديدة:
            </span>
            <p className="text-xs text-slate-300 leading-relaxed max-h-36 overflow-y-auto whitespace-pre-wrap">
              {config.description}
            </p>
          </div>
        )}

        <div className="space-y-2 pt-2">
          <button
            type="button"
            onClick={handleDownload}
            className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>تحديث الآن (تحميل APK)</span>
          </button>

          {!isMandatory && (
            <button
              type="button"
              onClick={onDismiss}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 font-bold text-xs border border-slate-800 transition cursor-pointer"
            >
              لاحقاً
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
