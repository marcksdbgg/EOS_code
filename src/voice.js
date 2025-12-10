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
