# EOS AI Overlay

AI Chatbot desktop overlay con Tauri + llama.cpp + NVIDIA Parakeet STT.

![Preview](docs/preview.png)

## Features

- 🎯 **Always-on-top overlay** - Ventana flotante siempre visible
- 🖱️ **Draggable & Minimizable** - Arrastra y minimiza como quieras
- 🤖 **llama.cpp integration** - Conecta a cualquier modelo LLM local
- 🎙️ **Voice input** - Entrada de voz con NVIDIA Parakeet
- 🌙 **Modern dark UI** - Diseño glassmorphism elegante
- 🖥️ **Cross-platform** - Windows y Linux

## Prerequisites

1. **Rust** - https://rustup.rs/
2. **Node.js** - https://nodejs.org/
3. **llama.cpp server** - Corriendo en puerto 8080
4. **Python 3.10+** - Para el servidor STT (opcional, solo voz)
5. **NVIDIA GPU** - Recomendado para Parakeet (opcional)

## Quick Start

### 1. Instalar dependencias

```bash
npm install
```

### 2. Iniciar llama.cpp server

```bash
# En otra terminal
./llama-server -m tu-modelo.gguf -c 2048 --host 0.0.0.0 --port 8080
```

### 3. (Opcional) Iniciar STT server para voz

```bash
cd stt-server
pip install -r requirements.txt
uvicorn stt_server:app --host 127.0.0.1 --port 8765
```

### 4. Ejecutar la aplicación

```bash
# Desarrollo
npm run tauri dev

# Build producción
npm run tauri build
```

## Project Structure

```
├── src/                    # Frontend
│   ├── index.html         # Main HTML
│   ├── styles.css         # Glassmorphism theme
│   ├── main.js            # Chat logic
│   ├── voice.js           # Voice capture
│   └── pcm-worklet.js     # Audio processor
├── src-tauri/             # Rust backend
│   ├── src/lib.rs         # Tauri commands
│   └── tauri.conf.json    # Window config
└── stt-server/            # Python STT server
    ├── stt_server.py      # FastAPI WebSocket
    └── requirements.txt   # Python deps
```

## Configuration

### Cambiar puerto de llama.cpp

Edita `src-tauri/src/lib.rs`:
```rust
.post("http://localhost:8080/completion")  // <- Cambia aquí
```

### Cambiar puerto STT

Edita `src/voice.js`:
```javascript
const STT_WS_URL = 'ws://127.0.0.1:8765/ws';  // <- Cambia aquí
```

## Usage

- **Chat**: Escribe y presiona Enter o click en enviar
- **Voz**: Mantén presionado el botón del micrófono para hablar
- **Mover**: Arrastra desde la barra superior
- **Minimizar**: Click en el botón `-`
- **Cerrar**: Click en el botón `×`

## License

MIT
