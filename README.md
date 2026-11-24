# 🤖 DORA AGENT — Monorepo (Core, Desktop Launcher & Server Kit)

DORA Agent adalah chatbot WhatsApp berbasis AI (Gemini & OpenRouter) lengkap dengan Dashboard Admin modern, dikemas dalam struktur **monorepo** untuk berjalan di **laptop (Windows, macOS, Linux)** maupun **server/VPS**.

---

## 📦 Struktur Monorepo

```text
├── packages/
│   ├── core/          # Engine WA Bot, AI Service, Security & Admin Dashboard
│   ├── launcher/      # Aplikasi Desktop Tauri v2 lintas OS (Splash Screen + System Tray)
│   └── server/        # Kit deployment VPS: Dockerfile, docker-compose, systemd, install.sh
├── scripts/
│   ├── build.js       # Build obfuscated -> dist/ + release/dora-agent-core.tar.gz (.sha256)
│   └── deploy-prod.js # Deploy ke repo publik + rilis GitHub Releases (--release)
└── .github/workflows/
    └── release-launcher.yml  # CI otomatis build .exe/.msi, .dmg, .AppImage/.deb + core bundle
```

---

## 💻 Menjalankan di Laptop (Pengguna Akhir — Tauri Desktop Launcher)

1. Unduh installer sesuai OS dari halaman **GitHub Releases** (`.exe`/`.msi` Windows, `.dmg` macOS, `.AppImage`/`.deb` Linux).
2. Klik dua kali aplikasi **DORA Agent**:
   - Launcher otomatis mengecek & mengunduh **Portable Node.js v20** (verifikasi SHA-256 resmi `nodejs.org`).
   - Mengunduh bundle **DORA Agent Core** terbaru dari GitHub Releases (verifikasi SHA-256).
   - Memasang dependensi production secara otomatis (di-cache agar klik berikutnya instan).
   - Menjalankan bot di background (ikon **System Tray**) dan membuka **http://127.0.0.1:3000**.
3. Data pengguna (`data/` & `auth_info/`) disimpan terpisah via `DORA_DATA_ROOT` sehingga aman saat update core.

---

## 🛠️ Development Lokal (Monorepo)

```bash
# 1. Install semua workspace
npm install --legacy-peer-deps

# 2. Jalankan bot & dashboard di lokal (127.0.0.1:3000)
npm start

# 3. Jalankan suite pengujian keamanan
npm test

# 4. Build obfuscated core + release archive (.tar.gz & .sha256)
npm run build

# 5. Jalankan / Build Tauri Desktop Launcher (membutuhkan Rust toolchain)
npm run launcher:dev
npm run launcher:build
```

---

## 🖥️ Deployment di Server / VPS (Linux)

### Opsi 1 — Docker (Rekomendasi)
```bash
docker compose up -d
```

### Opsi 2 — Bare-Metal Linux (1-Line Installer + systemd)
```bash
curl -fsSL https://raw.githubusercontent.com/CodeCraftersTeam01/DORA-AGENT/main/install.sh | sudo bash
```
Service akan berjalan sebagai user non-root `dora` di `127.0.0.1:3000` (pasang Nginx/Caddy untuk HTTPS).

---

## 🚀 Publikasi Production & Release

```bash
# Push obfuscated dist/ ke repo publik
npm run deploy:prod

# Push dist/ + upload bundle .tar.gz & .sha256 ke GitHub Releases
npm run deploy:prod -- --release
```

Untuk membangun binary launcher lintas OS (Windows, macOS arm64/x64, Linux) secara otomatis, push tag versi baru (`git tag v1.0.0 && git push origin v1.0.0`).
