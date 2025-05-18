#!/bin/bash
# Test script for SW25 player image fitting

# Define color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}SW25 Player Image Fitting Test${NC}"
echo "============================="
echo

# Check if a web server is available
if command -v python3 &> /dev/null; then
    echo -e "${GREEN}Starting a simple HTTP server to test the images...${NC}"
    echo "Navigate to one of these test pages:"
    echo "- http://localhost:8000/player/test-image-fit.html (Basic test)"
    echo "- http://localhost:8000/player/advanced-image-test.html (Advanced test)"
    echo
    echo -e "${YELLOW}Press Ctrl+C to stop the server when done testing${NC}"
    cd /home/michelek/Documents/github/sw25
    python3 -m http.server
else
    echo -e "${RED}Python3 not found. Please install Python3 or manually open the HTML files in your browser.${NC}"
    echo "Files location:"
    echo "  - /home/michelek/Documents/github/sw25/player/test-image-fit.html"
    echo "  - /home/michelek/Documents/github/sw25/player/advanced-image-test.html"
fi
