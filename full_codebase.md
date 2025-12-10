# Project Structure

```
EOS_code/
├── app-icon.png
├── extermal-files
│   └── registro.txt
├── generate-icons.js
├── package.json
├── src
│   ├── index.html
│   ├── main.js
│   ├── pcm-worklet.js
│   ├── styles.css
│   └── voice.js
├── stt-server
│   ├── requirements.txt
│   ├── setup_parakeet.sh
│   ├── start_server.sh
│   ├── stt_server.py
│   └── verify_install.sh
└── vite.config.js
```

# Full Codebase

## File: `package.json`
```json
{
  "name": "eos-ai-overlay",
  "version": "1.0.0",
  "description": "AI Chatbot Overlay with llama.cpp and Parakeet STT",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "tauri": "tauri",
    "tauri:dev": "tauri dev",
    "tauri:build": "tauri build"
  },
  "devDependencies": {
    "@tauri-apps/cli": "^2",
    "vite": "^6"
  },
  "dependencies": {
    "@tauri-apps/api": "^2"
  }
}

```

## File: `app-icon.png`
_[Skipped: binary or non-UTF8 file]_
## File: `extermal-files\registro.txt`
```txt
$env:PATH += ";$env:USERPROFILE\.cargo\bin"; npm run tauri:dev
```

## File: `generate-icons.js`
```js
// Simple script to generate a basic icon
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a minimal valid ICO file (16x16 blue square)
// ICO format: Header + Directory Entry + Image Data

const iconsDir = path.join(__dirname, 'src-tauri', 'icons');

// Ensure directory exists
if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
}

// Create a minimal 16x16 32-bit ICO file
// ICO Header: 6 bytes
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);      // Reserved
header.writeUInt16LE(1, 2);      // Type (1 = ICO)
header.writeUInt16LE(1, 4);      // Number of images

// ICO Directory Entry: 16 bytes
const dirEntry = Buffer.alloc(16);
dirEntry.writeUInt8(16, 0);      // Width (16 = 16px)
dirEntry.writeUInt8(16, 1);      // Height
dirEntry.writeUInt8(0, 2);       // Color palette (0 = no palette)
dirEntry.writeUInt8(0, 3);       // Reserved
dirEntry.writeUInt16LE(1, 4);    // Color planes
dirEntry.writeUInt16LE(32, 6);   // Bits per pixel

// Image data size (BITMAPINFOHEADER + pixel data)
const bmpHeaderSize = 40;
const pixelDataSize = 16 * 16 * 4; // 16x16 BGRA
const imageSize = bmpHeaderSize + pixelDataSize;
dirEntry.writeUInt32LE(imageSize, 8);   // Image size
dirEntry.writeUInt32LE(22, 12);         // Offset to image data (6 + 16)

// BITMAPINFOHEADER: 40 bytes
const bmpHeader = Buffer.alloc(40);
bmpHeader.writeUInt32LE(40, 0);    // Header size
bmpHeader.writeInt32LE(16, 4);     // Width
bmpHeader.writeInt32LE(32, 8);     // Height (doubled for ICO format)
bmpHeader.writeUInt16LE(1, 12);    // Planes
bmpHeader.writeUInt16LE(32, 14);   // Bits per pixel
bmpHeader.writeUInt32LE(0, 16);    // Compression
bmpHeader.writeUInt32LE(pixelDataSize, 20); // Image size

// Pixel data: 16x16 indigo/purple gradient 
const pixels = Buffer.alloc(pixelDataSize);
for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
        const offset = (y * 16 + x) * 4;
        // BGRA format - Indigo color (#6366f1)
        pixels.writeUInt8(241, offset);     // B
        pixels.writeUInt8(102, offset + 1); // G  
        pixels.writeUInt8(99, offset + 2);  // R
        pixels.writeUInt8(255, offset + 3); // A
    }
}

// Combine all parts
const ico = Buffer.concat([header, dirEntry, bmpHeader, pixels]);

// Write ICO file
fs.writeFileSync(path.join(iconsDir, 'icon.ico'), ico);
console.log('Created icon.ico');

// Also create simple PNG files (just solid color squares)
// These are minimal valid PNGs

// PNG signature + minimal IHDR + IDAT + IEND for a 32x32 indigo square
const createSimplePNG = (size) => {
    const PNG = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A
    ]);
    return PNG; // This won't work, we need actual PNG data
};

console.log('Done! Icons created in src-tauri/icons/');
console.log('Note: For production, replace with proper icons.');

```

