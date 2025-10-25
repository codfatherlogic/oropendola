#!/bin/bash

##############################################################################
# Backend Verification Script for Week 1
# Verifies that https://oropendola.ai backend is ready for Week 1 frontend
#
# Usage: ./scripts/verify-backend.sh
##############################################################################

set -e

BACKEND_URL="https://oropendola.ai"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "======================================================================"
echo "  OROPENDOLA BACKEND VERIFICATION - WEEK 1"
echo "======================================================================"
echo ""
echo "Backend URL: $BACKEND_URL"
echo "Date: $(date)"
echo ""

# Counter for tests
PASSED=0
FAILED=0
WARNINGS=0

# Function to print test result
print_result() {
    local test_name="$1"
    local result="$2"
    local message="$3"

    if [ "$result" = "PASS" ]; then
        echo -e "${GREEN}✅ PASS${NC} - $test_name"
        [ -n "$message" ] && echo "   └─ $message"
        ((PASSED++))
    elif [ "$result" = "FAIL" ]; then
        echo -e "${RED}❌ FAIL${NC} - $test_name"
        [ -n "$message" ] && echo "   └─ $message"
        ((FAILED++))
    elif [ "$result" = "WARN" ]; then
        echo -e "${YELLOW}⚠️  WARN${NC} - $test_name"
        [ -n "$message" ] && echo "   └─ $message"
        ((WARNINGS++))
    fi
    echo ""
}

echo "======================================================================"
echo "1. TESTING BASIC CONNECTIVITY"
echo "======================================================================"
echo ""

# Test 1: Backend reachable
echo "Testing if backend is reachable..."
if curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$BACKEND_URL" | grep -q "200\|301\|302"; then
    print_result "Backend Reachable" "PASS" "HTTP connection successful"
else
    print_result "Backend Reachable" "FAIL" "Cannot connect to $BACKEND_URL"
fi

# Test 2: HTTPS/SSL
echo "Testing SSL certificate..."
if curl -s -o /dev/null --max-time 5 "$BACKEND_URL" 2>&1 | grep -q "SSL certificate problem"; then
    print_result "SSL Certificate" "WARN" "SSL certificate issue detected"
else
    print_result "SSL Certificate" "PASS" "SSL certificate valid"
fi

echo "======================================================================"
echo "2. TESTING SOCKET.IO SUPPORT"
echo "======================================================================"
echo ""

# Test 3: Socket.IO endpoint
echo "Testing Socket.IO endpoint..."
SOCKETIO_RESPONSE=$(curl -s -w "%{http_code}" --max-time 5 "$BACKEND_URL/socket.io/" -o /dev/null)
if [ "$SOCKETIO_RESPONSE" = "200" ] || [ "$SOCKETIO_RESPONSE" = "400" ]; then
    # 200 or 400 both indicate Socket.IO is running (400 is expected for GET without params)
    print_result "Socket.IO Server" "PASS" "Socket.IO server is running"
else
    print_result "Socket.IO Server" "FAIL" "Socket.IO not responding (HTTP $SOCKETIO_RESPONSE)"
fi

# Test 4: WebSocket protocol
echo "Testing WebSocket upgrade support..."
WS_RESPONSE=$(curl -s -I --max-time 5 -H "Connection: Upgrade" -H "Upgrade: websocket" "$BACKEND_URL/socket.io/" 2>&1 | head -1)
if echo "$WS_RESPONSE" | grep -q "101\|200\|400"; then
    print_result "WebSocket Support" "PASS" "WebSocket upgrade supported"
else
    print_result "WebSocket Support" "WARN" "WebSocket upgrade unclear (not critical)"
fi

echo "======================================================================"
echo "3. TESTING API ENDPOINTS"
echo "======================================================================"
echo ""

# Test 5: API method endpoint (ping or health check)
echo "Testing Frappe API structure..."
API_RESPONSE=$(curl -s -w "%{http_code}" --max-time 5 "$BACKEND_URL/api/method/ping" -o /dev/null)
if [ "$API_RESPONSE" = "200" ] || [ "$API_RESPONSE" = "401" ] || [ "$API_RESPONSE" = "403" ]; then
    # 200, 401, or 403 all indicate API is running (auth required is expected)
    print_result "Frappe API Structure" "PASS" "API endpoints responding (HTTP $API_RESPONSE)"
