@echo off
REM Start the Vosk STT Server (Windows)

cd /d "%~dp0"

REM Activate virtual environment if exists
if exist ".venv\Scripts\activate.bat" (
    call .venv\Scripts\activate.bat
)

REM Set model path
set VOSK_MODEL_PATH=G:\Mark\EOS\Modelos\vosk\vosk-model-small-es-0.42

echo Starting Vosk STT Server...
echo Endpoint: ws://127.0.0.1:8765/ws
echo.

python stt_server.py
