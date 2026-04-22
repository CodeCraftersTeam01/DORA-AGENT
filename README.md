<div align="center">

# 🤖 DORA AGENT
### **Profesional WhatsApp AI Bot with Modern Admin Dashboard**

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docker Support](https://img.shields.io/badge/Docker-Supported-blue.svg)](https://www.docker.com/)
[![AI Powered](https://img.shields.io/badge/AI-Gemini%20%26%20OpenRouter-blueviolet.svg)](https://aistudio.google.com/)

---

DORA Agent adalah asisten virtual WhatsApp generasi terbaru yang dirancang untuk kebutuhan profesional. Menggabungkan kecerdasan buatan dari **Google Gemini** dan **OpenRouter**, bot ini mampu memberikan respon yang alami, cerdas, dan kontekstual.

[Fitur Utama](#-fitur-unggulan) • [Instalasi](#-cara-instalasi--menjalankan-bot) • [Docker](#metode-2-mode-docker-container-disarankan-untuk-server-cloud) • [Keamanan](#perlindungan-data-aman-keamanan)

</div>

---

## 🌟 Fitur Unggulan

- **🖥️ Dashboard Admin Modern:** Kelola seluruh pengaturan bot melalui interface web yang elegan dan responsif.
  <img width="1365" height="659" alt="DORA Dashboard Preview" src="https://github.com/user-attachments/assets/a63addc3-0ef1-4388-9fcd-d05358e0eec2" style="border-radius: 10px; margin: 10px 0; box-shadow: 0 4px 15px rgba(0,0,0,0.3);" />
- **⚙️ Konfigurasi Real-time:** Perbarui API Key, Mode AI, dan Prefix secara instan tanpa perlu restart aplikasi.
- **📊 Knowledge Base (Excel):** Berikan bot "pengetahuan" khusus dengan mengunggah file Excel secara langsung.
- **🎙️ Multimodal Support:** Bot memahami teks, gambar, dokumen, hingga transkripsi pesan suara (*Voice Notes*).
- **🔒 Keamanan Berlapis:** Sistem autentikasi admin yang terisolasi dan penyimpanan sesi WhatsApp yang aman.

---

## 💻 Cara Instalasi & Menjalankan Bot

Pilih salah satu metode di bawah ini yang paling sesuai dengan kebutuhan server Anda.

### Metode 1: Mode Node.js Lokal (Penggunaan Standar)

#### Persyaratan
* **Node.js** v18 atau lebih tinggi.
* **NPM** (sudah termasuk dalam Node.js).

#### Langkah-langkah
1. Clone repositori ini atau download source codenya.
2. Buka terminal di folder project dan jalankan:
   ```bash
   npm install --no-audit --no-fund --legacy-peer-deps
   ```
3. Jalankan aplikasi:
   ```bash
   npm start
   ```
4. Buka browser dan akses **`http://localhost:3000`**.
5. Pada kunjungan pertama, buat akun admin Anda. Hubungkan WhatsApp dengan melakukan scan QR di dashboard.

---

### Metode 2: Mode Docker Container (Disarankan untuk Server Cloud)

Docker memastikan bot berjalan dalam lingkungan yang stabil dan terisolasi.

#### Langkah-langkah
1. Pastikan Docker dan Docker Compose sudah terinstal.
2. Buat file `.env` kosong (diperlukan untuk inisialisasi volume):
   - **Windows (CMD):** `type nul > .env`
   - **Mac/Linux:** `touch .env`
3. Bangun dan jalankan kontainer:
   ```bash
   docker-compose up -d --build
   ```
4. Akses dashboard di **`http://localhost:3000`**.
5. Pantau aktivitas bot via log:
   ```bash
   docker-compose logs -f
   ```

*(Untuk mematikan bot: `docker-compose down`)*

---

## 🛡️ Perlindungan Data & Keamanan

1. **Letak Data Autentikasi:** 
   Kredensial admin disimpan di luar folder project (`os.homedir()`) untuk mencegah kebocoran saat melakukan update atau push kode ke cloud.
2. **Persistence Data:** 
   Sesi WhatsApp (`auth_info`) dan data unggahan tetap tersimpan meskipun kontainer Docker dihapus atau aplikasi direstart. Anda tidak perlu scan QR berulang kali.

---

<div align="center">

**Dibuat dengan ❤️ oleh [Lanvry](https://github.com/Lanvry)**

</div>
