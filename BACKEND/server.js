// BACKEND/server.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { SYSTEM_PROMPT } from './systemPrompt.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Inisialisasi Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// Daftar model Gemini dengan mekanisme fallback otomatis jika terjadi high demand / model tidak tersedia
const CANDIDATE_MODELS = [
  'gemini-3.5-flash',
  'gemini-3.5-flash-lite',
  'gemini-flash-lite-latest',
  'gemini-3.8-flash'
];

// Endpoint Konsultasi AI
app.post('/api/chat', async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Pesan gejala tidak boleh kosong' });
    }

    // Susun riwayat percakapan untuk konteks multi-turn Gemini
    const formattedContents = [];
    if (Array.isArray(history) && history.length > 0) {
      for (const item of history) {
        if (item.role === 'user' && item.content) {
          formattedContents.push({
            role: 'user',
            parts: [{ text: item.content }]
          });
        } else if (item.role === 'assistant' && item.data) {
          formattedContents.push({
            role: 'model',
            parts: [{ text: typeof item.data === 'string' ? item.data : JSON.stringify(item.data) }]
          });
        }
      }
    }

    // Tambahkan pesan terkini dari pengguna
    formattedContents.push({
      role: 'user',
      parts: [{ text: message }]
    });

    // Hitung jumlah giliran percakapan pengguna (turn count)
    const userTurnCount = (Array.isArray(history) ? history.filter(item => item.role === 'user').length : 0) + 1;

    // Tambahkan instruksi dinamis berbasis giliran agar anamnesis berjalan 5-7 kali percakapan
    const dynamicSystemInstruction = `${SYSTEM_PROMPT}

================================================================================
INFORMASI PERCAKAPAN SAAT INI (REAL-TIME CONTEXT):
- Giliran (turn) pengguna saat ini: KE-${userTurnCount}.
${userTurnCount < 5 
  ? `- INSTRUKSI WAJIB: Percakapan saat ini BARU giliran ke-${userTurnCount} (belum mencapai minimal 5-7 giliran). KECUALI kondisi mengancam nyawa (TRIASE MERAH), kamu DILARANG KERAS mengeluarkan status "diagnosis"! Wajib gunakan status "anamnesis" untuk menanyakan 1-2 pertanyaan terarah berikutnya layaknya dokter sungguhan yang menyimak pasien secara sabar dan mendalam.` 
  : `- Percakapan sudah mencapai giliran ke-${userTurnCount} (>= 5). Jika seluruh informasi gejala klinis sudah terkumpul secara komprehensif, kamu DAPAT menyimpulkan dalam status "diagnosis". Jika masih ada yang perlu dipastikan, kamu dapat melanjutkan anamnesis hingga giliran ke-7.`
}
================================================================================
`;

    let responseText = null;
    let lastError = null;

    for (const model of CANDIDATE_MODELS) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: formattedContents,
          config: {
            systemInstruction: dynamicSystemInstruction,
            responseMimeType: 'application/json',
          }
        });

        if (response?.text) {
          responseText = response.text;
          break;
        }
      } catch (err) {
        console.warn(`Model ${model} gagal atau sibuk, mencoba model cadangan...`, err.message || err);
        lastError = err;
      }
    }

    if (!responseText) {
      throw lastError || new Error('Semua model AI sedang sibuk atau tidak tersedia.');
    }

    // Bersihkan pembungkus markdown ```json jika ada
    const cleanedText = responseText.replace(/```json\n?|\n?```/g, '').trim();
    const aiResult = JSON.parse(cleanedText);

    // Safeguard Server-side: Jika percakapan belum mencapai minimal 5 giliran dan bukan Triase Merah darurat,
    // cegah diagnosis prematur
    if (userTurnCount < 5 && aiResult.status === 'diagnosis' && aiResult.triage_level !== 'MERAH') {
      aiResult.status = 'anamnesis';
      aiResult.badge = 'Anamnesis Klinis';
      aiResult.message = `Terima kasih atas rincian keluhan Anda. Terkait ${aiResult.diagnosis || 'gejala Anda'}, sebagai dokter saya perlu menggali beberapa aspek klinis tambahan agar analisisnya benar-benar tepat dan menyeluruh.`;
      aiResult.questions = [
        'Apakah gejala ini semakin terasa berat pada waktu tertentu (misalnya pagi, malam, atau saat beraktivitas)?',
        'Apakah Anda sudah sempat meminum obat tertentu atau melakukan penanganan awal untuk meredakannya?'
      ];
      aiResult.quick_replies = [
        'Makin berat di malam hari',
        'Makin berat saat beraktivitas',
        'Sudah minum obat pereda nyeri',
        'Belum minum obat apapun'
      ];
    }

    return res.json({ success: true, data: aiResult });

  } catch (error) {
    console.error('Error Gemini API:', error);
    return res.status(500).json({ 
      error: 'Gagal memproses diagnosis', 
      details: error.message 
    });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Backend Sistem Pakar berjalan di http://localhost:${PORT}`);
});