## File: `src\index.html`
```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>EOS AI</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <div class="overlay-container">
    <!-- Custom Titlebar -->
    <header class="titlebar" data-tauri-drag-region>
      <div class="titlebar-left" data-tauri-drag-region>
        <div class="status-indicator" id="statusIndicator" data-tauri-drag-region></div>
        <span class="title" data-tauri-drag-region>EOS AI</span>
      </div>
      <div class="titlebar-controls">
        <button class="control-btn minimize" id="minimizeBtn" title="Minimizar">
          <svg width="12" height="12" viewBox="0 0 12 12">
            <rect y="5" width="12" height="2" fill="currentColor"/>
          </svg>
        </button>
        <button class="control-btn close" id="closeBtn" title="Cerrar">
          <svg width="12" height="12" viewBox="0 0 12 12">
            <path d="M1 1L11 11M11 1L1 11" stroke="currentColor" stroke-width="2"/>
          </svg>
        </button>
      </div>
    </header>

    <!-- Chat Area -->
    <main class="chat-container">
      <div class="messages" id="messages">
        <div class="message assistant">
          <div class="message-content">
            ¡Hola! Soy tu asistente IA. ¿En qué puedo ayudarte?
          </div>
        </div>
      </div>
    </main>

    <!-- Input Area -->
    <footer class="input-container">
      <div class="voice-indicator" id="voiceIndicator">
        <div class="voice-waves">
          <span></span><span></span><span></span>
        </div>
        <span class="voice-text" id="voiceText">Escuchando...</span>
      </div>
      
      <div class="input-row">
        <button class="voice-btn" id="voiceBtn" title="Entrada de voz (click para activar/desactivar)">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="23"/>
            <line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
        </button>
        
        <div class="input-wrapper">
          <textarea
            id="userInput"
            placeholder="Escribe un mensaje..."
            rows="1"
            autofocus
          ></textarea>
        </div>
        
        <button class="send-btn" id="sendBtn" title="Enviar (Enter)">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
    </footer>
  </div>

  <script type="module" src="main.js"></script>
</body>
</html>

```

## File: `src\main.js`
```js
// Main application logic for EOS AI Overlay
const { invoke } = window.__TAURI__.core;
const { getCurrentWindow } = window.__TAURI__.window;

// State
let chatHistory = [];
let isProcessing = false;
let isRecording = false;

// DOM Elements
const messagesContainer = document.getElementById('messages');
const userInput = document.getElementById('userInput');
const sendBtn = document.getElementById('sendBtn');
const voiceBtn = document.getElementById('voiceBtn');
const voiceIndicator = document.getElementById('voiceIndicator');
const voiceText = document.getElementById('voiceText');
const minimizeBtn = document.getElementById('minimizeBtn');
const closeBtn = document.getElementById('closeBtn');
const statusIndicator = document.getElementById('statusIndicator');
const titlebar = document.querySelector('.titlebar');

// Voice module (will be loaded dynamically)
let voiceModule = null;

// ============ Initialization ============
async function init() {
  setupEventListeners();
  setupWindowDrag();
  await loadVoiceModule();
  autoResizeTextarea();
}

function setupEventListeners() {
  // Send message
  sendBtn.addEventListener('click', sendMessage);
  userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });

  // Auto-resize textarea
  userInput.addEventListener('input', autoResizeTextarea);

  // Voice button - CLICK TO TOGGLE (not push-to-talk)
  voiceBtn.addEventListener('click', toggleVoiceCapture);

  // Window controls
  minimizeBtn.addEventListener('click', () => invoke('minimize_window'));
  closeBtn.addEventListener('click', () => invoke('close_window'));
}

// Setup window drag for Tauri 2
function setupWindowDrag() {
  if (titlebar) {
    titlebar.addEventListener('mousedown', async (e) => {
      // Don't drag if clicking on buttons
      if (e.target.closest('button')) return;

      try {
        const appWindow = getCurrentWindow();
        await appWindow.startDragging();
      } catch (err) {
        console.error('Drag error:', err);
      }
    });
  }
}

async function loadVoiceModule() {
  try {
    voiceModule = await import('./voice.js');
    console.log('Voice module loaded successfully');
  } catch (e) {
    console.warn('Voice module not available:', e);
  }
}

// ============ Chat Functions ============
async function sendMessage() {
  const text = userInput.value.trim();
  if (!text || isProcessing) return;

  // Clear input
  userInput.value = '';
  autoResizeTextarea();

  // Add user message
  addMessage('user', text);
  chatHistory.push({ role: 'user', content: text });

  // Show thinking indicator
  isProcessing = true;
  setStatus('processing');
  sendBtn.disabled = true;
  const thinkingEl = addThinkingMessage();

  try {
    // Call LLM via Rust backend
    const response = await invoke('ask_llm', {
      prompt: text,
      history: chatHistory.slice(-10) // Last 10 messages for context
    });

    // Remove thinking indicator
    thinkingEl.remove();

    // Add assistant response
    if (response) {
      addMessage('assistant', response);
      chatHistory.push({ role: 'assistant', content: response });
    } else {
      addMessage('assistant', 'No pude generar una respuesta. ¿Está el servidor llama.cpp activo?');
    }

    setStatus('success');
  } catch (error) {
    console.error('LLM Error:', error);
    thinkingEl.remove();
    addMessage('assistant', `Error: ${error}`);
    setStatus('error');
  } finally {
    isProcessing = false;
    sendBtn.disabled = false;
  }
}

function addMessage(role, content) {
  const messageEl = document.createElement('div');
  messageEl.className = `message ${role}`;
  messageEl.innerHTML = `<div class="message-content">${escapeHtml(content)}</div>`;
  messagesContainer.appendChild(messageEl);
  scrollToBottom();
  return messageEl;
}

function addThinkingMessage() {
  const messageEl = document.createElement('div');
  messageEl.className = 'message assistant thinking';
  messageEl.innerHTML = `
    <div class="message-content">
      <div class="typing-indicator">
        <span></span><span></span><span></span>
      </div>
      Pensando...
    </div>
  `;
  messagesContainer.appendChild(messageEl);
  scrollToBottom();
  return messageEl;
}

function scrollToBottom() {
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function autoResizeTextarea() {
  userInput.style.height = 'auto';
  userInput.style.height = Math.min(userInput.scrollHeight, 120) + 'px';
}

// ============ Voice Functions ============
// Toggle voice capture on click (not push-to-talk)
async function toggleVoiceCapture() {
  if (isRecording) {
    stopVoiceCapture();
  } else {
    await startVoiceCapture();
  }
}

async function startVoiceCapture() {
  if (!voiceModule) {
    console.error('Voice module not loaded');
    return;
  }

  console.log('Starting voice capture...');
  isRecording = true;
  voiceBtn.classList.add('recording');
  voiceIndicator.classList.add('active');
  voiceText.textContent = 'Escuchando...';

  try {
    await voiceModule.startVoice(
      // onPartial - update text as speaking
      (text) => {
        console.log('Partial transcription:', text);
        if (text && text.trim()) {
          userInput.value = text;
          voiceText.textContent = text;
          autoResizeTextarea();
        }
      },
      // onFinal - final text after stopping
      (text) => {
        console.log('Final transcription:', text);
        if (text && text.trim()) {
          userInput.value = text;
          autoResizeTextarea();
        }
      }
    );
  } catch (e) {
    console.error('Voice start error:', e);
    stopVoiceCapture();
  }
}

function stopVoiceCapture() {
  if (!voiceModule) return;

  console.log('Stopping voice capture...');
  isRecording = false;
  voiceBtn.classList.remove('recording');
  voiceIndicator.classList.remove('active');

  try {
    voiceModule.stopVoice();
  } catch (e) {
    console.error('Voice stop error:', e);
  }
}

// ============ Utilities ============
function setStatus(status) {
  statusIndicator.className = 'status-indicator';
  if (status === 'error') {
    statusIndicator.classList.add('error');
  } else if (status === 'processing') {
    statusIndicator.classList.add('processing');
  }
  // 'success' uses default green
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', init);

```

