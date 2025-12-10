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
