# Project Structure

```
EOS_code/
├── package.json
├── src
│   ├── index.html
│   ├── main.js
│   ├── pcm-worklet.js
│   ├── styles.css
│   └── voice.js
├── src-tauri
│   ├── Cargo.toml
│   ├── build.rs
│   ├── icons
│   │   └── .gitkeep
│   ├── src
│   │   ├── lib.rs
│   │   └── main.rs
│   └── tauri.conf.json
├── stt-server
│   ├── requirements.txt
│   └── stt_server.py
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
      <div class="titlebar-left">
        <div class="status-indicator" id="statusIndicator"></div>
        <span class="title">EOS AI</span>
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
        <button class="voice-btn" id="voiceBtn" title="Entrada de voz (mantener presionado)">
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

// State
let chatHistory = [];
let isProcessing = false;

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

// Voice module (will be loaded dynamically)
let voiceModule = null;

// ============ Initialization ============
async function init() {
  setupEventListeners();
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

  // Voice button - push to talk
  voiceBtn.addEventListener('mousedown', startVoiceCapture);
  voiceBtn.addEventListener('mouseup', stopVoiceCapture);
  voiceBtn.addEventListener('mouseleave', stopVoiceCapture);

  // Window controls
  minimizeBtn.addEventListener('click', () => invoke('minimize_window'));
  closeBtn.addEventListener('click', () => invoke('close_window'));
}

async function loadVoiceModule() {
  try {
    voiceModule = await import('./voice.js');
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
let isRecording = false;

async function startVoiceCapture() {
  if (!voiceModule || isRecording) return;

  isRecording = true;
  voiceBtn.classList.add('recording');
  voiceIndicator.classList.add('active');
  voiceText.textContent = 'Escuchando...';

  try {
    await voiceModule.startVoice(
      // onPartial - update text as speaking
      (text) => {
        userInput.value = text;
        voiceText.textContent = text || 'Escuchando...';
        autoResizeTextarea();
      },
      // onFinal - final text after stopping
      (text) => {
        userInput.value = text;
        autoResizeTextarea();
      }
    );
  } catch (e) {
    console.error('Voice start error:', e);
    stopVoiceCapture();
  }
}

function stopVoiceCapture() {
  if (!voiceModule || !isRecording) return;

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

## File: `src-tauri\build.rs`
```rs
fn main() {
    tauri_build::build()
}

```

## File: `src-tauri\Cargo.toml`
```toml
[package]
name = "eos-ai-overlay"
version = "1.0.0"
edition = "2021"

[lib]
name = "eos_ai_overlay_lib"
crate-type = ["staticlib", "cdylib", "rlib"]

[build-dependencies]
tauri-build = { version = "2", features = [] }

[dependencies]
tauri = { version = "2", features = [] }
tauri-plugin-shell = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
reqwest = { version = "0.12", features = ["json", "rustls-tls"] }
tokio = { version = "1", features = ["full"] }

```

## File: `src-tauri\icons\.gitkeep`
```
.gitignore placeholder - Tauri icons directory
This directory should contain application icons.
See: https://tauri.app/v1/guides/features/icons/

```

## File: `src-tauri\src\lib.rs`
```rs
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::Manager;

#[tauri::command]
async fn ask_llm(prompt: String, history: Vec<serde_json::Value>) -> Result<String, String> {
    let client = reqwest::Client::new();
    
    // Build conversation context from history
    let mut full_prompt = String::new();
    for msg in &history {
        if let (Some(role), Some(content)) = (
            msg.get("role").and_then(|v| v.as_str()),
            msg.get("content").and_then(|v| v.as_str())
        ) {
            match role {
                "user" => full_prompt.push_str(&format!("User: {}\n", content)),
                "assistant" => full_prompt.push_str(&format!("Assistant: {}\n", content)),
                _ => {}
            }
        }
    }
    full_prompt.push_str(&format!("User: {}\nAssistant:", prompt));

    // llama.cpp server completion endpoint
    let body = serde_json::json!({
        "prompt": full_prompt,
        "n_predict": 512,
        "temperature": 0.7,
        "top_p": 0.9,
        "stop": ["User:", "\n\n"]
    });

    let resp = client
        .post("http://localhost:8080/completion")
        .json(&body)
        .timeout(std::time::Duration::from_secs(120))
        .send()
        .await
        .map_err(|e| format!("HTTP error: {}", e))?;

    let value: serde_json::Value = resp
        .json()
        .await
        .map_err(|e| format!("JSON parse error: {}", e))?;

    Ok(value
        .get("content")
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .trim()
        .to_string())
}

