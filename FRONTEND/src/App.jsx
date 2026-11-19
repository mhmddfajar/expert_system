import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { supabase } from '@/lib/supabase';
import AuthModal from '@/components/AuthModal';
import Sidebar from '@/components/Sidebar';
import { 
  Send, 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle2,
  Stethoscope, 
  RotateCcw, 
  PanelLeft, 
  Copy, 
  Shield, 
  CheckCheck
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState(null);
  
  // State Sesi & Riwayat
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [consultations, setConsultations] = useState([]);
  const [activeConsultationId, setActiveConsultationId] = useState(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const messagesEndRef = useRef(null);

  // Pantau sesi Supabase
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Ambil daftar riwayat konsultasi saat login
  const fetchConsultations = async (userId) => {
    if (!userId) {
      setConsultations([]);
      return;
    }
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('consultations')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setConsultations(data || []);
    } catch (err) {
      console.error('Error fetching consultations:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchConsultations(user.id);
    } else {
      setConsultations([]);
      setActiveConsultationId(null);
    }
  }, [user]);

  // Auto-scroll ke bawah saat ada pesan baru
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Buka sidebar di desktop secara default jika layar lebar
  useEffect(() => {
    if (window.innerWidth >= 1024) {
      setIsSidebarOpen(true);
    }
  }, []);

  // Rekomendasi keluhan cepat ala Halodoc / Alodokter
  const quickSymptoms = [
    { label: "🩹 Luka Bakar / Melepuh", text: "Pertolongan pertama luka bakar air panas di tangan, kulit memerah dan perih" },
    { label: "🌀 Pusing Berputar (Vertigo)", text: "Kepala terasa berputar saat membuka mata disertai rasa mual" },
    { label: "🤒 Demam Tinggi & Lemas", text: "Demam tinggi sudah 2 hari berturut-turut, badan lemas dan sakit kepala" },
    { label: "🚨 Nyeri Dada & Sesak", text: "Nyeri dada sebelah kiri terasa tertekan berat dan sesak napas" },
    { label: "🐝 Sengatan Serangga", text: "Tersengat serangga di lengan, timbul bengkak, merah dan gatal perih" },
    { label: "🤢 Perut Perih / Maag Akut", text: "Perut bagian ulu hati perih melilit dan mual setelah telat makan" },
  ];

  // Muat sesi lama dari sidebar
  const handleSelectConsultation = async (consultationId) => {
    if (loading) return;
    setActiveConsultationId(consultationId);
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('consultation_id', consultationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const loadedMessages = (data || []).map((row) => ({
        role: row.role,
        content: row.content,
        data: row.data,
      }));

      setMessages(loadedMessages);
    } catch (err) {
      console.error('Error loading consultation messages:', err);
    } finally {
      setLoading(false);
    }
  };

  // Buat sesi konsultasi baru
  const handleNewConsultation = () => {
    setActiveConsultationId(null);
    setMessages([]);
    setInput('');
  };

  // Hapus konsultasi dari Supabase
  const handleDeleteConsultation = async (consultationId) => {
    try {
      const { error } = await supabase
        .from('consultations')
        .delete()
        .eq('id', consultationId);

      if (error) throw error;

      setConsultations((prev) => prev.filter((c) => c.id !== consultationId));
      if (activeConsultationId === consultationId) {
        handleNewConsultation();
      }
    } catch (err) {
      console.error('Error deleting consultation:', err);
    }
  };

  // Salin rangkuman resume medis
  const handleCopySummary = (data, idx) => {
    if (!data) return;
    const text = `*RESUME MEDIS DOKTER PAKAR*\n\n` +
      `🩺 *Diagnosis:* ${data.diagnosis}\n` +
      `🚨 *Triase Medis:* ${data.triage_level}\n\n` +
      `📋 *Langkah Tindakan & Pertolongan:*\n` +
      data.first_aid_steps?.map((s, i) => `${i + 1}. ${s}`).join('\n') +
      `\n\n💡 *Penjelasan Alasan Medis:*\n${data.explanation}\n\n` +
      (data.warning ? `⚠️ *Catatan Pantangan:* ${data.warning}\n\n` : '') +
      `Konsultan: Dokter Pakar AI • Sistem Pakar Medis Klinis`;

    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  // Kirim pesan keluhan
  const handleSend = async (customMessage) => {
    // Wajib login untuk melakukan konsultasi
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }

    const textToSend = customMessage || input;
    if (!textToSend.trim() || loading) return;

    if (!customMessage) setInput('');
    const newMessages = [...messages, { role: 'user', content: textToSend }];
    setMessages(newMessages);
    setLoading(true);

    let currentConsultationId = activeConsultationId;

    // Jika user login & belum ada sesi aktif, buat sesi di database
    if (user?.id && !currentConsultationId) {
      try {
        const { data: newConsultation, error: cErr } = await supabase
          .from('consultations')
          .insert({
            user_id: user.id,
            title: textToSend.substring(0, 36) + (textToSend.length > 36 ? '...' : ''),
            triage_level: 'HIJAU',
          })
          .select()
          .single();

        if (!cErr && newConsultation) {
          currentConsultationId = newConsultation.id;
          setActiveConsultationId(currentConsultationId);
          setConsultations((prev) => [newConsultation, ...prev]);
        }
      } catch (err) {
        console.error('Error creating consultation session:', err);
      }
    }

    // Simpan pesan user ke database
    if (user?.id && currentConsultationId) {
      supabase
        .from('messages')
        .insert({
          consultation_id: currentConsultationId,
          user_id: user.id,
          role: 'user',
          content: textToSend,
        })
        .then(({ error }) => {
          if (error) console.error('Error saving user message:', error);
        });
    }

    try {
      const response = await axios.post('http://localhost:5000/api/chat', {
        message: textToSend,
        history: messages,
      });

      if (response.data.success) {
        const assistantData = response.data.data;
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', data: assistantData },
        ]);

        // Simpan respons dokter ke database
        if (user?.id && currentConsultationId) {
          supabase
            .from('messages')
            .insert({
              consultation_id: currentConsultationId,
              user_id: user.id,
              role: 'assistant',
              content: assistantData.message || assistantData.diagnosis || '',
              data: assistantData,
            })
            .then(({ error }) => {
              if (error) console.error('Error saving assistant message:', error);
            });

          // Jika diagnosis selesai, perbarui judul dan triase level di riwayat
          if (assistantData.status === 'diagnosis') {
            const updatedTitle = assistantData.diagnosis?.substring(0, 40) || 'Diagnosis Klinis';
            const updatedTriage = assistantData.triage_level || 'HIJAU';

            supabase
              .from('consultations')
              .update({
                title: updatedTitle,
                triage_level: updatedTriage,
                updated_at: new Date().toISOString(),
              })
              .eq('id', currentConsultationId)
              .then(({ error }) => {
                if (!error) {
                  setConsultations((prev) =>
                    prev.map((c) =>
                      c.id === currentConsultationId
                        ? { ...c, title: updatedTitle, triage_level: updatedTriage }
                        : c
                    )
                  );
                }
              });
          }
        }
      }
    } catch (error) {
      console.error('Error:', error);
      const errorMsg =
        error.response?.data?.details ||
        error.response?.data?.error ||
        'Gagal terhubung ke server pakar. Pastikan backend aktif.';
      setMessages((prev) => [
        ...prev,
        {
          role: 'error',
          content: errorMsg,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    handleNewConsultation();
  };

  const currentTime = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="flex h-screen h-[100dvh] bg-[#F1F5F9] font-sans text-slate-800 overflow-hidden selection:bg-sky-100 selection:text-sky-900">
      
      {/* 1. Sidebar Riwayat Konsultasi (Slide Drawer) */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        consultations={consultations}
        activeConsultationId={activeConsultationId}
        onSelectConsultation={handleSelectConsultation}
        onNewConsultation={handleNewConsultation}
        onDeleteConsultation={handleDeleteConsultation}
        user={user}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
        loadingHistory={loadingHistory}
      />

      {/* 2. Chat Telemedicine Room Workspace */}
      <div className="flex-1 flex flex-col h-full min-w-0 bg-white shadow-xl relative">
        
        {/* Top Header ala Ruang Konsultasi Halodoc / Alodokter */}
        <header className="h-16 px-4 bg-white border-b border-slate-200/80 flex items-center justify-between shrink-0 z-20">
          
          {/* Sisi Kiri: Tombol Menu & Identitas Dokter */}
          <div className="flex items-center gap-3 min-w-0">
            {!isSidebarOpen && (
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                title="Buka Riwayat"
              >
                <PanelLeft className="w-5 h-5" />
              </button>
            )}

            {/* Avatar & Info Dokter */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative shrink-0">
                <img
                  src="/doctor-avatar.jpg"
                  alt="Dokter Pakar AI"
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-sky-500/80 shadow-xs"
                />
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></span>
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h1 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                    Dokter Pakar AI
                  </h1>
                  <CheckCircle2 className="w-3.5 h-3.5 text-sky-600 shrink-0" title="Sistem Terverifikasi Klinis" />
                </div>
                <p className="text-[11px] text-slate-500 truncate flex items-center gap-1.5">
                  <span className="text-emerald-600 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Aktif
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Sisi Kanan: Tombol Sesi Baru */}
          <div className="flex items-center gap-2 shrink-0">
            {messages.length > 0 && (
              <button
                onClick={handleNewConsultation}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                title="Mulai Sesi Baru"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Sesi Baru</span>
              </button>
            )}
          </div>
        </header>

        {/* 3. Ruang Percakapan Chat Stream */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-gradient-to-b from-slate-50/70 via-white to-slate-50/40">
          
          {/* Status Enkripsi Medis */}
          <div className="flex justify-center my-1">
            <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-500 bg-slate-100/90 border border-slate-200/80 px-3 py-1 rounded-full shadow-2xs">
              <Shield className="w-3 h-3 text-emerald-600" />
              Ruang Konsultasi Medis Terenkripsi • Data Pasien Rahasia
            </span>
          </div>

          {/* Pesan Sambutan Pembuka (Saat Chat Kosong) */}
          {messages.length === 0 && (
            <div className="max-w-2xl mx-auto space-y-4 py-4 animate-in fade-in duration-300">
              
              {/* Bubble Pembuka dari Dokter */}
              <div className="flex items-start gap-2.5">
                <img
                  src="/doctor-avatar.jpg"
                  alt="Dokter Pakar AI"
                  className="w-8 h-8 rounded-full object-cover ring-2 ring-sky-500/80 shrink-0 mt-0.5"
                />
                <div className="bg-white border border-slate-200/90 rounded-2xl rounded-tl-xs p-4 shadow-xs max-w-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">Dokter Pakar AI</span>
                    <span className="text-[10px] text-slate-400">{currentTime}</span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
                    Halo! Saya Dokter Pakar AI. Selamat datang di ruang konsultasi medis klinis. Silakan ceritakan gejala apa yang sedang Anda atau keluarga rasakan hari ini.
                  </p>
                </div>
              </div>

              {/* Rekomendasi Pertanyaan Klinis Cepat (Quick Pills) */}
              <div className="pt-2 pl-10 space-y-2">
                <span className="text-[11px] font-semibold text-slate-500 block">
                  Pilih keluhan umum atau ketik langsung di bawah:
                </span>

                <div className="flex flex-wrap gap-2">
                  {quickSymptoms.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        if (!user) {
                          setIsAuthModalOpen(true);
                          return;
                        }
                        handleSend(q.text);
                      }}
                      className="bg-white hover:bg-sky-50 text-slate-700 hover:text-sky-700 border border-slate-200 hover:border-sky-300 text-xs font-medium px-3.5 py-2 rounded-xl transition shadow-2xs active:scale-95 cursor-pointer text-left flex items-center gap-1.5"
                    >
                      <span>{q.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Stream Pesan Percakapan */}
          {messages.map((msg, idx) => (
            <div key={idx} className="space-y-3">
              
              {/* Pesan Pasien (User) */}
              {msg.role === 'user' && (
                <div className="flex justify-end items-end gap-1.5 pl-10">
                  <div className="bg-sky-600 text-white rounded-2xl rounded-tr-xs px-4 py-2.5 max-w-[85%] sm:max-w-md shadow-xs space-y-1">
                    <p className="text-xs sm:text-sm leading-relaxed whitespace-pre-wrap">
                      {msg.content}
                    </p>
                    <div className="flex items-center justify-end gap-1 text-[10px] text-sky-100">
                      <span>{currentTime}</span>
                      <CheckCheck className="w-3.5 h-3.5 text-sky-200" />
                    </div>
                  </div>
                </div>
              )}

              {/* Pesan Error */}
              {msg.role === 'error' && (
                <div className="flex justify-center">
                  <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-2.5 rounded-xl text-xs max-w-md flex items-center gap-2 shadow-2xs">
                    <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                    <span>{msg.content}</span>
                  </div>
                </div>
              )}

              {/* Pesan Dokter - Tahap 1: Anamnesis Interaktif & Konsultasi */}
              {msg.role === 'assistant' && msg.data?.status !== 'diagnosis' && (
                <div className="flex items-start gap-2.5 pr-6 sm:pr-16">
                  <img
                    src="/doctor-avatar.jpg"
                    alt="Dokter Pakar AI"
                    className="w-8 h-8 rounded-full object-cover ring-2 ring-sky-500/80 shrink-0 mt-0.5"
                  />

                  <div className="bg-white border border-slate-200/90 rounded-2xl rounded-tl-xs p-4 shadow-xs max-w-xl space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-slate-900">Dokter Pakar AI</span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                          msg.data.badge === 'Di Luar Ruang Lingkup'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-sky-50 text-sky-700 border-sky-100'
                        }`}>
                          {msg.data.badge || (msg.data.questions && msg.data.questions.length > 0 ? 'Anamnesis Klinis' : 'Konsultasi Medis')}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400">{currentTime}</span>
                    </div>

                    {/* Penjelasan Empati Dokter */}
                    <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                      {msg.data.message || msg.content}
                    </p>

                    {/* Poin Pertanyaan Dokter */}
                    {msg.data.questions && msg.data.questions.length > 0 && (
                      <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-200/70 space-y-2">
                        <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                          Mohon perjelas beberapa hal berikut:
                        </span>
                        <ul className="space-y-1.5 text-xs text-slate-600">
                          {msg.data.questions.map((q, qIdx) => (
                            <li key={qIdx} className="flex items-start gap-2">
                              <span className="w-4 h-4 rounded-full bg-sky-100 text-sky-700 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                                {qIdx + 1}
                              </span>
                              <span className="leading-relaxed">{q}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Quick Reply Pills */}
                    {msg.data.quick_replies && msg.data.quick_replies.length > 0 && (
                      <div className="pt-1 space-y-1.5">
                        <span className="text-[11px] text-slate-400 font-medium block">
                          {msg.data.questions && msg.data.questions.length > 0
                            ? 'Klik pilihan cepat untuk menjawab dokter:'
                            : 'Pilihan topik konsultasi:'}
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.data.quick_replies.map((reply, rIdx) => (
                            <button
                              key={rIdx}
                              disabled={loading}
                              onClick={() => handleSend(reply)}
                              className="bg-sky-50/90 hover:bg-sky-600 hover:text-white text-sky-700 border border-sky-200/80 text-xs font-medium px-3 py-1.5 rounded-xl transition active:scale-95 cursor-pointer disabled:opacity-50 shadow-2xs"
                            >
                              + {reply}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Pesan Dokter - Tahap 2: Lembar Evaluasi Medis Resmi (Surat Resume Klinis) */}
              {msg.role === 'assistant' && msg.data?.status === 'diagnosis' && (
                <div className="flex items-start gap-2.5 pr-2 sm:pr-8">
                  <img
                    src="/doctor-avatar.jpg"
                    alt="Dokter Pakar AI"
                    className="w-8 h-8 rounded-full object-cover ring-2 ring-sky-500/80 shrink-0 mt-0.5"
                  />

                  {/* KARTU RESEP & RESUME KLINIS RESMI */}
                  <div className="bg-white border border-slate-200/90 rounded-2xl rounded-tl-xs shadow-md max-w-2xl w-full overflow-hidden">
                    
                    {/* Header Kop Surat Medis */}
                    <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-sky-500/20 text-sky-400 rounded-xl border border-sky-400/30">
                          <Stethoscope className="w-5 h-5" />
                        </div>
                        <div>
                          <span className="text-[10px] tracking-wider font-bold text-sky-400 uppercase block">
                            Resume Evaluasi Klinis Medis
                          </span>
                          <h3 className="text-sm sm:text-base font-extrabold tracking-tight">
                            {msg.data.diagnosis}
                          </h3>
                        </div>
                      </div>

                      {/* Badge Triase */}
                      <div>
                        {msg.data.triage_level === 'MERAH' ? (
                          <span className="inline-flex items-center gap-1.5 bg-rose-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg animate-pulse">
                            🔴 TRIASE MERAH (UGD)
                          </span>
                        ) : msg.data.triage_level === 'KUNING' ? (
                          <span className="inline-flex items-center gap-1.5 bg-amber-500 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg">
                            🟡 TRIASE KUNING (FIRST-AID)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 bg-emerald-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg">
                            🟢 TRIASE HIJAU (HARIAN)
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="p-4 sm:p-5 space-y-4 text-xs sm:text-sm">
                      
                      {/* Peringatan Darurat jika TRIASE MERAH */}
                      {msg.data.triage_level === 'MERAH' && (
                        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 space-y-2">
                          <div className="flex items-center gap-2 font-bold text-rose-700">
                            <ShieldAlert className="w-4 h-4 text-rose-600" />
                            <span>PERINGATAN KRITIS: KONDISI MEMBUTUHKAN PENANGANAN UGD SEGERA</span>
                          </div>
                          <p className="text-xs text-rose-800 leading-relaxed">
                            Jangan menunda waktu. Hubungi ambulans atau minta kerabat mengantar ke UGD rumah sakit terdekat sekarang.
                          </p>
                          <a
                            href="tel:119"
                            className="inline-flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-xs transition"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            Panggil Ambulans 119 Sekarang
                          </a>
                        </div>
                      )}

                      {/* Langkah-Langkah Pertolongan Pertama Bernomor */}
                      <div className="space-y-2">
                        <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                          <span>📋</span> Protokol Tindakan & Pertolongan:
                        </h4>

                        <div className="space-y-1.5">
                          {msg.data.first_aid_steps?.map((step, sIdx) => (
                            <div
                              key={sIdx}
                              className="p-2.5 bg-slate-50 border border-slate-200/70 rounded-xl flex items-start gap-2.5 text-xs text-slate-700 leading-relaxed"
                            >
                              <span className="w-5 h-5 rounded-full bg-sky-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                                {sIdx + 1}
                              </span>
                              <span>{step}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Modul Penjelasan Medis (Clinical Rationale) */}
                      <div className="bg-sky-50/70 border border-sky-100 p-3.5 rounded-xl space-y-1 text-slate-700">
                        <span className="text-[11px] font-bold text-sky-900 uppercase tracking-wider block">
                          💡 Penjelasan Alasan Medis:
                        </span>
                        <p className="text-xs leading-relaxed">
                          {msg.data.explanation}
                        </p>
                      </div>

                      {/* Pantangan & Red Flags */}
                      {msg.data.warning && (
                        <div className="p-3 bg-amber-50/90 border border-amber-200 rounded-xl text-amber-950 space-y-1 text-xs">
                          <span className="font-bold text-amber-900 uppercase text-[10px] tracking-wider block">
                            ⚠️ Catatan Klinis & Pantangan:
                          </span>
                          <p className="leading-relaxed">
                            {msg.data.warning}
                          </p>
                        </div>
                      )}

                      {/* Tanda Tangan Dokter & Tombol Aksi */}
                      <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                        <div className="text-[11px] text-slate-400">
                          <span className="font-semibold text-slate-600 block">Dokter Pakar AI</span>
                          <span>Sistem Keputusan Klinis • Terverifikasi</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleCopySummary(msg.data, idx)}
                            className="text-xs text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 font-medium px-3 py-1.5 rounded-xl transition cursor-pointer flex items-center gap-1.5"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            <span>{copiedIdx === idx ? '✓ Tersalin' : 'Salin Resume'}</span>
                          </button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleNewConsultation}
                            className="text-xs border-sky-200 text-sky-700 hover:bg-sky-50 rounded-xl cursor-pointer"
                          >
                            <RotateCcw className="w-3.5 h-3.5 mr-1" />
                            Konsultasi Baru
                          </Button>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              )}

            </div>
          ))}

          {/* Typing Indicator Dokter - Modern Bouncing Dots */}
          {loading && (
            <div className="flex items-center gap-2.5 animate-in fade-in duration-200">
              <img
                src="/doctor-avatar.jpg"
                alt="Dokter Pakar AI"
                className="w-8 h-8 rounded-full object-cover ring-2 ring-sky-500/80 shrink-0 self-end mb-1"
              />
              <div className="bg-white border border-slate-200/90 px-4 py-3 rounded-2xl rounded-tl-xs shadow-2xs flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce"></span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* 4. Bottom Input Bar ala Chat Telemedicine */}
        <div className="p-3 bg-white border-t border-slate-200/80 shrink-0">
          <div className="max-w-2xl mx-auto">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              autoComplete="off"
              className="flex items-center gap-2 bg-slate-100/80 hover:bg-slate-100 focus-within:bg-white border border-slate-200/90 focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/20 p-1 pl-3 rounded-2xl transition"
            >
              <div className="text-slate-400">
                <Stethoscope className="w-4 h-4 text-sky-600" />
              </div>

              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onFocus={() => {
                  if (!user) setIsAuthModalOpen(true);
                }}
                onClick={() => {
                  if (!user) setIsAuthModalOpen(true);
                }}
                placeholder="Ketik keluhan atau jawab pertanyaan dokter..."
                className="flex-1 border-0 shadow-none focus-visible:ring-0 text-xs sm:text-sm bg-transparent px-1 placeholder:text-slate-400 h-8"
                disabled={loading}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
              />

              <Button
                type="submit"
                disabled={loading || (user && !input.trim())}
                className="bg-sky-600 hover:bg-sky-700 text-white rounded-xl h-8 w-8 p-0 flex items-center justify-center cursor-pointer shadow-xs active:scale-95 transition shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
              </Button>
            </form>
          </div>
        </div>

      </div>



      {/* Modal Autentikasi Supabase */}
      {isAuthModalOpen && (
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onAuthSuccess={(u) => setUser(u)}
        />
      )}
    </div>
  );
}