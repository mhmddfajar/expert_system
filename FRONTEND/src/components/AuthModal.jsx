import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { X, Mail, Lock, User, Loader2, AlertCircle, CheckCircle, Stethoscope, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function AuthModal({ isOpen, onClose, onAuthSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const resetForm = () => {
    setFullName('');
    setEmail('');
    setPassword('');
    setShowPassword(false);
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(false);
  };

  // Reset otomatis saat modal dibuka
  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen]);

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (isLogin) {
        // Proses Login
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password,
        });

        if (error) throw error;

        setSuccessMsg('Login berhasil! Mengalihkan...');
        setTimeout(() => {
          onAuthSuccess(data.user);
          resetForm();
          onClose();
        }, 800);
      } else {
        // Proses Register
        if (!fullName.trim()) {
          throw new Error('Nama lengkap wajib diisi');
        }

        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password,
          options: {
            data: {
              full_name: fullName.trim(),
            },
          },
        });

        if (error) throw error;

        // Jika session langsung aktif
        if (data.session) {
          setSuccessMsg('Pendaftaran berhasil! Selamat datang.');
          setTimeout(() => {
            onAuthSuccess(data.user);
            resetForm();
            onClose();
          }, 1000);
        } else {
          setSuccessMsg('Pendaftaran berhasil! Silakan periksa email Anda untuk verifikasi atau silakan login.');
          setIsLogin(true);
          setPassword('');
        }
      }
    } catch (err) {
      console.error('Auth error:', err);
      // Terjemahkan pesan error umum Supabase ke bahasa Indonesia
      if (err.message.includes('Invalid login credentials')) {
        setErrorMsg('Email atau kata sandi tidak cocok.');
      } else if (err.message.includes('User already registered')) {
        setErrorMsg('Email ini sudah terdaftar. Silakan login.');
      } else if (err.message.includes('Password should be at least')) {
        setErrorMsg('Kata sandi minimal harus 6 karakter.');
      } else {
        setErrorMsg(err.message || 'Terjadi kesalahan saat memproses akun.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={handleClose}
    >
      <div 
        className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 relative animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Tombol Tutup */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Logo / Header Brand */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-sm mb-3">
            <Stethoscope className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">
            {isLogin ? 'Masuk ke Akun Anda' : 'Buat Akun Baru'}
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-[260px]">
            {isLogin 
              ? 'Akses dan simpan riwayat konsultasi medis pakar Anda.' 
              : 'Daftar sekarang untuk menyimpan riwayat rekam medis pribadi Anda.'}
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-100 p-1 rounded-xl mb-5">
          <button
            type="button"
            onClick={() => {
              setIsLogin(true);
              resetForm();
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
              isLogin 
                ? 'bg-white text-blue-600 shadow-2xs' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Masuk
          </button>
          <button
            type="button"
            onClick={() => {
              setIsLogin(false);
              resetForm();
            }}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer ${
              !isLogin 
                ? 'bg-white text-blue-600 shadow-2xs' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Daftar
          </button>
        </div>

        {/* Alert Error / Success */}
        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs flex items-start gap-2">
            <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Form Inputs */}
        <form onSubmit={handleSubmit} autoComplete="off" className="space-y-3.5">
          {!isLogin && (
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-600 ml-1">Nama Lengkap</label>
              <div className="relative flex items-center">
                <User className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                <Input
                  type="text"
                  required
                  placeholder="e.g. Budi Santoso"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="off"
                  className="pl-9 h-10 text-xs rounded-xl border-slate-200 focus-visible:ring-blue-500"
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-600 ml-1">Email</label>
            <div className="relative flex items-center">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <Input
                type="email"
                required
                placeholder="nama@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="off"
                className="pl-9 h-10 text-xs rounded-xl border-slate-200 focus-visible:ring-blue-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-slate-600 ml-1">Kata Sandi</label>
            <div className="relative flex items-center">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <Input
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                placeholder="Minimal 6 karakter"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="pl-9 pr-9 h-10 text-xs rounded-xl border-slate-200 focus-visible:ring-blue-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 p-0.5 text-slate-400 hover:text-slate-600 cursor-pointer transition"
                title={showPassword ? "Sembunyikan kata sandi" : "Lihat kata sandi"}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl h-10 text-xs font-semibold cursor-pointer shadow-sm transition active:scale-[0.99] disabled:opacity-75"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Memproses...</span>
              </span>
            ) : isLogin ? (
              'Masuk'
            ) : (
              'Daftar Akun'
            )}
          </Button>
        </form>

        {/* Footer info */}
        <div className="mt-5 text-center">
          <p className="text-[11px] text-slate-400">
            Data rekam medis Anda terenkripsi aman dengan protokol Supabase RLS.
          </p>
        </div>
      </div>
    </div>
  );
}
