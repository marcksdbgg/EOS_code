// Main application logic for EOS AI Overlay
const { invoke } = window.__TAURI__.core;

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

  // Voice button - CLICK TO TOGGLE (not push-to-talk)
  voiceBtn.addEventListener('click', toggleVoiceCapture);

  // Window controls
  minimizeBtn.addEventListener('click', () => invoke('minimize_window'));
  closeBtn.addEventListener('click', () => invoke('close_window'));
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
        userInput.value = text;
        voiceText.textContent = text || 'Escuchando...';
        autoResizeTextarea();
      },
      // onFinal - final text after stopping
      (text) => {
        console.log('Final transcription:', text);
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