## File: `src\pcm-worklet.js`
```js
// AudioWorklet processor for capturing PCM audio at 16kHz mono
// Converts Float32 samples to Int16 for transmission

class PCMCaptureProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.bufferSize = 2048; // ~128ms at 16kHz
        this.buffer = new Float32Array(this.bufferSize);
        this.bufferIndex = 0;
    }

    process(inputs, outputs, parameters) {
        const input = inputs[0];
        if (!input || !input[0]) return true;

        const channel = input[0];

        // Accumulate samples into buffer
        for (let i = 0; i < channel.length; i++) {
            this.buffer[this.bufferIndex++] = channel[i];

            // When buffer is full, send it
            if (this.bufferIndex >= this.bufferSize) {
                this.sendBuffer();
                this.bufferIndex = 0;
            }
        }

        return true;
    }

    sendBuffer() {
        // Convert Float32 [-1, 1] to Int16 [-32768, 32767]
        const int16 = new Int16Array(this.bufferSize);

        for (let i = 0; i < this.bufferSize; i++) {
            // Clamp to [-1, 1] range
            let sample = Math.max(-1, Math.min(1, this.buffer[i]));
            // Convert to Int16
            int16[i] = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
        }

        // Send to main thread
        this.port.postMessage(int16);
    }
}

registerProcessor('pcm-capture', PCMCaptureProcessor);

```

