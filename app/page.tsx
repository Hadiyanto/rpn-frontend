'use client';

import { createClient } from '@/utils/supabase/client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  LuChevronLeft,
  LuStore,
  LuUser,
  LuLock,
  LuEye,
  LuEyeOff,
  LuScanFace,
  LuShieldCheck
} from 'react-icons/lu';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      alert(error.message);
    } else {
      router.refresh();
      router.push('/orders'); // Redirect to orders after login
    }
    setLoading(false);
  };

  return (
    <div className="bg-brand-yellow min-h-screen flex flex-col items-center p-0 m-0 font-display">
      <div className="relative flex min-h-screen w-full max-w-[480px] flex-col bg-brand-yellow shadow-2xl">
        <div className="h-4 w-full"></div>
        <div className="flex items-center bg-transparent p-4 pb-6 justify-center">
          <h2 className="text-primary text-base font-bold leading-tight tracking-tight text-center">Raja Pisang Nugget</h2>
        </div>

        <div className="flex flex-col flex-1 px-6 pt-6 overflow-y-auto justify-center">
          <div className="flex flex-col items-center pt-2 pb-6">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-brand-yellow shadow-xl">
              <LuStore className="text-4xl" /> {/* Smaller icon */}
            </div>
            <h1 className="text-primary tracking-tight text-2xl font-extrabold leading-tight text-center">Business Login</h1>
            <p className="text-primary/70 text-sm font-medium leading-relaxed text-center mt-1 px-4">
              Manage your daily sales and financial records.
            </p>
          </div>

          <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-5 shadow-xl mb-6 border border-white/20">

            <div className="space-y-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-primary text-[10px] font-bold uppercase tracking-wider ml-1">Email</label>
                <div className="relative group">
                  <LuUser className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/40 group-focus-within:text-primary transition-colors" />
                  <input
                    className="w-full pl-12 pr-4 h-12 bg-white border border-gray-200 rounded-xl text-primary text-sm focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all placeholder:text-gray-400"
                    placeholder="Email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-primary text-[10px] font-bold uppercase tracking-wider ml-1">Password</label>
                <div className="relative group">
                  <LuLock className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/40 group-focus-within:text-primary transition-colors" />
                  <input
                    className="w-full pl-12 pr-12 h-12 bg-white border border-gray-200 rounded-xl text-primary text-sm focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all placeholder:text-gray-400"
                    placeholder="••••••••"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <div
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-primary/40 cursor-pointer hover:text-primary transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <LuEyeOff /> : <LuEye />}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <button
                onClick={handleLogin}
                disabled={loading}
                className="w-full h-12 bg-primary text-brand-yellow font-extrabold text-base rounded-xl shadow-lg shadow-primary/20 active:scale-[0.98] transition-transform flex items-center justify-center"
              >
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </div>
          </div>

          <div className="mt-auto pb-4 text-center">
            <div className="flex items-center justify-center gap-2 pt-4 opacity-40 text-primary">
              <LuShieldCheck className="text-xs" />
              <span className="text-[10px] uppercase tracking-widest font-extrabold">Secure Financial Portal</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
