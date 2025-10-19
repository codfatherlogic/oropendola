#!/bin/bash

# ============================================
# Backend API Test Script
# ============================================
# Tests the Oropendola AI backend API
# Usage: ./test-backend.sh

set -e  # Exit on error

echo "============================================"
echo "🧪 Oropendola Backend API Test"
echo "============================================"
echo ""

# Configuration
API_URL="https://oropendola.ai"
API_ENDPOINT="/api/method/ai_assistant.api.chat"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    print_warning "jq is not installed (optional for pretty JSON)"
    print_info "Install with: brew install jq (macOS) or apt install jq (Linux)"
    USE_JQ=false
else
    USE_JQ=true
fi

echo ""
echo "Configuration:"
echo "  API URL: $API_URL"
echo "  Endpoint: $API_ENDPOINT"
echo ""

# Get session cookie
echo "============================================"
echo "Step 1: Get Session Cookie"
echo "============================================"
echo ""

# Try to get from VSCode settings
VSCODE_SETTINGS="$HOME/Library/Application Support/Code/User/globalStorage/oropendola.oropendola-ai-assistant/secrets.json"

if [ -f "$VSCODE_SETTINGS" ]; then
    print_info "Found VSCode settings file"
    # This is a simplification - actual secret storage is encrypted
    print_warning "Session cookies are encrypted in VSCode"
    print_info "Please provide your session cookie manually"
else
    print_info "VSCode settings not found"
fi

echo ""
read -p "Enter your session ID (sid cookie value): " SESSION_ID

if [ -z "$SESSION_ID" ]; then
    print_error "Session ID is required"
    echo ""
    echo "To get your session ID:"
    echo "1. Open https://oropendola.ai in browser"
    echo "2. Press F12 or Cmd+Option+I (DevTools)"
    echo "3. Go to Console tab"
    echo "4. Run: document.cookie.split(';').find(c => c.includes('sid'))"
    echo "5. Copy the value after 'sid='"
    exit 1
fi

COOKIE_HEADER="sid=$SESSION_ID"
print_success "Session cookie set"
echo ""

# Test 1: Ping API
echo "============================================"
echo "Step 2: Test API Connectivity"
echo "============================================"
echo ""

print_info "Testing connection to $API_URL..."

if curl -s -o /dev/null -w "%{http_code}" "$API_URL" | grep -q "200\|301\|302"; then
    print_success "Server is reachable"
else
    print_error "Server is not reachable"
    exit 1
fi
echo ""

# Test 2: Test Chat Endpoint (Simple)
echo "============================================"
echo "Step 3: Test Chat Endpoint (Simple Message)"
echo "============================================"
echo ""

print_info "Sending test message to chat endpoint..."

TEST_PAYLOAD='{
  "messages": [
    {"role": "user", "content": "Hello, this is a test"}
  ],
  "mode": "ask"
}'

echo "Request:"
echo "$TEST_PAYLOAD" | if [ "$USE_JQ" = true ]; then jq .; else cat; fi
echo ""

RESPONSE=$(curl -s -X POST "${API_URL}${API_ENDPOINT}" \
  -H "Content-Type: application/json" \
  -H "Cookie: $COOKIE_HEADER" \
  -d "$TEST_PAYLOAD")

echo "Response:"
if [ "$USE_JQ" = true ]; then
    echo "$RESPONSE" | jq .
else
    echo "$RESPONSE"
fi
echo ""

# Check response
if echo "$RESPONSE" | grep -q '"success".*true'; then
    print_success "API returned success"
    
    # Check for response field
    if echo "$RESPONSE" | grep -q '"response"'; then
        print_success "Response contains 'response' field"
        
        # Extract response text
        if [ "$USE_JQ" = true ]; then
            AI_RESPONSE=$(echo "$RESPONSE" | jq -r '.message.response // .response // "N/A"')
            echo ""
            print_info "AI Response Preview:"
            echo "  ${AI_RESPONSE:0:200}..."
        fi
    else
        print_error "Response missing 'response' field"
        print_warning "Frontend expects: {message: {response: '...'}}"
    fi