## File: `src\styles.css`
```css
/* ===============================================
   EOS AI Overlay - Glassmorphism Dark Theme
   =============================================== */

:root {
  --bg-primary: rgba(15, 15, 20, 0.95);
  --bg-secondary: rgba(25, 25, 35, 0.9);
  --bg-glass: rgba(255, 255, 255, 0.03);
  --border-glass: rgba(255, 255, 255, 0.08);
  --accent: #6366f1;
  --accent-glow: rgba(99, 102, 241, 0.3);
  --text-primary: #f1f5f9;
  --text-secondary: #94a3b8;
  --text-muted: #64748b;
  --success: #22c55e;
  --error: #ef4444;
  --warning: #f59e0b;
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  height: 100%;
  overflow: hidden;
  font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
  background: transparent;
  color: var(--text-primary);
  user-select: none;
}

/* ============ Container ============ */
.overlay-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--bg-primary);
  border: 1px solid var(--border-glass);
  border-radius: var(--radius-lg);
  overflow: hidden;
  box-shadow: 
    0 25px 50px -12px rgba(0, 0, 0, 0.5),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(20px);
}

/* ============ Titlebar ============ */
.titlebar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-glass);
  cursor: grab;
}

.titlebar:active {
  cursor: grabbing;
}

.titlebar-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--success);
  box-shadow: 0 0 8px var(--success);
  animation: pulse 2s ease-in-out infinite;
}

.status-indicator.error {
  background: var(--error);
  box-shadow: 0 0 8px var(--error);
}

.status-indicator.processing {
  background: var(--warning);
  box-shadow: 0 0 8px var(--warning);
  animation: pulse 0.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  letter-spacing: 0.5px;
}

.titlebar-controls {
  display: flex;
  gap: 8px;
}

.control-btn {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: var(--radius-sm);
  background: var(--bg-glass);
  color: var(--text-muted);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.control-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text-primary);
}

.control-btn.close:hover {
  background: var(--error);
  color: white;
}

/* ============ Chat Container ============ */
.chat-container {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.messages {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.messages::-webkit-scrollbar {
  width: 6px;
}

.messages::-webkit-scrollbar-track {
  background: transparent;
}

.messages::-webkit-scrollbar-thumb {
  background: var(--border-glass);
  border-radius: 3px;
}

.messages::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.15);
}

/* ============ Messages ============ */
.message {
  max-width: 85%;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message.user {
  align-self: flex-end;
}

.message.assistant {
  align-self: flex-start;
}

.message-content {
  padding: 12px 16px;
  border-radius: var(--radius-md);
  font-size: 14px;
  line-height: 1.5;
  word-wrap: break-word;
  white-space: pre-wrap;
}

.message.user .message-content {
  background: linear-gradient(135deg, var(--accent), #8b5cf6);
  color: white;
  border-bottom-right-radius: 4px;
}

.message.assistant .message-content {
  background: var(--bg-secondary);
  border: 1px solid var(--border-glass);
  color: var(--text-primary);
  border-bottom-left-radius: 4px;
}

.message.thinking .message-content {
  display: flex;
  align-items: center;
  gap: 8px;
}

.typing-indicator {
  display: flex;
  gap: 4px;
}

.typing-indicator span {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--text-muted);
  animation: typing 1.4s infinite ease-in-out;
}

.typing-indicator span:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-indicator span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typing {
  0%, 60%, 100% {
    transform: translateY(0);
    opacity: 0.4;
  }
  30% {
    transform: translateY(-6px);
    opacity: 1;
  }
}

/* ============ Input Container ============ */
.input-container {
  padding: 16px;
  background: var(--bg-secondary);
  border-top: 1px solid var(--border-glass);
}

.voice-indicator {
  display: none;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 12px;
  margin-bottom: 12px;
  background: rgba(99, 102, 241, 0.1);
  border: 1px solid var(--accent);
  border-radius: var(--radius-md);
  animation: fadeIn 0.2s ease;
}

.voice-indicator.active {
  display: flex;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.voice-waves {
  display: flex;
  align-items: center;
  gap: 3px;
  height: 20px;
}

.voice-waves span {
  width: 3px;
  height: 100%;
  background: var(--accent);
  border-radius: 2px;
  animation: wave 0.5s ease-in-out infinite;
}

.voice-waves span:nth-child(2) {
  animation-delay: 0.1s;
}

.voice-waves span:nth-child(3) {
  animation-delay: 0.2s;
}

@keyframes wave {
  0%, 100% {
    transform: scaleY(0.3);
  }
  50% {
    transform: scaleY(1);
  }
}

.voice-text {
  font-size: 13px;
  color: var(--accent);
}

.input-row {
  display: flex;
  gap: 10px;
  align-items: flex-end;
}

.voice-btn,
.send-btn {
  width: 42px;
  height: 42px;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.voice-btn {
  background: var(--bg-glass);
  border: 1px solid var(--border-glass);
  color: var(--text-secondary);
}

.voice-btn:hover {
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-primary);
}

.voice-btn.recording {
  background: var(--error);
  border-color: var(--error);
  color: white;
  animation: recording 1s ease-in-out infinite;
}

@keyframes recording {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.4);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(239, 68, 68, 0);
  }
}

.send-btn {
  background: linear-gradient(135deg, var(--accent), #8b5cf6);
  color: white;
}

.send-btn:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 15px var(--accent-glow);
}

.send-btn:active {
  transform: scale(0.95);
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

.input-wrapper {
  flex: 1;
  position: relative;
}

.input-wrapper textarea {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid var(--border-glass);
  border-radius: var(--radius-md);
  background: var(--bg-glass);
  color: var(--text-primary);
  font-family: inherit;
  font-size: 14px;
  line-height: 1.5;
  resize: none;
  max-height: 120px;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.input-wrapper textarea::placeholder {
  color: var(--text-muted);
}

.input-wrapper textarea:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-glow);
}

/* ============ Utilities ============ */
.hidden {
  display: none !important;
}

```

