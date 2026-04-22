// ================================================
//  DORA AGENT — Dashboard Frontend JS
// ================================================

const API = '';  // same origin

// ── State ──────────────────────────────────────
let currentPromptFile = null;
let promptFiles = [];
let promptDirty = false;
let ws = null;
let authToken = localStorage.getItem('dora_auth_token') || '';

// ── Custom Fetch (Attach Auth) ─────────────────
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  let [resource, config] = args;
  config = config || {};
  config.headers = config.headers || {};
  if (authToken && !config.headers['Authorization'] && String(resource).startsWith('/')) {
    config.headers['Authorization'] = `Bearer ${authToken}`;
  }
  const res = await originalFetch(resource, config);
  if (res.status === 401 && !String(resource).includes('/api/auth/')) {
    localStorage.removeItem('dora_auth_token');
    alert("Sesi Anda kedaluwarsa atau akses ditolak. Silakan muat ulang halaman.");
    location.reload();
  }
  return res;
};

// ── Auth Flow ──────────────────────────────────
async function requireAuth() {
  try {
    const res = await fetch('/api/auth/status');
    const { registered } = await res.json();

    if (!registered) {
      alert("Selamat datang! Anda harus mendaftar akun admin terlebih dahulu untuk mengamankan dashboard ini.");
      const user = prompt("Daftar Akun:\nMasukkan Username baru Anda:");
      if (!user) return false;
      const pass = prompt("Daftar Akun:\nMasukkan Password baru Anda:");
      if (!pass) return false;

      const regRes = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user, password: pass })
      });

      if (regRes.ok) {
        alert("Pendaftaran berhasil! Menyimpan sesi...");
        authToken = btoa(user + ':' + pass);
        localStorage.setItem('dora_auth_token', authToken);
        return true;
      } else {
        const err = await regRes.json();
        alert("Gagal mendaftar: " + err.error);
        return false;
      }
    } else {
      if (!authToken) {
        const user = prompt("Login Dashboard:\nMasukkan Username Anda:");
        if (!user) return false;
        const pass = prompt("Login Dashboard:\nMasukkan Password Anda:");
        if (!pass) return false;

        const tempToken = btoa(user + ':' + pass);
        const checkRes = await fetch('/api/auth/verify', {
          headers: { 'Authorization': `Bearer ${tempToken}` }
        });

        if (checkRes.ok) {
          authToken = tempToken;
          localStorage.setItem('dora_auth_token', authToken);
          return true;
        } else {
          alert("Akses Ditolak: Username atau Password salah!");
          return false;
        }
      } else {
        const checkRes = await fetch('/api/auth/verify');
        if (!checkRes.ok) {
          localStorage.removeItem('dora_auth_token');
          authToken = '';
          return await requireAuth();
        }
        return true;
      }
    }
  } catch (e) {
    alert("Koneksi ke server bermasalah saat login. Mematikan server atau offline.");
    return false;
  }
}

// ── Init ───────────────────────────────────────
document.addEventListener('DOMContentLoaded', async () => {
  document.body.style.display = 'none'; // Sembunyikan UI selama cek auth

  const authOk = await requireAuth();
  if (!authOk) {
    document.body.innerHTML = '<div style="display:flex; height:100vh; align-items:center; justify-content:center; flex-direction:column; background:#0f0f13; color:#e0e0e0; font-family:Inter,sans-serif;"><h1>Akses Ditolak</h1><p>Otentikasi dibatalkan atau gagal.</p><button onclick="location.reload()" style="margin-top:20px; padding:10px 20px; background:#fff; color:#000; border:none; border-radius:5px; cursor:pointer; font-weight:bold;">Refresh</button></div>';
    document.body.style.display = 'block';
    return;
  }
  
  document.body.style.display = 'block'; // Tampilkan dashboard

  initNavigation();
  initSidebar();
  initTheme();
  initClock();
  connectWebSocket();
  loadStatus();
  loadPromptFiles();
  loadExcelFiles();
  loadConfig();
  loadBranches();
  initExcelUpload();
  initPromptActions();
  initConfigActions();
  initLogActions();
  initModal();
  initApiKeysActions();
  initBranchesActions();
  initRestartBot();
  initUpdater();
});

// ================================================
//  UPDATER (Git Auto Update)
// ================================================
function initUpdater() {
  const btnUpdate = document.getElementById('btnUpdateBot');
  if (!btnUpdate) return;

  // Cek update saat dashboard dibuka
  setTimeout(checkUpdates, 2000);

  btnUpdate.addEventListener('click', async () => {
    if (!confirm('Pembaruan tersedia! Apakah Anda ingin mengunduh dan menerapkan pembaruan sekarang?\n\nCatatan: Bot akan restart otomatis.')) return;
    
    showToast('Sedang mengunduh pembaruan...', 'info');
    const overlay = document.getElementById('restartModalOverlay');
    const statusText = document.getElementById('restartStatusText');
    
    if (overlay) {
      overlay.style.display = 'flex';
      statusText.textContent = 'Sedang mengunduh pembaruan dari GitHub...';
    }

    try {
      const res = await fetch('/api/update/execute', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        statusText.textContent = 'Pembaruan berhasil! Sedang memulai ulang bot...';
        btnUpdate.style.display = 'none';
      } else {
        if (overlay) overlay.style.display = 'none';
        showToast('Gagal update: ' + (data.error || 'Terjadi kesalahan'), 'error');
      }
    } catch (e) {
      if (overlay) overlay.style.display = 'none';
      showToast('Gagal menghubungi server.', 'error');
    }
  });
}

