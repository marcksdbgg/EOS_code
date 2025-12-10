"""
STT Server using Vosk (Offline Speech Recognition)
FastAPI + WebSocket for real-time speech-to-text

Compatible with existing voice.js WebSocket protocol.
Run with: python stt_server.py
"""

import asyncio
import base64
import json
import os
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

# Vosk import
try:
    from vosk import Model, KaldiRecognizer
    VOSK_AVAILABLE = True
except ImportError:
    VOSK_AVAILABLE = False
    print("WARNING: Vosk not installed. Install with: pip install vosk")

app = FastAPI(title="Vosk STT Server")

# CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Audio configuration (matches voice.js)
SAMPLE_RATE = 16000

# Model path - set via environment variable or default
MODEL_PATH = os.environ.get(
    "VOSK_MODEL_PATH",
    r"G:\Mark\EOS\Modelos\vosk\vosk-model-small-es-0.42"
)

# Model (loaded on startup)
vosk_model = None


@app.on_event("startup")
async def load_model():
    """Load the Vosk model on startup"""
    global vosk_model
    
    if not VOSK_AVAILABLE:
        print("ERROR: Vosk not available. STT will not work.")
        return
    
    print(f"Loading Vosk model from: {MODEL_PATH}")
    
    if not os.path.exists(MODEL_PATH):
        print(f"ERROR: Model not found at {MODEL_PATH}")
        print("Download from: https://alphacephei.com/vosk/models")
        return
    
    try:
        vosk_model = Model(MODEL_PATH)
        print("Vosk model loaded successfully!")
    except Exception as e:
        print(f"ERROR loading model: {e}")
        vosk_model = None


@app.websocket("/ws")
async def websocket_stt(websocket: WebSocket):
    """WebSocket endpoint for real-time STT"""
    await websocket.accept()
    print("WebSocket client connected")
    
    if vosk_model is None:
        print("Model not loaded, closing connection")
        await websocket.close()
        return
    
    # Create recognizer for this session
    recognizer = KaldiRecognizer(vosk_model, SAMPLE_RATE)
    recognizer.SetWords(True)
    
    try:
        while True:
            data = await websocket.receive_text()
            msg = json.loads(data)
            msg_type = msg.get("type")
            
            if msg_type == "audio":
                # Decode base64 audio chunk (PCM Int16 16kHz)
                chunk = base64.b64decode(msg.get("data", ""))
                
                # Feed audio to recognizer
                if recognizer.AcceptWaveform(chunk):
                    # Complete utterance detected
                    result = json.loads(recognizer.Result())
                    text = result.get("text", "")
                    if text:
                        print(f"Transcription: '{text}'")
                        await websocket.send_json({
                            "type": "partial",
                            "text": text
                        })
                else:
                    # Partial result available
                    partial = json.loads(recognizer.PartialResult())
                    text = partial.get("partial", "")
                    if text:
                        await websocket.send_json({
                            "type": "partial",
                            "text": text
                        })
            
            elif msg_type == "flush":
                # Final transcription - get final result
                result = json.loads(recognizer.FinalResult())
                text = result.get("text", "")
                print(f"Final: '{text}'")
                
                await websocket.send_json({
                    "type": "final",
                    "text": text
                })
                
                # Reset recognizer for next utterance
                recognizer = KaldiRecognizer(vosk_model, SAMPLE_RATE)
                recognizer.SetWords(True)
            
            elif msg_type == "reset":
                # Reset without sending result
                recognizer = KaldiRecognizer(vosk_model, SAMPLE_RATE)
                recognizer.SetWords(True)
                print("Recognizer reset")
    
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
        "model_loaded": vosk_model is not None,
        "vosk_available": VOSK_AVAILABLE,
        "model_path": MODEL_PATH
    }


if __name__ == "__main__":
    import uvicorn
    print("Starting Vosk STT Server...")
    print(f"Endpoint: ws://127.0.0.1:8765/ws")
    print("")
    uvicorn.run(app, host="127.0.0.1", port=8765)
