#!/bin/bash
# A.R.C SENTINEL - Build Script for Render Deployment
# =====================================================

set -e

echo "=== A.R.C SENTINEL Build Script ==="

# Navigate to project root (works on Render)
cd /opt/render/project/src 2>/dev/null || cd "$(dirname "$0")"

# Install Python dependencies
echo "Installing Python dependencies..."
cd backend
pip install --upgrade pip
pip install -r requirements.txt

# Build React frontend
echo "Building React frontend..."
cd ../frontend
npm ci --legacy-peer-deps

# For production: use relative URLs (same-origin requests)
export REACT_APP_API_URL=""
export REACT_APP_WS_URL=""
export REACT_APP_BACKEND_URL=""

npm run build

# Copy build to backend static directory
echo "Copying build to backend..."
rm -rf ../backend/static
mkdir -p ../backend/static
cp -r build/* ../backend/static/

echo "=== Build Complete ==="
