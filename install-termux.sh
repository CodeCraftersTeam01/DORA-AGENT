#!/bin/bash

echo "=========================================="
echo "      DORA AGENT — Termux Installer       "
echo "=========================================="

# Update package list
echo "🔄 Mengupdate package..."
pkg update -y && pkg upgrade -y

# Install dependencies
echo "📦 Menginstal Node.js, FFmpeg, dan Libwebp..."
pkg install nodejs-lts ffmpeg libwebp git -y

# Install project dependencies
echo "📥 Menginstal dependensi Node.js..."
npm install

echo "=========================================="
echo "✅ Instalasi Selesai!"
echo "🚀 Jalankan bot dengan perintah: node index.js"
echo "=========================================="
