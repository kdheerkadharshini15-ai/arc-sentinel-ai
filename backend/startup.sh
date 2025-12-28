#!/bin/bash
# ============================================================================
# A.R.C SENTINEL - Startup Script
# Quick start for development and demo
# ============================================================================

set -e

echo "=============================================="
echo "  A.R.C SENTINEL - SOC Platform Startup"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Python
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}Python 3 not found. Please install Python 3.10+${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Python found${NC}"

# Navigate to backend
cd "$(dirname "$0")"

# Check for virtual environment
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}Creating virtual environment...${NC}"
    python3 -m venv venv
fi

# Activate virtual environment
echo -e "${YELLOW}Activating virtual environment...${NC}"
source venv/bin/activate

# Install dependencies
echo -e "${YELLOW}Installing dependencies...${NC}"
pip install -r requirements.txt --quiet

# Check for .env file
if [ ! -f ".env" ]; then
    echo -e "${RED}.env file not found!${NC}"
    echo "Please create .env with the following variables:"
    echo "  SUPABASE_URL=your_supabase_url"
    echo "  SUPABASE_KEY=your_anon_key"
    echo "  SUPABASE_SERVICE_ROLE_KEY=your_service_role_key"
    echo "  GEMINI_API_KEY=your_gemini_api_key"
    exit 1
fi

echo -e "${GREEN}✓ Environment configured${NC}"

# Health check function
health_check() {
    for i in {1..10}; do
        if curl -s http://localhost:8000/health > /dev/null 2>&1; then
            return 0
        fi
        sleep 1
    done
    return 1
}

# Start the server
echo ""
echo -e "${GREEN}Starting A.R.C SENTINEL Backend...${NC}"
echo "=============================================="
echo ""
echo "  🌐 API Server:    http://localhost:8000"
echo "  📚 API Docs:      http://localhost:8000/docs"
echo "  🔌 WebSocket:     ws://localhost:8000/ws"
echo ""
echo "=============================================="
echo ""

# Run server
python server.py
