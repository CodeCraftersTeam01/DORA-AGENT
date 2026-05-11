# 🤖 DORA AGENT — WhatsApp AI Chatbot

DORA Agent adalah chatbot WhatsApp berbasis AI yang canggih, mendukung integrasi Gemini AI, OpenRouter, dan fitur Dashboard Admin yang modern. Bot ini dirancang untuk berjalan lancar di berbagai platform seperti Windows, Linux, macOS, dan Termux.

---

## 🚀 Fitur Unggulan

- **Multi-Modal AI**: Mendukung Teks, Gambar, dan Dokumen (via Gemini).
- **Voice Transcription**: Mengubah Voice Note menjadi teks secara otomatis.
- **Modern Dashboard**: Kelola pengaturan, lihat log live, dan chat langsung dari browser.
- **Live Agent Mode**: Ambil alih percakapan kapan saja untuk menjawab manual.
- **Permanent Activation**: Lisensi aktif selamanya.
- **Cross-Platform**: Support Docker, PM2, dan instalasi manual.

---

## 🛠️ Instalasi

### 1. Windows / macOS / Linux (Manual)
1. Pastikan sudah menginstal [Node.js](https://nodejs.org/) (versi 18 ke atas).
2. Clone atau download folder project ini.
3. Buka terminal/CMD di folder project, lalu jalankan:
   ```bash
   npm install
   ```
4. Jalankan bot:
   ```bash
   node index.js
   ```
5. Buka dashboard di browser: `http://localhost:3000`

### 2. Menggunakan Docker (Rekomendasi VPS/Server)
1. Pastikan Docker & Docker Compose sudah terinstal.
2. Jalankan perintah:
   ```bash
   docker-compose up -d
   ```
3. Bot akan berjalan otomatis di background.

### 3. Termux (Android)
1. Buka Termux, jalankan script instalasi otomatis:
   ```bash
   pkg update && pkg upgrade
   pkg install git nodejs-lts ffmpeg libwebp -y
   git clone <URL_REPO_ANDA>
   cd DORA-AGENT
   npm install
   node index.js
   ```

---

## ⚙️ Konfigurasi
Semua konfigurasi sekarang dilakukan melalui **Dashboard Admin**.
1. Jalankan bot.
2. Akses `http://localhost:3000`.
3. Masuk ke menu **Pengaturan**.
4. Isi API Keys (Gemini/OpenRouter) dan simpan. 
   *Data tersimpan aman di `data/config.json`.*

---

## 📱 Perintah Bot
- `/reset` : Menghapus riwayat percakapan dengan AI.
- `/info` : Melihat status bot dan model AI yang digunakan.

---

## 🛡️ Lisensi & Keamanan
- File `.env` hanya digunakan untuk pengaturan sistem (Port).
- Semua data sensitif tersimpan di folder `data/` yang otomatis diabaikan oleh Git untuk mencegah kebocoran kunci API.

---

**Dibuat dengan ❤️ oleh Antigravity untuk DORA AGENT Team.**