## File: `src\voice.js`
```js
// Voice capture module using WebSocket to Parakeet STT server
// Server should be running at ws://127.0.0.1:8765/ws

const STT_WS_URL = 'ws://127.0.0.1:8765/ws';

let ws = null;
let audioCtx = null;
let workletNode = null;
let stream = null;
let onPartialCallback = null;
let onFinalCallback = null;

/**
 * Start voice capture and connect to STT server
 * @param {Function} onPartial - Called with partial text as user speaks
 * @param {Function} onFinal - Called with final text when recording stops
 */
export async function startVoice(onPartial, onFinal) {
    onPartialCallback = onPartial;
    onFinalCallback = onFinal;

    // Connect to STT WebSocket server
    ws = new WebSocket(STT_WS_URL);

    ws.onopen = () => {
        console.log('Connected to STT server');
    };

    ws.onmessage = (ev) => {
        try {
            const msg = JSON.parse(ev.data);
            if (msg.type === 'partial' && onPartialCallback) {
                onPartialCallback(msg.text);
            }
            if (msg.type === 'final' && onFinalCallback) {
                onFinalCallback(msg.text);
            }
        } catch (e) {
            console.error('STT message parse error:', e);
        }
    };

    ws.onerror = (err) => {
        console.error('STT WebSocket error:', err);
    };

    ws.onclose = () => {
        console.log('STT WebSocket closed');
    };

    // Wait for WebSocket to connect
    await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('WebSocket connection timeout')), 5000);
        ws.addEventListener('open', () => {
            clearTimeout(timeout);
            resolve();
        }, { once: true });
        ws.addEventListener('error', () => {
            clearTimeout(timeout);
            reject(new Error('WebSocket connection failed'));
        }, { once: true });
    });

    // Get microphone stream
    stream = await navigator.mediaDevices.getUserMedia({
        audio: {
            sampleRate: 16000,
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true
        }
    });

    // Create audio context at 16kHz
    audioCtx = new AudioContext({ sampleRate: 16000 });

    // Load the PCM worklet processor
    await audioCtx.audioWorklet.addModule('./pcm-worklet.js');

    // Create source and worklet node
    const source = audioCtx.createMediaStreamSource(stream);
    workletNode = new AudioWorkletNode(audioCtx, 'pcm-capture');

    // Handle audio data from worklet
    workletNode.port.onmessage = (ev) => {
        const int16Array = ev.data;
        if (ws && ws.readyState === WebSocket.OPEN) {
            // Convert Int16Array to base64
            const uint8 = new Uint8Array(int16Array.buffer);
            const b64 = arrayBufferToBase64(uint8);
            ws.send(JSON.stringify({ type: 'audio', data: b64 }));
        }
    };

    // Connect the audio pipeline
    source.connect(workletNode);
}

/**
 * Stop voice capture and get final transcription
 */
export function stopVoice() {
    // Request final transcription
    if (ws && ws.readyState === WebSocket.OPEN) {
        try {
            ws.send(JSON.stringify({ type: 'flush' }));
        } catch (e) {
            console.error('Error sending flush:', e);
        }
    }

    // Clean up audio
    if (workletNode) {
        try {
            workletNode.disconnect();
        } catch (e) { }
        workletNode = null;
    }

    if (audioCtx) {
        try {
            audioCtx.close();
        } catch (e) { }
        audioCtx = null;
    }

    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }

    // Close WebSocket after a short delay to receive final response
    setTimeout(() => {
        if (ws) {
            try {
                ws.close();
            } catch (e) { }
            ws = null;
        }
    }, 1000);
}

/**
 * Convert ArrayBuffer to base64 string
 */
function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

```

## File: `stt-server\requirements.txt`
```txt
# STT Server Dependencies
# Install with: pip install -r requirements.txt
# Note: For GPU support, install PyTorch with CUDA first

fastapi>=0.104.0
uvicorn[standard]>=0.24.0
websockets>=12.0

# NeMo Toolkit with ASR support
# This will also install PyTorch and other dependencies
nemo_toolkit[asr]>=2.0.0

```

