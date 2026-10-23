import React, { useState, useEffect } from 'react';
import { Headphones, X, ShieldAlert, ArrowLeft } from 'lucide-react';
import { CurrentUser, UserAccount, getCachedUsers, subscribeToCommunityUsers } from '../data/auth';

interface GuestSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: 'general' | 'package';
  sourceContext?: 'dashboard' | 'history' | 'roadmap' | 'settings' | 'subscriptions' | 'channels';
  packageInfo?: { id: string; name: string };
  currentUser: CurrentUser;
  onSelectModerator: (moderator: UserAccount, prefilledMessage: string) => void;
}

function getPrefilledMessage(
  sourceContext: string,
  guestNumber: number,
  packageName?: string
): string {
  switch (sourceContext) {
    case 'dashboard':
      return `مرحبًا، أنا ضيف رقم ${guestNumber}، وأرغب في الاستفسار عن التطبيق.`;
    case 'history':
      return `مرحبًا، أنا ضيف رقم ${guestNumber}، وأرغب في الاستفسار عن سجل الصفقات.`;
    case 'roadmap':
      return `مرحبًا، أنا ضيف رقم ${guestNumber}، وأرغب في الاستفسار عن المحطات.`;
    case 'settings':
      return `مرحبًا، أنا ضيف رقم ${guestNumber}، وأرغب في الاستفسار عن الإعدادات.`;
    case 'channels':
      return `مرحبًا، أنا ضيف رقم ${guestNumber}، وأرغب في الاستفسار عن القنوات والمجتمع الخاص.`;
    case 'subscriptions':
      return `مرحبًا، أنا ضيف رقم ${guestNumber}، وأرغب في الاستفسار بخصوص الاشتراك في باقة (${packageName || 'الباقة'}).`;
    default:
      return `مرحبًا، أنا ضيف رقم ${guestNumber}، وأرغب في المساعدة والتواصل.`;
  }
}

export const GuestSupportModal: React.FC<GuestSupportModalProps> = ({
  isOpen,
  onClose,
  mode = 'general',
  sourceContext = 'dashboard',
  packageInfo,
  currentUser,
  onSelectModerator,
}) => {
  const [users, setUsers] = useState<UserAccount[]>(() => getCachedUsers());

  useEffect(() => {
    if (!isOpen) return;
    const unsub = subscribeToCommunityUsers(setUsers);
    return () => unsub();
  }, [isOpen]);

  if (!isOpen) return null;

  const isGeneral = mode === 'general';
  const eligibleModerators = users.filter((u) => u.role === 'moderator' || u.id === 1);
  const defaultModerator = eligibleModerators.find((u) => u.id === 1) || eligibleModerators[0] || null;

  const handleSelect = (mod: UserAccount) => {
    const guestNum = (currentUser as any).guestNumber || currentUser.id || 1001;
    const prefill = getPrefilledMessage(
      isGeneral ? sourceContext : 'subscriptions',
      guestNum,
      packageInfo?.name
    );
    onSelectModerator(mod, prefill);
    onClose();
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-3xl bg-[#090f1d] border border-amber-500/40 shadow-[0_20px_60px_rgba(0,0,0,0.9),0_0_30px_rgba(245,158,11,0.2)] overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 sm:p-5 border-b border-amber-500/20 bg-gradient-to-r from-amber-500/15 via-[#0c1424] to-amber-500/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 flex items-center justify-center font-black shadow-md shadow-amber-500/30">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-white">
                {isGeneral ? 'التواصل مع المشرفين المعتمدين' : `استفسار عن ${packageInfo?.name || 'الباقة'}`}
              </h3>
              <p className="text-xs text-amber-300/90 font-medium mt-0.5">
                محادثة خاصة برقم الضيف #{(currentUser as any).guestNumber || currentUser.id || 1001}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-right flex-1">
          {eligibleModerators.length === 0 ? (
            <div className="p-6 rounded-2xl bg-[#0e172a] border border-amber-500/30 text-center space-y-2">
              <ShieldAlert className="w-8 h-8 text-amber-400 mx-auto" />
              <p className="text-sm font-bold text-slate-200">
                لا يوجد مشرف متاح لاستقبال رسائل الدعم حاليًا. يرجى المحاولة لاحقًا.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-200 leading-relaxed">
                اختر المشرف الذي ترغب في محادثته. سيتم فتح المحادثة الخاصة وتجهيز رسالتك في مربع الكتابة لتراجعها وترسلها متى شئت.
              </div>

              {defaultModerator && (
                <div
                  onClick={() => handleSelect(defaultModerator)}
                  className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-[#0d1627] to-amber-500/10 border-2 border-amber-400/60 shadow-lg shadow-amber-500/15 flex items-center justify-between cursor-pointer hover:border-amber-300 transition group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold text-lg shadow-md shrink-0">
                      👑
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-white group-hover:text-amber-300 transition">
                          {defaultModerator.displayName}
                        </span>
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-400 text-slate-950">
                          المشرف الافتراضي
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 mt-0.5">
                        {defaultModerator.id === 1 ? 'القائد والمالك العام' : 'مشرف معتمد للدعم'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="px-3 py-1.5 rounded-xl bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1 shadow group-hover:scale-105 transition shrink-0"
                  >
                    <span>محادثة فورية</span>
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="space-y-2 pt-1">
                <span className="text-[11px] font-bold text-slate-400 block px-1">
                  المشرفون المؤهلون ({eligibleModerators.length}):
                </span>
                {eligibleModerators.map((mod) => (
                  <div
                    key={mod.id}
                    onClick={() => handleSelect(mod)}
                    className="p-3 rounded-2xl border transition flex items-center justify-between cursor-pointer group bg-[#0b1220] border-slate-800 hover:border-amber-500/40 hover:bg-[#0e1628]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-amber-400 shrink-0">
                        {mod.id === 1 ? '👑' : '🛡️'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-white group-hover:text-amber-300 transition">
                            {mod.displayName}
                          </span>
                          {mod.id === 1 ? (
                            <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-amber-400 text-slate-950 font-bold">
                              المالك
                            </span>
                          ) : (
                            <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                              مشرف
                            </span>
                          )}
                        </div>
                        <span className="text-[10.5px] text-slate-400">@{mod.username}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 text-xs font-bold text-amber-400 group-hover:translate-x-[-2px] transition">
                      <span>بدء المحادثة</span>
                      <ArrowLeft className="w-4 h-4" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-3.5 border-t border-slate-800 bg-[#070c17] flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};