async function checkUpdates() {
  const btnUpdate = document.getElementById('btnUpdateBot');
  if (!btnUpdate) return;

  try {
    const res = await fetch('/api/update/check');
    const data = await res.json();
    if (data.updateAvailable) {
      btnUpdate.style.display = 'inline-flex';
      btnUpdate.title = `Pembaruan Tersedia! (${data.currentVersion} -> ${data.latestVersion})`;
      showToast('Tersedia pembaruan versi baru! Klik ikon awan di pojok kanan atas.', 'info');
    } else {
      btnUpdate.style.display = 'none';
    }
  } catch (e) {
    console.warn('Update check failed');
  }
}

// ================================================
//  NAVIGATION
// ================================================
function initNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.preventDefault();
      const section = item.dataset.section;
      navigate(section);
      // Close sidebar on mobile
      if (window.innerWidth <= 768) {
        document.getElementById('sidebar').classList.remove('open');
      }
    });
  });
}

function navigate(sectionId) {
  // Update nav active state
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  const navEl = document.getElementById(`nav-${sectionId}`);
  if (navEl) navEl.classList.add('active');

  // Update sections
  document.querySelectorAll('.section').forEach(el => el.classList.remove('active'));
  const sectionEl = document.getElementById(`section-${sectionId}`);
  if (sectionEl) sectionEl.classList.add('active');

  // Update topbar title
  const titles = {
    status: 'Status Bot',
    qr: 'QR Code WhatsApp',
    prompt: 'Sistem Prompt / Instruksi AI',
    excel: 'Data Excel',
    branches: 'Alamat Cabang / Toko',
    apikey: 'Manajemen API Key',
    config: 'Konfigurasi'
  };
  document.getElementById('pageTitle').textContent = titles[sectionId] || '';
}

// ================================================
//  SIDEBAR TOGGLE
// ================================================
function initSidebar() {
  const menuBtn = document.getElementById('menuBtn');
  const sidebarToggle = document.getElementById('sidebarToggle');
  const sidebar = document.getElementById('sidebar');

  menuBtn.addEventListener('click', () => {
    sidebar.classList.toggle('open');
  });

  sidebarToggle.addEventListener('click', () => {
    sidebar.classList.remove('open');
  });

  // Close on overlay click
  document.addEventListener('click', (e) => {
    if (window.innerWidth <= 768 && !sidebar.contains(e.target) && !menuBtn.contains(e.target)) {
      sidebar.classList.remove('open');
    }
  });
}

// ================================================
//  THEME TOGGLE
// ================================================
function initTheme() {
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  if (!themeToggleBtn) return;
  const icon = themeToggleBtn.querySelector('i');
  
  const savedTheme = localStorage.getItem('dora_theme');
  if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.body.classList.add('dark-theme');
    icon.className = 'fa-solid fa-sun';
  } else {
    document.body.classList.remove('dark-theme');
    icon.className = 'fa-solid fa-moon';
  }

  themeToggleBtn.addEventListener('click', () => {
    document.body.classList.toggle('dark-theme');
    if (document.body.classList.contains('dark-theme')) {
      icon.className = 'fa-solid fa-sun';
      localStorage.setItem('dora_theme', 'dark');
    } else {
      icon.className = 'fa-solid fa-moon';
      localStorage.setItem('dora_theme', 'light');
    }
  });
}

// ================================================
//  CLOCK
// ================================================
function initClock() {
  function update() {
    const now = new Date();
    document.getElementById('timeDisplay').textContent =
      now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  }
  update();
  setInterval(update, 1000);
}

// ================================================
//  WEBSOCKET (Live Log & QR)
// ================================================
function connectWebSocket() {
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  ws = new WebSocket(`${proto}://${location.host}/ws?token=${encodeURIComponent(authToken)}`);

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      handleWsMessage(data);
    } catch (_) {}
  };

  ws.onclose = () => {
    setStatusMini('disconnected', 'Tidak terkoneksi');
    setTimeout(connectWebSocket, 3000);
  };

  ws.onerror = () => {
    setStatusMini('disconnected', 'Kesalahan koneksi');
  };
}

function handleWsMessage(data) {
  switch (data.type) {
    case 'log':
      appendLog(data.message, data.level);
      break;
    case 'qr':
      showQRImage(data.qrDataUrl);
      setQRState('Scan kode ini dengan WhatsApp kamu!');
      break;
    case 'connected':
      showQRConnected();
      setStatusMini('connected', 'WhatsApp Terhubung');
      updateCard('waConnection', '✅ Terhubung');
      break;
    case 'disconnected':
      showQRDisconnected();
      setStatusMini('disconnected', 'WhatsApp Terputus');
      updateCard('waConnection', '❌ Terputus');
      break;
    case 'connecting':
      setStatusMini('connecting', 'Menghubungkan...');
      updateCard('waConnection', '🔄 Menghubungkan...');
      break;
    case 'status':
      applyStatusData(data);
      break;
  }
}