## File: `stt-server\setup_parakeet.sh`
```sh
#!/bin/bash
# ==============================================================================
# Parakeet TDT 0.6b-v3 Voice Model Setup Script for WSL Ubuntu
# ==============================================================================
# Este script configura el entorno completo para el modelo de voz Parakeet
# para el proyecto EOS Tauri AI Overlay.
#
# Uso: bash setup_parakeet.sh
# ==============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Paths
MODELS_DIR="/mnt/g/Mark/EOS/Modelos"
HF_CACHE_DIR="$MODELS_DIR/hf"
PARAKEET_DIR="$MODELS_DIR/parakeet-tdt-0.6b-v3"
VENV_DIR="$HOME/venvs/parakeet"
PROJECT_DIR="/mnt/g/Mark/EOS/EOS_code/stt-server"

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  Parakeet Voice Model Setup for WSL       ${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

# ==============================================================================
# Step 1: Install system dependencies
# ==============================================================================
echo -e "${YELLOW}[1/6] Instalando dependencias del sistema...${NC}"
sudo apt update
sudo apt install -y python3 python3-venv python3-pip git ffmpeg
echo -e "${GREEN}✓ Dependencias del sistema instaladas${NC}"
echo ""

# ==============================================================================
# Step 2: Create model directories
# ==============================================================================
echo -e "${YELLOW}[2/6] Creando estructura de carpetas...${NC}"
mkdir -p "$HF_CACHE_DIR/hub"
mkdir -p "$PARAKEET_DIR"
echo -e "${GREEN}✓ Carpetas creadas:${NC}"
echo "   - $HF_CACHE_DIR"
echo "   - $PARAKEET_DIR"
echo ""

# ==============================================================================
# Step 3: Configure Hugging Face environment variables
# ==============================================================================
echo -e "${YELLOW}[3/6] Configurando variables de entorno de Hugging Face...${NC}"

# Check if already configured
if grep -q "HF_HOME" ~/.bashrc; then
    echo -e "${BLUE}   Variables ya configuradas en .bashrc${NC}"
else
    echo 'export HF_HOME="/mnt/g/Mark/EOS/Modelos/hf"' >> ~/.bashrc
    echo 'export HF_HUB_CACHE="/mnt/g/Mark/EOS/Modelos/hf/hub"' >> ~/.bashrc
fi

# Set for current session
export HF_HOME="/mnt/g/Mark/EOS/Modelos/hf"
export HF_HUB_CACHE="/mnt/g/Mark/EOS/Modelos/hf/hub"

echo -e "${GREEN}✓ Variables de entorno configuradas:${NC}"
echo "   HF_HOME=$HF_HOME"
echo "   HF_HUB_CACHE=$HF_HUB_CACHE"
echo ""

# ==============================================================================
# Step 4: Create Python virtual environment
# ==============================================================================
echo -e "${YELLOW}[4/6] Creando entorno virtual Python...${NC}"
mkdir -p "$HOME/venvs"

if [ -d "$VENV_DIR" ]; then
    echo -e "${BLUE}   Entorno virtual ya existe, recreando...${NC}"
    rm -rf "$VENV_DIR"
fi

python3 -m venv "$VENV_DIR"
source "$VENV_DIR/bin/activate"
pip install --upgrade pip
echo -e "${GREEN}✓ Entorno virtual creado: $VENV_DIR${NC}"
echo ""

# ==============================================================================
# Step 5: Install Python dependencies
# ==============================================================================
echo -e "${YELLOW}[5/6] Instalando dependencias Python (esto puede tomar varios minutos)...${NC}"
echo -e "${BLUE}   Instalando PyTorch...${NC}"
pip install torch torchvision torchaudio

echo -e "${BLUE}   Instalando NeMo Toolkit con ASR...${NC}"
pip install -U "nemo_toolkit[asr]"

echo -e "${BLUE}   Instalando Hugging Face Hub...${NC}"
pip install -U "huggingface_hub[hf_transfer]"

echo -e "${BLUE}   Instalando FastAPI y dependencias del servidor...${NC}"
pip install fastapi uvicorn websockets

echo -e "${GREEN}✓ Dependencias Python instaladas${NC}"
echo ""

# ==============================================================================
# Step 6: Download Parakeet model
# ==============================================================================
echo -e "${YELLOW}[6/6] Descargando modelo Parakeet TDT 0.6b-v3...${NC}"
echo -e "${BLUE}   Esto puede tomar varios minutos dependiendo de tu conexión...${NC}"

huggingface-cli download nvidia/parakeet-tdt-0.6b-v3 \
    --local-dir "$PARAKEET_DIR" \
    --local-dir-use-symlinks False

echo -e "${GREEN}✓ Modelo descargado en: $PARAKEET_DIR${NC}"
echo ""

# ==============================================================================
# Verification
# ==============================================================================
echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  Verificación de la instalación           ${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

echo -e "${YELLOW}Verificando PyTorch...${NC}"
python -c "import torch; print(f'   PyTorch: {torch.__version__}')"

echo -e "${YELLOW}Verificando NeMo...${NC}"
python -c "import nemo; print('   NeMo: OK')"

echo -e "${YELLOW}Verificando FastAPI...${NC}"
python -c "from fastapi import FastAPI; print('   FastAPI: OK')"

echo -e "${YELLOW}Verificando archivos del modelo...${NC}"
if [ -f "$PARAKEET_DIR/model_config.yaml" ] || [ -f "$PARAKEET_DIR/parakeet-tdt-0.6b-v3.nemo" ]; then
    echo -e "   Modelo: OK"
else
    echo -e "${RED}   Modelo: No encontrado (puede que aún esté descargando)${NC}"
fi

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  ¡Instalación completada!                 ${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "Para iniciar el servidor STT, ejecuta:"
echo ""
echo -e "${BLUE}   cd $PROJECT_DIR${NC}"
echo -e "${BLUE}   source ~/venvs/parakeet/bin/activate${NC}"
echo -e "${BLUE}   python stt_server.py${NC}"
echo ""
echo -e "El servidor estará disponible en: ${GREEN}ws://127.0.0.1:8765/ws${NC}"
echo ""

```