elif echo "$RESPONSE" | grep -q 'exception\|error'; then
    print_error "API returned an error"
    
    if echo "$RESPONSE" | grep -q 'AttributeError.*no attribute.*chat'; then
        print_error "Backend endpoint not implemented!"
        echo ""
        echo "Solution:"
        echo "1. SSH into your server"
        echo "2. Create ~/frappe-bench/apps/ai_assistant/ai_assistant/api.py"
        echo "3. Add the chat() function"
        echo "4. See: DEPLOYMENT_INSTRUCTIONS.md"
    fi
    exit 1
else
    print_warning "Unexpected response format"
fi
echo ""

# Test 3: Test Chat Endpoint (Conversation with History)
echo "============================================"
echo "Step 4: Test Conversation History"
echo "============================================"
echo ""

print_info "Testing with conversation history..."

HISTORY_PAYLOAD='{
  "messages": [
    {"role": "user", "content": "What is 2+2?"},
    {"role": "assistant", "content": "2+2 equals 4."},
    {"role": "user", "content": "What about 3+3?"}
  ],
  "conversation_id": "test-conversation-123",
  "mode": "ask"
}'

echo "Request:"
echo "$HISTORY_PAYLOAD" | if [ "$USE_JQ" = true ]; then jq .; else cat; fi
echo ""

RESPONSE=$(curl -s -X POST "${API_URL}${API_ENDPOINT}" \
  -H "Content-Type: application/json" \
  -H "Cookie: $COOKIE_HEADER" \
  -d "$HISTORY_PAYLOAD")

echo "Response:"
if [ "$USE_JQ" = true ]; then
    echo "$RESPONSE" | jq .
else
    echo "$RESPONSE"
fi
echo ""

if echo "$RESPONSE" | grep -q '"success".*true'; then
    print_success "Conversation history test passed"
    
    # Check conversation ID
    if echo "$RESPONSE" | grep -q '"conversation_id"'; then
        print_success "Conversation ID preserved"
    fi
else
    print_error "Conversation history test failed"
fi
echo ""

# Test 4: Test Tool Call (Agent Mode)
echo "============================================"
echo "Step 5: Test Tool Call (Agent Mode)"
echo "============================================"
echo ""

print_info "Testing agent mode with tool call request..."

TOOL_PAYLOAD='{
  "messages": [
    {"role": "user", "content": "Create a file called test.txt with content: Hello World"}
  ],
  "mode": "agent"
}'

echo "Request:"
echo "$TOOL_PAYLOAD" | if [ "$USE_JQ" = true ]; then jq .; else cat; fi
echo ""

RESPONSE=$(curl -s -X POST "${API_URL}${API_ENDPOINT}" \
  -H "Content-Type: application/json" \
  -H "Cookie: $COOKIE_HEADER" \
  -d "$TOOL_PAYLOAD")

echo "Response:"
if [ "$USE_JQ" = true ]; then
    echo "$RESPONSE" | jq .
else
    echo "$RESPONSE"
fi
echo ""

if echo "$RESPONSE" | grep -q '"success".*true'; then
    print_success "Agent mode test passed"
    
    # Check for tool call in response
    if echo "$RESPONSE" | grep -q 'tool_call'; then
        print_success "AI returned tool call as expected"
        print_info "Frontend should parse and execute this tool call"
    else
        print_warning "No tool call found (AI may have just explained)"
    fi
else
    print_error "Agent mode test failed"
fi
echo ""

# Summary
echo "============================================"
echo "📊 Test Summary"
echo "============================================"
echo ""

if echo "$RESPONSE" | grep -q '"success".*true'; then
    print_success "Backend API is working!"
    echo ""
    echo "Next steps:"
    echo "1. ✅ Backend is responding correctly"
    echo "2. ✅ Try using the VSCode extension"
    echo "3. ✅ Check Extension Host logs if issues persist"
    echo ""
    echo "If VSCode extension still shows 'No AI response':"
    echo "- Check session cookies in VSCode"
    echo "- Verify API URL in settings"
    echo "- Check browser console for errors"
else
    print_error "Backend API has issues"
    echo ""
    echo "Troubleshooting:"
    echo "1. Check DEPLOYMENT_INSTRUCTIONS.md"
    echo "2. Verify api.py file exists on server"
    echo "3. Check Frappe logs: tail -f ~/frappe-bench/sites/*/logs/web.log"
    echo "4. Ensure OpenAI library installed: bench pip install openai"
    echo "5. Verify API key in site_config.json"
fi

echo ""
echo "============================================"
echo "Test completed at $(date)"
echo "============================================"