#[tauri::command]
async fn minimize_window(window: tauri::Window) -> Result<(), String> {
    window.minimize().map_err(|e| e.to_string())
}

#[tauri::command]
async fn close_window(window: tauri::Window) -> Result<(), String> {
    window.close().map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|app| {
            // Ensure window stays on top
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_always_on_top(true);
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![ask_llm, minimize_window, close_window])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

```

## File: `src-tauri\src\main.rs`
```rs
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    eos_ai_overlay_lib::run()
}

```

## File: `src-tauri\tauri.conf.json`
```json
{
    "$schema": "https://schema.tauri.app/config/2",
    "productName": "EOS AI Overlay",
    "identifier": "com.eos.ai-overlay",
    "version": "1.0.0",
    "build": {
        "beforeDevCommand": "npm run dev",
        "devUrl": "http://localhost:5173",
        "beforeBuildCommand": "npm run build",
        "frontendDist": "../dist"
    },
    "app": {
        "withGlobalTauri": true,
        "windows": [
            {
                "label": "main",
                "title": "EOS AI",
                "width": 420,
                "height": 560,
                "minWidth": 320,
                "minHeight": 400,
                "resizable": true,
                "fullscreen": false,
                "decorations": false,
                "alwaysOnTop": true,
                "skipTaskbar": false,
                "transparent": true,
                "shadow": false,
                "center": false,
                "x": 50,
                "y": 50
            }
        ],
        "security": {
            "csp": null
        }
    },
    "bundle": {
        "active": true,
        "targets": "all",
        "icon": [
            "icons/32x32.png",
            "icons/128x128.png",
            "icons/128x128@2x.png",
            "icons/icon.icns",
            "icons/icon.ico"
        ]
    }
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
        asr_model = nemo_asr.models.ASRModel.from_pretrained(
            model_name="nvidia/parakeet-tdt-0.6b-v3"
        )
        print("Model loaded successfully!")
    except Exception as e:
        print(f"ERROR loading model: {e}")
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
        return "[Model not loaded]"
    
    try:
        output = asr_model.transcribe([wav_path])
        if output and len(output) > 0:
            # Handle different output formats
            if hasattr(output[0], 'text'):
                return output[0].text
            elif isinstance(output[0], str):
                return output[0]
        return ""
    except Exception as e:
        print(f"Transcription error: {e}")
        return f"[Error: {e}]"
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
    
    audio_buffer = bytearray()
    partial_threshold = int(0.6 * SAMPLE_RATE * SAMPLE_WIDTH)  # ~600ms of audio
    
    try:
        while True:
            data = await websocket.receive_text()
            msg = __import__('json').loads(data)
            msg_type = msg.get("type")
            
            if msg_type == "audio":
                # Decode base64 audio chunk
                chunk = base64.b64decode(msg.get("data", ""))
                audio_buffer.extend(chunk)
                
                # Send partial transcription every ~600ms
                if len(audio_buffer) >= partial_threshold:
                    wav_path = pcm_to_wav_file(bytes(audio_buffer))
                    text = transcribe_audio(wav_path)
                    await websocket.send_json({
                        "type": "partial",
                        "text": text
                    })
            
            elif msg_type == "flush":
                # Final transcription
                if audio_buffer:
                    wav_path = pcm_to_wav_file(bytes(audio_buffer))
                    text = transcribe_audio(wav_path)
                    await websocket.send_json({
                        "type": "final",
                        "text": text
                    })
                audio_buffer.clear()
            
            elif msg_type == "reset":
                # Clear buffer without transcribing
                audio_buffer.clear()
    
    except WebSocketDisconnect:
        print("Client disconnected")
    except Exception as e:
        print(f"WebSocket error: {e}")


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