// ================================================
//  LOG BOX
// ================================================
const MAX_LOG_LINES = 200;
let logLines = 0;

function appendLog(message, level = 'info') {
  const logContent = document.getElementById('logContent');
  const empty = logContent.querySelector('.log-empty');
  if (empty) empty.remove();

  // Strip emojis from message
  const cleanedMessage = message.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '').trim();

  const line = document.createElement('div');
  line.className = 'log-line';
  if (level === 'error') line.classList.add('error');
  else if (level === 'warn') line.classList.add('warn');
  else if (level === 'success') line.classList.add('success');

  const time = new Date().toLocaleTimeString('id-ID');
  line.textContent = `[${time}] ${cleanedMessage}`;
  logContent.appendChild(line);
  logLines++;

  // Trim old lines
  if (logLines > MAX_LOG_LINES) {
    logContent.firstChild?.remove();
    logLines--;
  }

  // Scroll to bottom
  logContent.scrollTop = logContent.scrollHeight;
}

function initLogActions() {
  document.getElementById('clearLogBtn').addEventListener('click', async () => {
    try { await fetch('/api/logs/clear', { method: 'DELETE' }); } catch (e) {}
    const logContent = document.getElementById('logContent');
    logContent.innerHTML = '<div class="log-empty">Konsol terminal dan layar dibersihkan.</div>';
    logLines = 0;
  });
}

// ================================================
//  STATUS
// ================================================
async function loadStatus() {
  try {
    const res = await fetch('/api/status');
    const data = await res.json();
    applyStatusData(data);
  } catch (e) {
    console.warn('Status load failed:', e);
  }
}

function applyStatusData(data) {
  if (data.waStatus !== undefined) {
    // Sembunyikan modal restart jika sudah connected
    if (data.waStatus === 'connected') {
      const overlay = document.getElementById('restartModalOverlay');
      if (overlay && overlay.style.display === 'flex') {
        overlay.style.display = 'none';
        showToast('Bot berhasil dimulai ulang!', 'success');
        if (window.restartTimeout) clearTimeout(window.restartTimeout);
      }
    }

    const statusMap = {
      connected: '✅ Terhubung',
      disconnected: '❌ Terputus',
      connecting: '🔄 Menghubungkan...',
      qr_ready: '📱 Menunggu QR Scan',
    };
    updateCard('waConnection', statusMap[data.waStatus] || data.waStatus);

    const miniMap = { connected: 'WhatsApp Terhubung', disconnected: 'WhatsApp Terputus', connecting: 'Menghubungkan...', qr_ready: 'Menunggu Scan QR' };
    setStatusMini(data.waStatus === 'connected' ? 'connected' : data.waStatus === 'disconnected' ? 'disconnected' : 'connecting', miniMap[data.waStatus] || '');
  }
  if (data.aiMode) updateCard('aiMode', data.aiMode.toUpperCase());
  if (data.excelCount !== undefined) updateCard('excelCount', `${data.excelCount} file`);
  if (data.voiceMode) updateCard('voiceMode', data.voiceMode);

  // Update QR Card UI based on status
  if (data.waStatus === 'connected') {
    showQRConnected();
  } else if (data.waStatus === 'qr_ready') {
    // If we have QR URL in status, we could show it, but usually it comes via WS
  } else {
    showQRDisconnected();
  }
}

