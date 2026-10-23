import React, { useState } from 'react';
import { User, Lock, Eye, EyeOff, LogIn, AlertCircle, ShieldCheck } from 'lucide-react';
import { BackgroundVideo } from './BackgroundVideo';
import { CurrentUser, authenticateUserAsync, loginAsGuest } from '../data/auth';

interface LoginScreenProps {
  onLoginSuccess: (user: CurrentUser) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const result = await authenticateUserAsync(username, password);
      setIsLoading(false);
      if (result.success && result.user) {
        onLoginSuccess(result.user);
      } else {
        setErrorMessage(result.error || 'اسم المستخدم أو كلمة المرور غير صحيحة.');
      }
    } catch {
      setIsLoading(false);
      setErrorMessage('تعذر التحقق من بيانات الدخول، يرجى المحاولة مرة أخرى.');
    }
  };

  const handleGuestLogin = async () => {
    setErrorMessage(null);
    setIsLoading(true);
    try {
      const guest = await loginAsGuest();
      setIsLoading(false);
      onLoginSuccess(guest);
    } catch (err) {
      setIsLoading(false);
      setErrorMessage(
        err instanceof Error ? err.message : 'تعذر الدخول كضيف، يرجى المحاولة مرة أخرى.'
      );
    }
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center p-4 selection:bg-amber-400 selection:text-black overflow-hidden font-['Cairo']">
      <BackgroundVideo overlayOpacity="bg-black/70" />

      <div className="relative z-10 w-full max-w-md bg-[#0d131f]/90 border border-amber-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-black/80 backdrop-blur-md animate-in fade-in zoom-in-95 duration-300">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="relative mb-3 group">
            <img
              src="/app-icon.png"
              alt="Sami Logo"
              className="w-20 h-20 rounded-2xl object-cover border-2 border-amber-400 shadow-xl shadow-amber-500/20"
              referrerPolicy="no-referrer"
            />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-[#0d131f] flex items-center justify-center text-black">
              <ShieldCheck className="w-3.5 h-3.5 stroke-[3]" />
            </div>
          </div>
          <h1 className="text-2xl font-black text-white tracking-wide flex items-center gap-1.5">
            <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-amber-500 bg-clip-text text-transparent">
              Sami
            </span>
          </h1>
          <p className="text-xs text-slate-300 mt-1 font-medium">
            متتبع رحلة التداول الشخصية • تسجيل الدخول
          </p>
        </div>

        {errorMessage && (
          <div
            dir="rtl"
            className="mb-5 flex items-center gap-2.5 p-3.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs font-bold animate-in shake duration-200"
          >
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4" dir="rtl">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 text-right">
              اسم المستخدم (Username)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="أدخل اسم المستخدم المصرح به"
                required
                autoComplete="username"
                className="w-full bg-[#131b2c] border border-slate-700/80 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 rounded-xl pr-10 pl-3 py-3 text-sm text-white placeholder-slate-500 outline-none transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 text-right">
              كلمة المرور (Password)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="أدخل كلمة المرور"
                required
                autoComplete="current-password"
                className="w-full bg-[#131b2c] border border-slate-700/80 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 rounded-xl pr-10 pl-10 py-3 text-sm text-white placeholder-slate-500 outline-none transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 hover:text-slate-200 transition cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3.5 px-4 rounded-xl font-black text-sm tracking-wide bg-gradient-to-r from-amber-500 via-amber-400 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-lg shadow-amber-500/25 active:scale-[0.98] transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <span className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>تسجيل الدخول</span>
                <LogIn className="w-4 h-4" />
              </>
            )}
          </button>

          <div className="relative flex items-center justify-center my-3 pt-1">
            <div className="border-t border-slate-700/60 w-full" />
            <span className="bg-[#0d131f] px-3 text-[11px] text-slate-400 font-bold">أو</span>
            <div className="border-t border-slate-700/60 w-full" />
          </div>

          <button
            type="button"
            disabled={isLoading}
            onClick={handleGuestLogin}
            className="w-full py-3.5 px-4 rounded-xl font-black text-sm tracking-wide bg-gradient-to-r from-slate-800 via-[#131d2e] to-slate-800 hover:from-slate-700 hover:to-slate-700 text-amber-300 border border-amber-500/40 hover:border-amber-400 shadow-md active:scale-[0.98] transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <User className="w-4 h-4 text-amber-400" />
            <span>الدخول كضيف 👤</span>
          </button>
        </form>
      </div>
    </div>
  );
};
