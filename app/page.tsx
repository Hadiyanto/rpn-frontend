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
  const [role, setRole] = useState<'Admin' | 'Staff'>('Admin');
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
      router.push('/sales'); // Redirect to sales after login
    }
    setLoading(false);
  };

  return (
    <div className="bg-brand-yellow min-h-screen flex flex-col items-center p-0 m-0 font-display">
      <div className="relative flex min-h-screen w-full max-w-[480px] flex-col bg-brand-yellow shadow-2xl">
        <div className="h-4 w-full"></div> {/* Reduced top spacing */}
        <div className="flex items-center bg-transparent p-4 pb-2 justify-between">
          <div className="text-primary flex size-12 shrink-0 items-center justify-start cursor-pointer">
            <LuChevronLeft className="text-2xl font-bold" />
          </div>
          <h2 className="text-primary text-base font-bold leading-tight tracking-tight flex-1 text-center pr-12">Raja Pisang Nugget</h2>
        </div>

        <div className="flex flex-col flex-1 px-6 pt-2 overflow-y-auto">
          <div className="flex flex-col items-center pt-2 pb-4">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-brand-yellow shadow-xl">
              <LuStore className="text-4xl" /> {/* Smaller icon */}
            </div>
            <h1 className="text-primary tracking-tight text-2xl font-extrabold leading-tight text-center">Business Login</h1>
            <p className="text-primary/70 text-sm font-medium leading-relaxed text-center mt-1 px-4">
              Manage your daily sales and financial records.
            </p>
          </div>

          <div className="bg-white/90 backdrop-blur-sm rounded-3xl p-5 shadow-xl mb-6 border border-white/20">
            <div className="flex mb-4">
              <div className="flex h-10 flex-1 items-center justify-center rounded-xl bg-gray-100 p-1">
                <label className={`flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-lg px-2 text-xs font-bold transition-all ${role === 'Admin' ? 'bg-primary text-brand-yellow' : 'text-primary/60'}`}>
                  <span className="truncate">Admin</span>
                  <input
                    className="invisible w-0"
                    name="role-toggle"
                    type="radio"
                    value="Admin"
                    checked={role === 'Admin'}
                    onChange={() => setRole('Admin')}
                  />
                </label>
                <label className={`flex cursor-pointer h-full grow items-center justify-center overflow-hidden rounded-lg px-2 text-xs font-bold transition-all ${role === 'Staff' ? 'bg-primary text-brand-yellow' : 'text-primary/60'}`}>
                  <span className="truncate">Staff</span>
                  <input
                    className="invisible w-0"
                    name="role-toggle"
                    type="radio"
                    value="Staff"
                    checked={role === 'Staff'}
                    onChange={() => setRole('Staff')}
                  />
                </label>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-primary text-[10px] font-bold uppercase tracking-wider ml-1">Username or Email</label>
                <div className="relative group">
                  <LuUser className="absolute left-4 top-1/2 -translate-y-1/2 text-primary/40 group-focus-within:text-primary transition-colors" />
                  <input
                    className="w-full pl-12 pr-4 h-12 bg-white border border-gray-200 rounded-xl text-primary text-sm focus:ring-2 focus:ring-primary/10 focus:border-primary outline-none transition-all placeholder:text-gray-400"
                    placeholder="Username"
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

            <div className="flex justify-end pt-2">
              <button className="text-primary/70 text-xs font-bold hover:text-primary hover:underline">Forgot Password?</button>
            </div>

            <div className="pt-6">
              <button
                onClick={handleLogin}
                disabled={loading}
                className="w-full h-12 bg-primary text-brand-yellow font-extrabold text-base rounded-xl shadow-lg shadow-primary/20 active:scale-[0.98] transition-transform flex items-center justify-center"
              >
                {loading ? 'Logging in...' : 'Login'}
              </button>
            </div>

            <div className="flex flex-col items-center pt-4">
              <button className="flex items-center gap-2 text-primary/60 text-xs font-bold hover:text-primary transition-colors">
                <LuScanFace className="text-lg" />
                Face ID
              </button>
            </div>
          </div>

          <div className="mt-auto pb-4 text-center">
            <p className="text-primary/70 text-xs font-medium">
              New to the team?
              <a className="text-primary font-extrabold ml-1 hover:underline" href="#">Sign Up</a>
            </p>
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