function updateCard(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function setStatusMini(state, text) {
  const dot = document.getElementById('statusDot');
  const textEl = document.getElementById('statusText');
  dot.className = `status-dot ${state}`;
  textEl.textContent = text;
}

// ================================================
//  QR CODE
// ================================================
function showQRImage(dataUrl) {
  document.getElementById('qrPlaceholder').style.display = 'none';
  document.getElementById('qrConnectedWrapper').style.display = 'none';
  const wrapper = document.getElementById('qrCodeWrapper');
  wrapper.style.display = 'flex';
  document.getElementById('qrImage').src = dataUrl;
}

function showQRConnected() {
  document.getElementById('qrCodeWrapper').style.display = 'none';
  document.getElementById('qrPlaceholder').style.display = 'none';
  document.getElementById('qrConnectedWrapper').style.display = 'block';
  setQRState('Terhubung');
}

function showQRDisconnected() {
  document.getElementById('qrCodeWrapper').style.display = 'none';
  document.getElementById('qrConnectedWrapper').style.display = 'none';
  const placeholder = document.getElementById('qrPlaceholder');
  placeholder.style.display = 'flex';
  placeholder.querySelector('.qr-icon-fa').innerHTML = '<i class="fa-solid fa-mobile-screen-button"></i>';
  placeholder.querySelector('.qr-help-text').textContent = 'QR Code akan muncul di sini saat bot belum terhubung ke WhatsApp.';
  setQRState('Menunggu QR...');
}

function setQRState(text) {
  const el = document.getElementById('qrState');
  if (el) el.textContent = text;
}

// ================================================
//  SISTEM PROMPT
// ================================================
async function loadPromptFiles() {
  try {
    const res = await fetch('/api/prompt/files');
    const data = await res.json();
    promptFiles = data.files || [];
    renderPromptTabs();
    if (promptFiles.length > 0) {
      selectPromptFile(promptFiles[0]);
    }
  } catch (e) {
    showToast('Gagal memuat file prompt', 'error');
  }
}

function renderPromptTabs() {
  const container = document.getElementById('promptFileTabs');
  container.innerHTML = '';
  promptFiles.forEach(f => {
    const tab = document.createElement('button');
    tab.className = `file-tab${f === currentPromptFile ? ' active' : ''}`;
    tab.textContent = f;
    tab.addEventListener('click', () => {
      if (promptDirty) {
        if (!confirm('Ada perubahan yang belum disimpan. Pindah file?')) return;
      }
      selectPromptFile(f);
    });
    container.appendChild(tab);
  });
}

async function selectPromptFile(filename) {
  currentPromptFile = filename;
  document.getElementById('currentPromptFileName').textContent = filename;
  promptDirty = false;
  renderPromptTabs();
  try {
    const res = await fetch(`/api/prompt/content?file=${encodeURIComponent(filename)}`);
    const data = await res.json();
    const ta = document.getElementById('promptTextarea');
    ta.value = data.content || '';
    updateCharCount(ta.value);
  } catch (e) {
    showToast('Gagal membaca file', 'error');
  }
}

function initPromptActions() {
  const ta = document.getElementById('promptTextarea');

  ta.addEventListener('input', () => {
    updateCharCount(ta.value);
    promptDirty = true;
  });

  document.getElementById('savePromptBtn').addEventListener('click', savePrompt);

  document.getElementById('addPromptFileBtn').addEventListener('click', () => {
    openModal();
  });

  document.getElementById('deletePromptFileBtn').addEventListener('click', async () => {
    if (!currentPromptFile) return;
    if (!confirm(`Hapus file "${currentPromptFile}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    try {
      const res = await fetch(`/api/prompt/delete?file=${encodeURIComponent(currentPromptFile)}`, { method: 'DELETE' });
      if (res.ok) {
        showToast(`File "${currentPromptFile}" dihapus`, 'success');
        currentPromptFile = null;
        loadPromptFiles();
      } else {
        showToast('Gagal menghapus file', 'error');
      }
    } catch (e) {
      showToast('Gagal menghapus file', 'error');
    }
  });
}

async function savePrompt() {
  if (!currentPromptFile) {
    showToast('Pilih atau buat file prompt terlebih dahulu', 'error');
    return;
  }
  const content = document.getElementById('promptTextarea').value;
  try {
    const res = await fetch('/api/prompt/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file: currentPromptFile, content }),
    });
    if (res.ok) {
      promptDirty = false;
      showToast('Instruksi AI berhasil disimpan! ✅', 'success');
    } else {
      showToast('Gagal menyimpan', 'error');
    }
  } catch (e) {
    showToast('Gagal menyimpan', 'error');
  }
}

function updateCharCount(text) {
  document.getElementById('charCount').textContent = `${text.length} karakter`;
}

// ================================================
//  EXCEL
// ================================================
async function loadExcelFiles() {
  try {
    const res = await fetch('/api/excel/files');
    const data = await res.json();
    renderExcelList(data.files || []);
    updateCard('excelCount', `${(data.files || []).length} file`);
  } catch (e) {
    showToast('Gagal memuat file Excel', 'error');
  }
}

function renderExcelList(files) {
  const container = document.getElementById('excelFileList');
  if (files.length === 0) {
    container.innerHTML = '<div class="file-empty">Belum ada file Excel yang diupload.</div>';
    return;
  }
  container.innerHTML = '';
  files.forEach(f => {
    const item = document.createElement('div');
    item.className = 'file-item';
    item.innerHTML = `
      <div class="file-item-left">
        <div class="file-item-icon"><i class="fa-solid fa-file-excel"></i></div>
        <div>
          <div class="file-item-name">${f.name}</div>
          <div class="file-item-size">${formatBytes(f.size)}</div>
        </div>
      </div>
      <div class="file-item-actions">
        <button class="btn btn-danger btn-xs" data-file="${f.name}">
          <i class="fa-solid fa-trash"></i> Hapus
        </button>
      </div>
    `;
    item.querySelector('[data-file]').addEventListener('click', () => deleteExcelFile(f.name));
    container.appendChild(item);
  });
}

function initExcelUpload() {
  const zone = document.getElementById('uploadZone');
  const input = document.getElementById('excelFileInput');
  const browseBtn = document.getElementById('browseExcelBtn');
  const refreshBtn = document.getElementById('refreshExcelBtn');

  browseBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    input.click();
  });

  zone.addEventListener('click', () => input.click());

  input.addEventListener('change', () => {
    if (input.files[0]) uploadExcel(input.files[0]);
    input.value = '';
  });

  zone.addEventListener('dragover', (e) => {
    e.preventDefault();
    zone.classList.add('dragover');
  });

  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));

  zone.addEventListener('drop', (e) => {
    e.preventDefault();
    zone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      uploadExcel(file);
    } else {
      showToast('Hanya file .xlsx dan .xls yang diterima', 'error');
    }
  });

  refreshBtn.addEventListener('click', loadExcelFiles);
}

async function uploadExcel(file) {
  const progressDiv = document.getElementById('uploadProgress');
  const progressBar = document.getElementById('progressBar');
  const progressText = document.getElementById('progressText');

  progressDiv.style.display = 'block';
  progressText.textContent = `Mengupload ${file.name}...`;
  progressBar.style.width = '0%';

  const formData = new FormData();
  formData.append('file', file);

  try {
    // Simulate progress
    let fakeProgress = 0;
    const interval = setInterval(() => {
      fakeProgress = Math.min(fakeProgress + 20, 85);
      progressBar.style.width = `${fakeProgress}%`;
    }, 200);

    const res = await fetch('/api/excel/upload', { method: 'POST', body: formData });

    clearInterval(interval);
    progressBar.style.width = '100%';

    if (res.ok) {
      progressText.textContent = 'Upload berhasil!';
      showToast(`${file.name} berhasil diupload ✅`, 'success');
      setTimeout(() => {
        progressDiv.style.display = 'none';
        progressBar.style.width = '0%';
      }, 1500);
      loadExcelFiles();
    } else {
      const err = await res.json();
      throw new Error(err.error || 'Upload gagal');
    }
  } catch (e) {
    progressDiv.style.display = 'none';
    showToast(e.message || 'Upload gagal', 'error');
  }
}

async function deleteExcelFile(name) {
  if (!confirm(`Hapus file "${name}"?`)) return;
  try {
    const res = await fetch(`/api/excel/delete?file=${encodeURIComponent(name)}`, { method: 'DELETE' });
    if (res.ok) {
      showToast(`${name} dihapus`, 'success');
      loadExcelFiles();
    } else {
      showToast('Gagal menghapus file', 'error');
    }
  } catch (e) {
    showToast('Gagal menghapus file', 'error');
  }
}

function formatBytes(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// ================================================
//  KONFIGURASI
// ================================================
async function loadConfig() {
  try {
    const res = await fetch('/api/config');
    const data = await res.json();

    // Set globals for API Key UI
    window.currentConfig = window.currentConfig || {};
    window.currentConfig.GEMINI_API_KEY = data.GEMINI_API_KEY || '';
    window.currentConfig.OPENROUTER_API_KEY = data.OPENROUTER_API_KEY || '';
    window.currentConfig.GROQ_API_KEY = data.GROQ_API_KEY || '';
    updateApiKeysUI();

    // AI Mode
    const modeSelect = document.getElementById('cfg-ai-mode');
    if (data.AI_MODE) modeSelect.value = data.AI_MODE;

    // Voice concurrency
    setInputVal('cfg-voice-concurrency', data.VOICE_TRANSCRIBE_CONCURRENCY || '2');

    // Private only
    const privateOnly = data.PRIVATE_ONLY === 'true';
    document.querySelectorAll('input[name="privateOnly"]').forEach(radio => {
      radio.checked = (radio.value === String(privateOnly));
    });

    // Bot prefix
    setInputVal('cfg-bot-prefix', data.BOT_PREFIX || '');

    // Update AI mode card
    updateCard('aiMode', (data.AI_MODE || 'both').toUpperCase());

    // Voice mode card
    const groqKey = data.GROQ_API_KEY || '';
    updateCard('voiceMode', groqKey && !groqKey.includes('ISI_API') ? 'Groq Cloud API' : 'Local Whisper');

  } catch (e) {
    showToast('Gagal memuat konfigurasi', 'error');
  }
}

function setInputVal(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val;
}

function initConfigActions() {
  // Toggle password visibility
  document.querySelectorAll('.toggle-password').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.target;
      const input = document.getElementById(targetId);
      if (!input) return;
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      btn.textContent = isPassword ? '🙈' : '👁';
    });
  });

  document.getElementById('saveConfigBtn').addEventListener('click', saveConfig);

  // Update Admin Account Action
  document.getElementById('updateAdminBtn')?.addEventListener('click', async () => {
    const newUsername = document.getElementById('cfg-admin-user').value.trim();
    const newPassword = document.getElementById('cfg-admin-pass').value.trim();
    if (!newUsername || !newPassword) {
      return showToast('Username dan password baru harus diisi', 'error');
    }

    if (!confirm('Anda yakin ingin mengubah username dan password? Anda perlu login kembali setelah ini.')) return;

    try {
      const res = await fetch('/api/auth/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newUsername, newPassword })
      });
      if (res.ok) {
        alert("Akun berhasil diubah! Silakan login kembali dengan detail yang baru.");
        localStorage.removeItem('dora_auth_token');
        location.reload();
      } else {
        const err = await res.json();
        showToast('Gagal mengubah akun: ' + err.error, 'error');
      }
    } catch(e) {
      showToast('Terjadi kesalahan saat menghubungi server', 'error');
    }
  });
}

async function saveConfig() {
  const config = {
    AI_MODE: document.getElementById('cfg-ai-mode').value,
    VOICE_TRANSCRIBE_CONCURRENCY: document.getElementById('cfg-voice-concurrency').value || '2',
    PRIVATE_ONLY: document.querySelector('input[name="privateOnly"]:checked')?.value || 'false',
    BOT_PREFIX: document.getElementById('cfg-bot-prefix').value,
  };

  const noteEl = document.getElementById('configSaveNote');
  noteEl.textContent = 'Menyimpan...';

  try {
    const res = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    if (res.ok) {
      showToast('Konfigurasi berhasil disimpan! ✅ Restart bot untuk menerapkan perubahan.', 'success');
      noteEl.textContent = '⚠️ Perlu restart bot agar konfigurasi baru berlaku.';
    } else {
      showToast('Gagal menyimpan konfigurasi', 'error');
      noteEl.textContent = '';
    }
  } catch (e) {
    showToast('Gagal menyimpan konfigurasi', 'error');
    noteEl.textContent = '';
  }
}

// ================================================
//  MODAL: ADD FILE
// ================================================
function initModal() {
  const overlay = document.getElementById('modalOverlay');
  const closeBtn = document.getElementById('modalClose');
  const cancelBtn = document.getElementById('modalCancel');
  const confirmBtn = document.getElementById('modalConfirm');
  const input = document.getElementById('newFileName');

  function closeModal() {
    overlay.style.display = 'none';
    input.value = '';
  }

  closeBtn.addEventListener('click', closeModal);
  cancelBtn.addEventListener('click', closeModal);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

  confirmBtn.addEventListener('click', async () => {
    let name = input.value.trim();
    if (!name) return showToast('Masukkan nama file', 'error');
    if (!name.endsWith('.txt')) name += '.txt';

    try {
      const res = await fetch('/api/prompt/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file: name }),
      });
      if (res.ok) {
        showToast(`File "${name}" dibuat`, 'success');
        closeModal();
        await loadPromptFiles();
        selectPromptFile(name);
      } else {
        const err = await res.json();
        showToast(err.error || 'Gagal membuat file', 'error');
      }
    } catch (e) {
      showToast('Gagal membuat file', 'error');
    }
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') confirmBtn.click();
  });
}

function openModal() {
  document.getElementById('modalOverlay').style.display = 'flex';
  setTimeout(() => document.getElementById('newFileName').focus(), 50);
}

// ================================================
//  ALAMAT CABANG
// ================================================
let branchesData = [];

async function loadBranches() {
  try {
    const res = await fetch('/api/branches');
    const data = await res.json();
    branchesData = data.branches || [];
    renderBranches();
  } catch (e) {
    showToast('Gagal memuat data cabang', 'error');
  }
}

function renderBranches() {
  const container = document.getElementById('branchesList');
  if (branchesData.length === 0) {
    container.innerHTML = '<div class="file-empty" style="text-align:center; padding:40px; color:var(--text-muted);">Belum ada cabang terdaftar. Klik tombol di atas untuk menambah.</div>';
    return;
  }
  
  container.innerHTML = '';
  branchesData.forEach((b, index) => {
    const item = document.createElement('div');
    item.className = 'file-item';
    item.style.padding = '16px';
    item.style.marginBottom = '12px';
    item.style.border = '1px solid var(--border)';
    item.style.borderRadius = '8px';
    
    item.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start;">
        <div style="flex:1;">
          <div style="font-weight:600; font-size:15px; margin-bottom:4px; color:var(--text-primary);"><i class="fa-solid fa-location-dot"></i> ${b.name}</div>
          <div style="font-size:13px; color:var(--text-secondary); margin-bottom:8px; line-height:1.5;">${b.address}</div>
          ${b.mapsUrl ? `<a href="${b.mapsUrl}" target="_blank" style="font-size:12px; color:var(--accent); text-decoration:none;"><i class="fa-solid fa-map-marked-alt"></i> Buka di Google Maps</a>` : ''}
        </div>
        <div style="display:flex; gap:8px;">
          <button class="btn btn-secondary btn-xs" onclick="editBranch(${index})"><i class="fa-solid fa-pen"></i> Edit</button>
          <button class="btn btn-danger btn-xs" onclick="deleteBranch(${index})"><i class="fa-solid fa-trash"></i></button>
        </div>
      </div>
    `;
    container.appendChild(item);
  });
}

function initBranchesActions() {
  const modal = document.getElementById('branchModalOverlay');
  const btnAdd = document.getElementById('btnAddBranch');
  const btnCancel = document.getElementById('branchModalCancel');
  const btnClose = document.getElementById('branchModalClose');
  const btnConfirm = document.getElementById('branchModalConfirm');
  
  let editIndex = -1;

  window.editBranch = (index) => {
    editIndex = index;
    const b = branchesData[index];
    document.getElementById('branchModalTitle').textContent = 'Edit Cabang';
    document.getElementById('branchName').value = b.name;
    document.getElementById('branchAddress').value = b.address;
    document.getElementById('branchMaps').value = b.mapsUrl || '';
    modal.style.display = 'flex';
  };

  window.deleteBranch = async (index) => {
    if (!confirm(`Hapus cabang "${branchesData[index].name}"?`)) return;
    branchesData.splice(index, 1);
    await saveBranchesToServer();
  };

  btnAdd.addEventListener('click', () => {
    editIndex = -1;
    document.getElementById('branchModalTitle').textContent = 'Tambah Cabang Baru';
    document.getElementById('branchName').value = '';
    document.getElementById('branchAddress').value = '';
    document.getElementById('branchMaps').value = '';
    modal.style.display = 'flex';
  });

  const closeModal = () => { modal.style.display = 'none'; };
  btnCancel.addEventListener('click', closeModal);
  btnClose.addEventListener('click', closeModal);

  btnConfirm.addEventListener('click', async () => {
    const name = document.getElementById('branchName').value.trim();
    const address = document.getElementById('branchAddress').value.trim();
    const mapsUrl = document.getElementById('branchMaps').value.trim();

    if (!name || !address) return showToast('Nama dan alamat wajib diisi', 'error');

    const branch = { name, address, mapsUrl };

    if (editIndex > -1) {
      branchesData[editIndex] = branch;
    } else {
      branchesData.push(branch);
    }

    await saveBranchesToServer();
    closeModal();
  });
}

async function saveBranchesToServer() {
  try {
    const res = await fetch('/api/branches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ branches: branchesData })
    });
    if (res.ok) {
      showToast('Data cabang berhasil diperbarui', 'success');
      renderBranches();
    } else {
      showToast('Gagal menyimpan data cabang', 'error');
    }
  } catch (e) {
    showToast('Gagal menghubungi server', 'error');
  }
}

// ================================================
//  API KEYS MANAGEMENT
// ================================================
function updateApiKeysUI() {
  const config = window.currentConfig || {};
  const providers = ['gemini', 'openrouter', 'groq'];
  
  providers.forEach(p => {
    const keyVal = config[`${p.toUpperCase()}_API_KEY`];
    const statusEl = document.getElementById(`status-${p}`);
    const btnSet = document.querySelector(`.btn-set-api[data-provider="${p}"]`);
    const btnEdit = document.querySelector(`.btn-edit-api[data-provider="${p}"]`);
    const btnDelete = document.querySelector(`.btn-delete-api[data-provider="${p}"]`);
    
    if (keyVal && keyVal.length > 0 && !keyVal.includes('ISI_API')) {
      statusEl.className = 'api-key-status set';
      statusEl.innerHTML = '<i class="fa-solid fa-circle-check"></i> Telah disetel';
      btnSet.style.display = 'none';
      btnEdit.style.display = 'inline-flex';
      btnDelete.style.display = 'inline-flex';
    } else {
      statusEl.className = 'api-key-status unset';
      statusEl.innerHTML = '<i class="fa-solid fa-circle-xmark"></i> Belum disetel';
      btnSet.style.display = 'inline-flex';
      btnEdit.style.display = 'none';
      btnDelete.style.display = 'none';
    }
  });
}

function initApiKeysActions() {
  const modalOverlay = document.getElementById('apiKeyModalOverlay');
  const modalTitle = document.getElementById('apiKeyModalTitle');
  const container = document.getElementById('apiInputsContainer');
  const btnAdd = document.getElementById('btnAddApiKey');
  const confirmBtn = document.getElementById('apiKeyModalConfirm');
  const cancelBtn = document.getElementById('apiKeyModalCancel');
  const closeBtn = document.getElementById('apiKeyModalClose');
  const linkEl = document.getElementById('apiKeyLink');
  
  let currentProvider = null;

  const links = {
    gemini: 'https://aistudio.google.com/app/apikey',
    openrouter: 'https://openrouter.ai/keys',
    groq: 'https://console.groq.com/keys'
  };

  const titles = {
    gemini: 'Gemini',
    openrouter: 'OpenRouter',
    groq: 'Groq'
  };

  function createApiInputRow(value = '') {
    const row = document.createElement('div');
    row.className = 'api-input-row';
    
    row.innerHTML = `
      <input type="password" class="config-input api-key-field" placeholder="Masukkan API Key..." value="${value}" />
      <button class="toggle-password" type="button"><i class="fa-solid fa-eye"></i></button>
      <button class="btn-remove-api" type="button" title="Hapus Key ini"><i class="fa-solid fa-trash"></i></button>
    `;

    // Toggle password
    const input = row.querySelector('input');
    const toggleBtn = row.querySelector('.toggle-password');
    toggleBtn.addEventListener('click', () => {
      const isPassword = input.type === 'password';
      input.type = isPassword ? 'text' : 'password';
      toggleBtn.innerHTML = isPassword ? '<i class="fa-solid fa-eye-slash"></i>' : '<i class="fa-solid fa-eye"></i>';
    });

    // Remove row
    const removeBtn = row.querySelector('.btn-remove-api');
    removeBtn.addEventListener('click', () => {
      if (container.querySelectorAll('.api-input-row').length > 1) {
        row.remove();
      } else {
        input.value = '';
      }
    });

    return row;
  }

  function closeApiModal() {
    modalOverlay.style.display = 'none';
    container.innerHTML = '';
    currentProvider = null;
  }

  closeBtn.addEventListener('click', closeApiModal);
  cancelBtn.addEventListener('click', closeApiModal);
  modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) closeApiModal(); });

  btnAdd.addEventListener('click', () => {
    const newRow = createApiInputRow();
    container.appendChild(newRow);
    newRow.querySelector('input').focus();
  });

  // Handle Set/Edit clicks
  document.querySelectorAll('.btn-set-api, .btn-edit-api').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const provider = e.currentTarget.dataset.provider;
      currentProvider = provider;
      modalTitle.textContent = `Set ${titles[provider]} API Key`;
      linkEl.href = links[provider];
      
      const hintContainer = document.getElementById('apiKeyHint');
      if (provider === 'gemini') {
        hintContainer.innerHTML = `Dapatkan gratis di <a href="${links.gemini}" target="_blank" class="config-link">website resmi</a>.<br><span style="color:var(--warn);font-size:11.5px;display:inline-block;margin-top:4px;">💡 <b>Multi-Key:</b> Kamu bisa menambahkan banyak key untuk menghindari rate limit.</span>`;
        btnAdd.style.display = 'block';
      } else {
        hintContainer.innerHTML = `Dapatkan gratis di <a href="${links[provider]}" target="_blank" id="apiKeyLink" class="config-link">website resmi</a>.`;
        btnAdd.style.display = 'none';
      }
      
      const existingKey = window.currentConfig[`${provider.toUpperCase()}_API_KEY`] || '';
      const keys = existingKey.includes('ISI_API') ? [''] : existingKey.split(',').map(k => k.trim()).filter(k => k !== '');
      
      container.innerHTML = '';
      if (keys.length === 0) keys.push('');
      
      keys.forEach(k => {
        container.appendChild(createApiInputRow(k));
      });
      
      modalOverlay.style.display = 'flex';
      setTimeout(() => container.querySelector('input').focus(), 50);
    });
  });

  // Handle Save
  confirmBtn.addEventListener('click', async () => {
    if (!currentProvider) return;
    
    const inputs = container.querySelectorAll('.api-key-field');
    const values = Array.from(inputs).map(i => i.value.trim()).filter(v => v !== '');
    
    if (values.length === 0) return showToast('API Key tidak boleh kosong', 'error');

    const newVal = values.join(',');

    try {
      const payload = {};
      payload[`${currentProvider.toUpperCase()}_API_KEY`] = newVal;
      
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        showToast(`${titles[currentProvider]} API Key berhasil disimpan!`, 'success');
        window.currentConfig[`${currentProvider.toUpperCase()}_API_KEY`] = newVal;
        updateApiKeysUI();
        closeApiModal();
      } else {
        showToast('Gagal menyimpan API Key', 'error');
      }
    } catch (e) {
      showToast('Gagal menghubungi server', 'error');
    }
  });

  // Handle Delete
  document.querySelectorAll('.btn-delete-api').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const provider = e.currentTarget.dataset.provider;
      if (!confirm(`Apakah Anda yakin ingin menghapus API Key untuk ${titles[provider]}?`)) return;

      try {
        const payload = {};
        payload[`${provider.toUpperCase()}_API_KEY`] = '';
        
        const res = await fetch('/api/config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        
        if (res.ok) {
          showToast(`${titles[provider]} API Key berhasil dihapus!`, 'success');
          window.currentConfig[`${provider.toUpperCase()}_API_KEY`] = '';
          updateApiKeysUI();
        } else {
          showToast('Gagal menghapus API Key', 'error');
        }
      } catch (e) {
        showToast('Gagal menghubungi server', 'error');
      }
    });
  });
}