## File: `stt-server\start_server.sh`
```sh
#!/bin/bash
# Start the Parakeet STT Server

source ~/venvs/parakeet/bin/activate
export HF_HOME=/mnt/g/Mark/EOS/Modelos/hf
export HF_HUB_CACHE=/mnt/g/Mark/EOS/Modelos/hf/hub

# Force CPU mode to avoid CUDA graphs error in WSL2
export CUDA_VISIBLE_DEVICES=""

cd /mnt/g/Mark/EOS/EOS_code/stt-server
echo "Starting Parakeet STT Server (CPU Mode)..."
echo "Endpoint: ws://127.0.0.1:8765/ws"
echo ""
python stt_server.py

```

## File: `stt-server\stt_server.py`
```py
"""
STT Server using NVIDIA Parakeet-TDT-0.6b-v3
FastAPI + WebSocket for real-time speech-to-text

Run with: uvicorn stt_server:app --host 127.0.0.1 --port 8765
"""

import asyncio
import base64
import tempfile
import wave
import os
import json
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

# NeMo ASR import
try:
    import nemo.collections.asr as nemo_asr
    NEMO_AVAILABLE = True
except ImportError:
    NEMO_AVAILABLE = False
    print("WARNING: NeMo not installed. Install with: pip install nemo_toolkit[asr]")

app = FastAPI(title="Parakeet STT Server")

# CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Audio configuration
SAMPLE_RATE = 16000
CHANNELS = 1
SAMPLE_WIDTH = 2  # 16-bit audio

# Model (loaded on startup)
asr_model = None


@app.on_event("startup")
async def load_model():
    """Load the Parakeet model on startup"""
    global asr_model
    
    if not NEMO_AVAILABLE:
        print("ERROR: NeMo not available. STT will not work.")
        return
    
    print("Loading Parakeet-TDT-0.6b-v3 model...")
    try:
        import torch
        
        # Disable CUDA graphs to avoid CUDA failure 35
        os.environ["CUDA_LAUNCH_BLOCKING"] = "1"
        
        # Check if CUDA is available
        if torch.cuda.is_available():
            print(f"CUDA available: {torch.cuda.get_device_name(0)}")
            asr_model = nemo_asr.models.ASRModel.from_pretrained(
                model_name="nvidia/parakeet-tdt-0.6b-v3"
            )
            
            # Disable CUDA graphs in the decoding strategy
            if hasattr(asr_model, 'decoding') and asr_model.decoding is not None:
                if hasattr(asr_model.decoding, 'decoding'):
                    decoding = asr_model.decoding.decoding
                    if hasattr(decoding, 'use_cuda_graph_decoder'):
                        decoding.use_cuda_graph_decoder = False
                        print("Disabled CUDA graph decoder")
                    if hasattr(decoding, 'decoding_computer'):
                        if hasattr(decoding.decoding_computer, 'use_cuda_graphs'):
                            decoding.decoding_computer.use_cuda_graphs = False
                            print("Disabled CUDA graphs in decoding computer")
            
            # Put model in eval mode for inference
            asr_model.eval()
            print("Model loaded successfully on GPU!")
        else:
            print("CUDA not available, using CPU...")
            asr_model = nemo_asr.models.ASRModel.from_pretrained(
                model_name="nvidia/parakeet-tdt-0.6b-v3",
                map_location="cpu"
            )
            asr_model = asr_model.cpu()
            asr_model.eval()
            print("Model loaded successfully on CPU!")
    except Exception as e:
        print(f"ERROR loading model: {e}")
        import traceback
        traceback.print_exc()
        asr_model = None


def pcm_to_wav_file(pcm_bytes: bytes) -> str:
    """Convert raw PCM bytes to a temporary WAV file"""
    tmp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
    tmp.close()
    
    with wave.open(tmp.name, "wb") as wf:
        wf.setnchannels(CHANNELS)
        wf.setsampwidth(SAMPLE_WIDTH)
        wf.setframerate(SAMPLE_RATE)
        wf.writeframes(pcm_bytes)
    
    return tmp.name


def transcribe_audio(wav_path: str) -> str:
    """Transcribe audio file using the loaded model"""
    if asr_model is None:
        print("Model not loaded!")
        return ""
    
    try:
        import torch
        with torch.no_grad(), torch.cuda.amp.autocast(enabled=False):
            # Use verbose=False to suppress the progress bar
            output = asr_model.transcribe([wav_path], verbose=False)
        
        result = ""
        if output and len(output) > 0:
            # Handle different output formats from NeMo
            if hasattr(output[0], 'text'):
                result = output[0].text
            elif isinstance(output[0], str):
                result = output[0]
            elif hasattr(output, 'text'):
                result = output.text
        
        if result:
            print(f"Transcription: '{result}'")
        return result
        
    except Exception as e:
        print(f"Transcription error: {e}")
        import traceback
        traceback.print_exc()
        return ""
    finally:
        # Clean up temp file
        try:
            os.unlink(wav_path)
        except:
            pass


@app.websocket("/ws")
async def websocket_stt(websocket: WebSocket):
    """WebSocket endpoint for real-time STT"""
    await websocket.accept()
    print("WebSocket client connected")
    
    audio_buffer = bytearray()
    # Increase threshold to ~2 seconds of audio for better transcription
    partial_threshold = int(2.0 * SAMPLE_RATE * SAMPLE_WIDTH)
    
    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            msg_type = msg.get("type")
            
            if msg_type == "audio":
                # Decode base64 audio chunk
                chunk = base64.b64decode(msg.get("data", ""))
                audio_buffer.extend(chunk)
                
                # Send partial transcription when we have enough audio
                if len(audio_buffer) >= partial_threshold:
                    wav_path = pcm_to_wav_file(bytes(audio_buffer))
                    text = transcribe_audio(wav_path)
                    
                    # Only send if we have text
                    if text:
                        response = {"type": "partial", "text": text}
                        print(f"Sending partial: {text}")
                        await websocket.send_json(response)
            
            elif msg_type == "flush":
                # Final transcription
                print(f"Flush received, buffer size: {len(audio_buffer)}")
                if len(audio_buffer) > SAMPLE_RATE * SAMPLE_WIDTH:  # At least 1 second
                    wav_path = pcm_to_wav_file(bytes(audio_buffer))
                    text = transcribe_audio(wav_path)
                    
                    response = {"type": "final", "text": text if text else ""}
                    print(f"Sending final: {text}")
                    await websocket.send_json(response)
                    
                audio_buffer.clear()
            
            elif msg_type == "reset":
                # Clear buffer without transcribing
                audio_buffer.clear()
                print("Buffer reset")
    
    except WebSocketDisconnect:
        print("Client disconnected")
    except Exception as e:
        print(f"WebSocket error: {e}")
        import traceback
        traceback.print_exc()


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "ok",
        "model_loaded": asr_model is not None,
        "nemo_available": NEMO_AVAILABLE
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8765)

```

