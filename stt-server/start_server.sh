#!/bin/bash
# Start the Parakeet STT Server

source ~/venvs/parakeet/bin/activate
export HF_HOME=/mnt/g/Mark/EOS/Modelos/hf
export HF_HUB_CACHE=/mnt/g/Mark/EOS/Modelos/hf/hub

cd /mnt/g/Mark/EOS/EOS_code/stt-server
echo "Starting Parakeet STT Server..."
echo "Endpoint: ws://127.0.0.1:8765/ws"
echo ""
python stt_server.py