// ================================================
//  TOAST NOTIFICATION
// ================================================
let toastTimer;
function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = `toast show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, 3500);
}

// ================================================
//  BOT RESTART
// ================================================
function initRestartBot() {
  const btnRestart = document.getElementById('btnRestartBot');
  const overlay = document.getElementById('restartModalOverlay');
  const statusText = document.getElementById('restartStatusText');

  if (!btnRestart) return;

  btnRestart.addEventListener('click', async (e) => {
    e.preventDefault();
    if (!confirm('Apakah Anda yakin ingin memulai ulang bot? Koneksi WhatsApp akan terputus sejenak.')) return;

    overlay.style.display = 'flex';
    statusText.textContent = 'Menerima permintaan restart...';

    try {
      const res = await fetch('/api/bot/restart', { method: 'POST' });
      if (res.ok) {
        statusText.textContent = 'Bot sedang dimulai ulang. Menunggu koneksi WhatsApp terhubung kembali...';
        
        let timeout = setTimeout(() => {
          if (overlay.style.display === 'flex') {
            overlay.style.display = 'none';
            showToast('Proses restart memakan waktu lebih lama, silakan cek log.', 'warn');
          }
        }, 30000);
        
        window.restartTimeout = timeout;

      } else {
        overlay.style.display = 'none';
        showToast('Gagal memicu restart bot.', 'error');
      }
    } catch (e) {
      overlay.style.display = 'none';
      showToast('Gagal menghubungi server.', 'error');
    }
  });
}
