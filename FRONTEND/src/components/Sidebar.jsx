import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Trash2, 
  MessageSquare, 
  Clock, 
  X, 
  LogIn, 
  LogOut,
  Search,
  ShieldCheck,
  Stethoscope,
  PanelLeftClose,
  User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function Sidebar({
  isOpen,
  onClose,
  consultations,
  activeConsultationId,
  onSelectConsultation,
  onNewConsultation,
  onDeleteConsultation,
  user,
  onOpenAuth,
  onLogout,
  loadingHistory
}) {
  const [searchQuery, setSearchQuery] = useState('');

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    }
    
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Kemarin';
    }

    return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  };

  const getTriageBadge = (level) => {
    if (level === 'MERAH') {
      return (
        <span className="inline-flex items-center gap-1 text-[9px] font-bold text-red-600 bg-red-50 border border-red-200/90 px-1.5 py-0.2 rounded shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
          UGD
        </span>
      );
    }
    return null;
  };

  // Search riwayat
  const filteredConsultations = useMemo(() => {
    return consultations.filter((item) => {
      return (item.title || '').toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [consultations, searchQuery]);

  return (
    <>
      {/* Backdrop untuk tampilan mobile */}
      {isOpen && (
        <div 
          onClick={onClose} 
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-2xs z-30 md:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside 
        className={`fixed md:static top-0 bottom-0 left-0 z-40 w-80 bg-white border-r border-slate-200/80 flex flex-col transition-all duration-300 ease-in-out shadow-xs ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0 md:w-0 md:border-r-0 md:overflow-hidden'
        }`}
      >
        {/* Sidebar Header Brand */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-gradient-to-tr from-blue-600 to-sky-500 text-white rounded-xl shadow-xs">
              <Stethoscope className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-slate-800 tracking-tight">Rekam Medis Pakar</h2>
              <p className="text-[10px] text-slate-400">Riwayat Konsultasi Pribadi</p>
            </div>
          </div>

          {/* Tombol Tutup Sidebar */}
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer transition"
            title="Tutup Sidebar"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>

        {/* Action: Tombol Konsultasi Baru */}
        <div className="p-3 pb-2 space-y-2.5">
          <Button
            onClick={() => {
              if (!user) {
                onOpenAuth();
                return;
              }
              onNewConsultation();
              if (window.innerWidth < 768) onClose();
            }}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-xl py-2 h-9 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-[0.99] transition"
          >
            <Plus className="w-4 h-4" />
            <span>Konsultasi Gejala Baru</span>
          </Button>

          {/* Search Box (Tampil jika sudah login & ada riwayat) */}
          {user && consultations.length > 0 && (
            <div className="space-y-2">
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 pointer-events-none" />
                <Input
                  type="text"
                  placeholder="Cari riwayat keluhan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoComplete="off"
                  className="pl-8 pr-2 h-8 text-xs bg-slate-50 border-slate-200/80 rounded-lg focus-visible:ring-blue-500"
                />
              </div>

              {/* Tab Semua */}
              <div className="flex items-center justify-between text-[10px] pt-0.5 px-0.5">
                <span className="px-2.5 py-0.5 rounded-md font-semibold bg-blue-600 text-white shadow-2xs">
                  Semua
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  {filteredConsultations.length} riwayat
                </span>
              </div>
            </div>
          )}
        </div>

        {/* List Riwayat Percakapan */}
        <div className="flex-1 overflow-y-auto px-3 py-1 space-y-1.5">
          {!user ? (
            /* Hint login - cukup di bawah */
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center text-slate-400 space-y-2">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <MessageSquare className="w-6 h-6 stroke-1 text-slate-300" />
              </div>
              <p className="text-xs font-medium text-slate-700">Belum ada riwayat</p>
              <p className="text-[11px] text-slate-400 max-w-[190px]">
                Masuk terlebih dahulu untuk menyimpan riwayat konsultasi.
              </p>
            </div>
          ) : loadingHistory ? (
            /* Skeleton Loading Shimmer */
            <div className="space-y-1.5 py-1">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="p-3 rounded-xl border border-slate-100 bg-slate-50/70 animate-pulse flex items-center justify-between gap-2">
                  <div className="h-3 w-3/5 bg-slate-200/80 rounded-md"></div>
                  <div className="h-2.5 w-10 bg-slate-200/70 rounded-md"></div>
                </div>
              ))}
            </div>
          ) : consultations.length === 0 ? (
            /* State Kosong */
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center text-slate-400 space-y-2">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <MessageSquare className="w-6 h-6 stroke-1 text-slate-300" />
              </div>
              <p className="text-xs font-medium text-slate-700">Belum ada riwayat</p>
              <p className="text-[11px] text-slate-400 max-w-[190px]">
                Konsultasi gejala pertama Anda akan otomatis tersimpan di sini.
              </p>
            </div>
          ) : filteredConsultations.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              Tidak ada hasil yang sesuai filter.
            </div>
          ) : (
            /* Daftar Item Konsultasi */
            filteredConsultations.map((item) => {
              const isActive = item.id === activeConsultationId;
              const badge = getTriageBadge(item.triage_level);
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    onSelectConsultation(item.id);
                    if (window.innerWidth < 768) onClose();
                  }}
                  className={`group relative flex items-center justify-between p-3 rounded-xl cursor-pointer transition text-xs border ${
                    isActive
                      ? 'bg-blue-50/80 border-blue-200/90 text-blue-950 font-medium shadow-2xs'
                      : 'hover:bg-slate-50/80 border-slate-100/90 text-slate-700 hover:border-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-1.5 min-w-0 flex-1 pr-2">
                    {badge}
                    <p className="truncate text-xs font-medium text-slate-800 leading-snug">
                      {item.title || 'Konsultasi Gejala'}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] text-slate-400">
                      {formatDate(item.created_at)}
                    </span>
                    {/* Tombol Hapus Sesi - inline agar tidak overlap */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm('Hapus riwayat konsultasi ini?')) {
                          onDeleteConsultation(item.id);
                        }
                      }}
                      title="Hapus Konsultasi"
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 rounded-md hover:bg-red-50 transition cursor-pointer shrink-0"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Sidebar Footer: User Profile & Logout */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/60 space-y-2">
          {user ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-sky-600 text-white flex items-center justify-center text-xs font-bold shrink-0">
                  {user.user_metadata?.full_name ? user.user_metadata.full_name[0].toUpperCase() : 'U'}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-slate-800 truncate">
                    {user.user_metadata?.full_name || user.email?.split('@')[0]}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">
                    {user.email}
                  </p>
                </div>
              </div>
              <button
                onClick={onLogout}
                title="Keluar dari akun"
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer shrink-0"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Button
              size="sm"
              onClick={onOpenAuth}
              className="w-full text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl h-8 cursor-pointer border border-slate-200"
            >
              <LogIn className="w-3.5 h-3.5 mr-1.5" />
              Masuk / Buat Akun
            </Button>
          )}
        </div>
      </aside>
    </>
  );
}