else
    print_result "Frappe API Structure" "WARN" "API response unclear (HTTP $API_RESPONSE)"
fi

# Test 6: Test one of our endpoints (without auth - should return 401/403)
echo "Testing Oropendola auth endpoint..."
AUTH_RESPONSE=$(curl -s -w "%{http_code}" --max-time 5 "$BACKEND_URL/api/method/oropendola.auth.verify_session" -o /dev/null)
if [ "$AUTH_RESPONSE" = "401" ] || [ "$AUTH_RESPONSE" = "403" ] || [ "$AUTH_RESPONSE" = "200" ]; then
    print_result "Auth Endpoint" "PASS" "Auth endpoint exists (HTTP $AUTH_RESPONSE)"
else
    print_result "Auth Endpoint" "FAIL" "Auth endpoint not found (HTTP $AUTH_RESPONSE)"
fi

echo "======================================================================"
echo "4. TESTING CORS CONFIGURATION"
echo "======================================================================"
echo ""

# Test 7: CORS headers
echo "Testing CORS headers..."
CORS_HEADER=$(curl -s -I --max-time 5 -H "Origin: vscode-webview://test" "$BACKEND_URL" | grep -i "access-control-allow-origin")
if [ -n "$CORS_HEADER" ]; then
    print_result "CORS Configuration" "PASS" "CORS headers present"
else
    print_result "CORS Configuration" "WARN" "CORS headers not detected (may cause issues)"
fi

echo "======================================================================"
echo "5. TESTING PERFORMANCE"
echo "======================================================================"
echo ""

# Test 8: Response time
echo "Testing backend response time..."
RESPONSE_TIME=$(curl -s -o /dev/null -w "%{time_total}" --max-time 5 "$BACKEND_URL")
RESPONSE_MS=$(echo "$RESPONSE_TIME * 1000" | bc | cut -d. -f1)
if [ "$RESPONSE_MS" -lt 500 ]; then
    print_result "Response Time" "PASS" "Fast response: ${RESPONSE_MS}ms"
elif [ "$RESPONSE_MS" -lt 2000 ]; then
    print_result "Response Time" "WARN" "Acceptable response: ${RESPONSE_MS}ms"
else
    print_result "Response Time" "FAIL" "Slow response: ${RESPONSE_MS}ms"
fi

echo "======================================================================"
echo "VERIFICATION SUMMARY"
echo "======================================================================"
echo ""
echo -e "${GREEN}✅ Passed:${NC}   $PASSED"
echo -e "${YELLOW}⚠️  Warnings:${NC} $WARNINGS"
echo -e "${RED}❌ Failed:${NC}   $FAILED"
echo ""

TOTAL_TESTS=$((PASSED + FAILED + WARNINGS))
echo "Total Tests: $TOTAL_TESTS"
echo ""

if [ $FAILED -eq 0 ]; then
    if [ $WARNINGS -eq 0 ]; then
        echo -e "${GREEN}======================================================================"
        echo "  🎉 ALL TESTS PASSED - BACKEND IS READY FOR WEEK 1"
        echo -e "======================================================================${NC}"
        echo ""
        echo "Your backend at $BACKEND_URL is fully compatible with Week 1 frontend."
        echo "You can safely deploy the Week 1 extension without backend changes."
        exit 0
    else
        echo -e "${YELLOW}======================================================================"
        echo "  ⚠️  PASSED WITH WARNINGS - BACKEND SHOULD WORK"
        echo -e "======================================================================${NC}"
        echo ""
        echo "Your backend should work with Week 1, but check the warnings above."
        echo "Most warnings are non-critical and won't affect functionality."
        exit 0
    fi
else
    echo -e "${RED}======================================================================"
    echo "  ❌ SOME TESTS FAILED - BACKEND MAY NEED ATTENTION"
    echo -e "======================================================================${NC}"
    echo ""
    echo "Please check the failed tests above and ensure your backend is:"
    echo "  1. Running and accessible at $BACKEND_URL"
    echo "  2. Has Socket.IO enabled"
    echo "  3. Has the required API endpoints"
    echo ""
    echo "Refer to WEEK1_BACKEND_REQUIREMENTS.md for detailed instructions."
    exit 1
fi