## File: `stt-server\verify_install.sh`
```sh
#!/bin/bash
# Test script for verifying Parakeet installation

source ~/venvs/parakeet/bin/activate
export HF_HOME=/mnt/g/Mark/EOS/Modelos/hf
export HF_HUB_CACHE=/mnt/g/Mark/EOS/Modelos/hf/hub

echo "=== Verificación de Parakeet STT ==="
echo ""

echo "1. Verificando PyTorch..."
python -c "import torch; print(f'   PyTorch: {torch.__version__}')"

echo ""
echo "2. Verificando NeMo..."
python -c "import nemo; print('   NeMo: OK')"

echo ""
echo "3. Verificando FastAPI..."
python -c "from fastapi import FastAPI; print('   FastAPI: OK')"

echo ""
echo "4. Verificando modelo descargado..."
if [ -f "/mnt/g/Mark/EOS/Modelos/parakeet-tdt-0.6b-v3/parakeet-tdt-0.6b-v3.nemo" ]; then
    echo "   Modelo: parakeet-tdt-0.6b-v3.nemo encontrado"
else
    echo "   Modelo: NO ENCONTRADO"
fi

echo ""
echo "=== Verificación completada ==="

```

## File: `vite.config.js`
```js
import { defineConfig } from 'vite';

export default defineConfig({
    // Prevent vite from obscuring rust errors
    clearScreen: false,

    // Tauri expects a fixed port
    server: {
        port: 5173,
        strictPort: true,
        watch: {
            ignored: ['**/src-tauri/**']
        }
    },

    // Build configuration
    build: {
        // Tauri uses Chromium on Windows and WebKit on macOS/Linux
        target: process.env.TAURI_ENV_PLATFORM === 'windows'
            ? 'chrome105'
            : 'safari14',
        // Produce sourcemaps for debugging
        sourcemap: !!process.env.TAURI_ENV_DEBUG,
        outDir: 'dist',
        emptyOutDir: true,
        rollupOptions: {
            input: {
                main: './src/index.html'
            }
        }
    },

    // Public directory for static assets
    publicDir: 'public',

    // Root directory
    root: './src'
});

```
