#!/bin/bash
# ==============================================================================
# Parakeet TDT 0.6b-v3 Voice Model Setup Script for WSL Ubuntu
# ==============================================================================
# Este script configura el entorno completo para el modelo de voz Parakeet
# para el proyecto EOS Tauri AI Overlay.
#
# Uso: bash setup_parakeet.sh
# ==============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Paths
MODELS_DIR="/mnt/g/Mark/EOS/Modelos"
HF_CACHE_DIR="$MODELS_DIR/hf"
PARAKEET_DIR="$MODELS_DIR/parakeet-tdt-0.6b-v3"
VENV_DIR="$HOME/venvs/parakeet"
PROJECT_DIR="/mnt/g/Mark/EOS/EOS_code/stt-server"

echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  Parakeet Voice Model Setup for WSL       ${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

# ==============================================================================
# Step 1: Install system dependencies
# ==============================================================================
echo -e "${YELLOW}[1/6] Instalando dependencias del sistema...${NC}"
sudo apt update
sudo apt install -y python3 python3-venv python3-pip git ffmpeg
echo -e "${GREEN}✓ Dependencias del sistema instaladas${NC}"
echo ""

# ==============================================================================
# Step 2: Create model directories
# ==============================================================================
echo -e "${YELLOW}[2/6] Creando estructura de carpetas...${NC}"
mkdir -p "$HF_CACHE_DIR/hub"
mkdir -p "$PARAKEET_DIR"
echo -e "${GREEN}✓ Carpetas creadas:${NC}"
echo "   - $HF_CACHE_DIR"
echo "   - $PARAKEET_DIR"
echo ""

# ==============================================================================
# Step 3: Configure Hugging Face environment variables
# ==============================================================================
echo -e "${YELLOW}[3/6] Configurando variables de entorno de Hugging Face...${NC}"

# Check if already configured
if grep -q "HF_HOME" ~/.bashrc; then
    echo -e "${BLUE}   Variables ya configuradas en .bashrc${NC}"
else
    echo 'export HF_HOME="/mnt/g/Mark/EOS/Modelos/hf"' >> ~/.bashrc
    echo 'export HF_HUB_CACHE="/mnt/g/Mark/EOS/Modelos/hf/hub"' >> ~/.bashrc
fi

# Set for current session
export HF_HOME="/mnt/g/Mark/EOS/Modelos/hf"
export HF_HUB_CACHE="/mnt/g/Mark/EOS/Modelos/hf/hub"

echo -e "${GREEN}✓ Variables de entorno configuradas:${NC}"
echo "   HF_HOME=$HF_HOME"
echo "   HF_HUB_CACHE=$HF_HUB_CACHE"
echo ""

# ==============================================================================
# Step 4: Create Python virtual environment
# ==============================================================================
echo -e "${YELLOW}[4/6] Creando entorno virtual Python...${NC}"
mkdir -p "$HOME/venvs"

if [ -d "$VENV_DIR" ]; then
    echo -e "${BLUE}   Entorno virtual ya existe, recreando...${NC}"
    rm -rf "$VENV_DIR"
fi

python3 -m venv "$VENV_DIR"
source "$VENV_DIR/bin/activate"
pip install --upgrade pip
echo -e "${GREEN}✓ Entorno virtual creado: $VENV_DIR${NC}"
echo ""

# ==============================================================================
# Step 5: Install Python dependencies
# ==============================================================================
echo -e "${YELLOW}[5/6] Instalando dependencias Python (esto puede tomar varios minutos)...${NC}"
echo -e "${BLUE}   Instalando PyTorch...${NC}"
pip install torch torchvision torchaudio

echo -e "${BLUE}   Instalando NeMo Toolkit con ASR...${NC}"
pip install -U "nemo_toolkit[asr]"

echo -e "${BLUE}   Instalando Hugging Face Hub...${NC}"
pip install -U "huggingface_hub[hf_transfer]"

echo -e "${BLUE}   Instalando FastAPI y dependencias del servidor...${NC}"
pip install fastapi uvicorn websockets

echo -e "${GREEN}✓ Dependencias Python instaladas${NC}"
echo ""

# ==============================================================================
# Step 6: Download Parakeet model
# ==============================================================================
echo -e "${YELLOW}[6/6] Descargando modelo Parakeet TDT 0.6b-v3...${NC}"
echo -e "${BLUE}   Esto puede tomar varios minutos dependiendo de tu conexión...${NC}"

huggingface-cli download nvidia/parakeet-tdt-0.6b-v3 \
    --local-dir "$PARAKEET_DIR" \
    --local-dir-use-symlinks False

echo -e "${GREEN}✓ Modelo descargado en: $PARAKEET_DIR${NC}"
echo ""

# ==============================================================================
# Verification
# ==============================================================================
echo -e "${BLUE}============================================${NC}"
echo -e "${BLUE}  Verificación de la instalación           ${NC}"
echo -e "${BLUE}============================================${NC}"
echo ""

echo -e "${YELLOW}Verificando PyTorch...${NC}"
python -c "import torch; print(f'   PyTorch: {torch.__version__}')"

echo -e "${YELLOW}Verificando NeMo...${NC}"
python -c "import nemo; print('   NeMo: OK')"

echo -e "${YELLOW}Verificando FastAPI...${NC}"
python -c "from fastapi import FastAPI; print('   FastAPI: OK')"

echo -e "${YELLOW}Verificando archivos del modelo...${NC}"
if [ -f "$PARAKEET_DIR/model_config.yaml" ] || [ -f "$PARAKEET_DIR/parakeet-tdt-0.6b-v3.nemo" ]; then
    echo -e "   Modelo: OK"
else
    echo -e "${RED}   Modelo: No encontrado (puede que aún esté descargando)${NC}"
fi

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  ¡Instalación completada!                 ${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "Para iniciar el servidor STT, ejecuta:"
echo ""
echo -e "${BLUE}   cd $PROJECT_DIR${NC}"
echo -e "${BLUE}   source ~/venvs/parakeet/bin/activate${NC}"
echo -e "${BLUE}   python stt_server.py${NC}"
echo ""
echo -e "El servidor estará disponible en: ${GREEN}ws://127.0.0.1:8765/ws${NC}"
echo ""
