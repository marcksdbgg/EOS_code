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
