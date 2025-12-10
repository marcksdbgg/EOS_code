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
        
        # Check if CUDA is available
        if torch.cuda.is_available():
            print(f"CUDA available: {torch.cuda.get_device_name(0)}")
            asr_model = nemo_asr.models.ASRModel.from_pretrained(
                model_name="nvidia/parakeet-tdt-0.6b-v3"
            )
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
        with torch.no_grad():
            output = asr_model.transcribe([wav_path])
        
        result = ""
        if output and len(output) > 0:
            # Handle different output formats from NeMo
            if hasattr(output[0], 'text'):
                result = output[0].text
            elif isinstance(output[0], str):
                result = output[0]
            elif hasattr(output, 'text'):
                result = output.text
        
        print(f"Transcription result: '{result}'")
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
    # Increase threshold to ~1 second of audio for better transcription
    partial_threshold = int(1.0 * SAMPLE_RATE * SAMPLE_WIDTH)
    
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
                    
                    # Send partial result
                    response = {"type": "partial", "text": text}
                    print(f"Sending partial: {response}")
                    await websocket.send_json(response)
            
            elif msg_type == "flush":
                # Final transcription
                print(f"Flush received, buffer size: {len(audio_buffer)}")
                if len(audio_buffer) > 0:
                    wav_path = pcm_to_wav_file(bytes(audio_buffer))
                    text = transcribe_audio(wav_path)
                    
                    response = {"type": "final", "text": text}
                    print(f"Sending final: {response}")
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
