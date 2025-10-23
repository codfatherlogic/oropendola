#!/bin/bash
# ============================================
# Backend Deployment Script for Oropendola AI
# ============================================
# This script deploys the image attachment and tool call fixes
# to your Frappe backend server
#
# PREREQUISITES:
# 1. SSH access to backend server
# 2. Frappe bench installed at ~/frappe-bench/
# 3. ai_assistant app exists
# 4. Python 3.8+ backend
#
# USAGE:
# 1. Update SERVER_HOST, SERVER_USER, and FRAPPE_APP_PATH below
# 2. Run: bash BACKEND_DEPLOYMENT_GUIDE.sh
# ============================================

set -e  # Exit on error

# ============================================
# CONFIGURATION - UPDATE THESE
# ============================================
SERVER_HOST="oropendola.ai"
SERVER_USER="your_username"
FRAPPE_APP_PATH="~/frappe-bench/apps/ai_assistant/ai_assistant"

# ============================================
# COLOR OUTPUT
# ============================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "============================================"
echo "  Oropendola Backend Deployment Script"
echo "============================================"
echo -e "${NC}"

# ============================================
# STEP 1: BACKUP CURRENT API.PY
# ============================================
echo -e "${YELLOW}[Step 1/5] Backing up current api.py...${NC}"

ssh ${SERVER_USER}@${SERVER_HOST} << 'ENDSSH'
cd ~/frappe-bench/apps/ai_assistant/ai_assistant/
BACKUP_FILE="api.py.backup.$(date +%Y%m%d_%H%M%S)"
cp api.py "$BACKUP_FILE"
echo "✅ Backup created: $BACKUP_FILE"
ls -lh api.py.backup.* | tail -3
ENDSSH

echo -e "${GREEN}✅ Backup complete${NC}\n"

# ============================================
# STEP 2: CHECK CURRENT CODE FOR ISSUES
# ============================================
echo -e "${YELLOW}[Step 2/5] Checking for known issues...${NC}"

ssh ${SERVER_USER}@${SERVER_HOST} << 'ENDSSH'
cd ~/frappe-bench/apps/ai_assistant/ai_assistant/

echo "Checking for image attachment bug..."
if grep -q "attachments.strip()" api.py; then
    echo "❌ Found bug: attachments.strip() (will be fixed)"
else
    echo "✅ No attachments.strip() found (might already be fixed or different code)"
fi

echo ""
echo "Checking for tool call stripping..."
if grep -q "strip_tool_call_blocks" api.py; then
    echo "✅ Tool call stripping already implemented"
else
    echo "❌ Tool call stripping missing (will be added)"
fi
ENDSSH

echo -e "${GREEN}✅ Check complete${NC}\n"

# ============================================
# STEP 3: SHOW FIX SUMMARY
# ============================================
echo -e "${YELLOW}[Step 3/5] Fixes to apply:${NC}"
echo ""
echo "📋 Fix #1: Image Attachment Processing"
echo "   - Add process_image_attachments() function"
echo "   - Add build_multipart_message() function"
echo "   - Update chat_completion() endpoint"
echo ""
echo "📋 Fix #2: Tool Call Block Stripping"
echo "   - Add strip_tool_call_blocks() function"
echo "   - Update _parse_tool_calls() to clean text"
echo ""

# ============================================
# MANUAL DEPLOYMENT INSTRUCTIONS
# ============================================
echo -e "${BLUE}"
echo "============================================"
echo "  MANUAL DEPLOYMENT REQUIRED"
echo "============================================"
echo -e "${NC}"
echo ""
echo "Due to the complexity of editing Python code remotely,"
echo "please apply the fixes manually using these steps:"
echo ""
echo -e "${GREEN}1. SSH to backend:${NC}"
echo "   ssh ${SERVER_USER}@${SERVER_HOST}"
echo ""
echo -e "${GREEN}2. Navigate to app directory:${NC}"
echo "   cd ~/frappe-bench/apps/ai_assistant/ai_assistant/"
echo ""
echo -e "${GREEN}3. Edit api.py:${NC}"
echo "   nano api.py"
echo ""
echo -e "${GREEN}4. Apply fixes from these files:${NC}"
echo "   - BACKEND_IMAGE_ATTACHMENT_FIX.py (lines 34-112)"
echo "   - BACKEND_TOOL_CALL_FIX.py (lines 27-127)"
echo ""
echo -e "${GREEN}5. Test the fixes:${NC}"
echo "   bench console"
echo "   >>> from ai_assistant.api import test_image_processing"
echo "   >>> test_image_processing()"
echo ""
echo -e "${GREEN}6. Restart backend:${NC}"
echo "   bench restart"
echo ""
echo -e "${GREEN}7. Test in VS Code:${NC}"
echo "   - Paste an image in Oropendola chat"
echo "   - Send message asking about the image"
echo "   - Should work without errors ✅"
echo ""

# ============================================
# VERIFICATION SCRIPT
# ============================================
echo -e "${YELLOW}[Step 4/5] Verification script ready${NC}"
echo ""
echo "After applying fixes, run this on the server to verify:"
echo ""
cat << 'EOF'
#!/bin/bash
# Run on backend server after applying fixes

cd ~/frappe-bench/apps/ai_assistant/ai_assistant/

echo "Verifying fixes..."

# Check if functions exist
grep -q "def process_image_attachments" api.py && echo "✅ process_image_attachments() found" || echo "❌ Missing"
grep -q "def build_multipart_message" api.py && echo "✅ build_multipart_message() found" || echo "❌ Missing"
grep -q "def strip_tool_call_blocks" api.py && echo "✅ strip_tool_call_blocks() found" || echo "❌ Missing"

echo ""
echo "Testing functions..."
bench console << PYTHON
from ai_assistant.api import test_image_processing
try:
    test_image_processing()
    print("✅ All tests passed!")
except Exception as e:
    print(f"❌ Test failed: {e}")
PYTHON

echo ""
echo "Checking logs for errors..."
tail -20 ~/frappe-bench/logs/$(hostname).log | grep -i "error\|exception" || echo "✅ No recent errors"

echo ""
echo "Verification complete!"
EOF

echo ""

# ============================================
# STEP 5: DEPLOYMENT CHECKLIST
# ============================================
echo -e "${YELLOW}[Step 5/5] Deployment Checklist:${NC}"
echo ""
echo "Before deploying:"
echo "  [ ] Backup created (api.py.backup.*)"
echo "  [ ] Have BACKEND_IMAGE_ATTACHMENT_FIX.py file open"
echo "  [ ] Have BACKEND_TOOL_CALL_FIX.py file open"
echo "  [ ] SSH access to backend server works"
echo ""
echo "During deployment:"
echo "  [ ] Add process_image_attachments() function"
echo "  [ ] Add build_multipart_message() function"
echo "  [ ] Add strip_tool_call_blocks() function"
echo "  [ ] Update chat_completion() to use new functions"
echo "  [ ] Update _parse_tool_calls() to strip blocks"
echo ""
echo "After deployment:"
echo "  [ ] Run verification script (above)"
echo "  [ ] Restart bench: bench restart"
echo "  [ ] Test image pasting in VS Code"
echo "  [ ] Check chat UI - no raw tool_call blocks"
echo "  [ ] Monitor logs: tail -f ~/frappe-bench/logs/*.log"
echo ""

# ============================================
# QUICK REFERENCE
# ============================================
echo -e "${BLUE}"
echo "============================================"
echo "  QUICK REFERENCE"
echo "============================================"
echo -e "${NC}"
echo ""
echo "Backend server: ${SERVER_HOST}"
echo "App path: ${FRAPPE_APP_PATH}"
echo ""
echo "Key files to reference:"
echo "  - BACKEND_IMAGE_ATTACHMENT_FIX.py (image processing)"
echo "  - BACKEND_TOOL_CALL_FIX.py (tool call stripping)"
echo "  - IMAGE_ATTACHMENT_ANALYSIS.md (detailed explanation)"
echo ""
echo "After deployment, test with:"
echo "  1. Paste image in VS Code Oropendola chat"
echo "  2. Ask: 'What's in this image?'"
echo "  3. Should see AI analysis, not error"
echo ""
echo "Common issues:"
echo "  - Still seeing .strip() error → Fix not applied correctly"
echo "  - Seeing tool_call blocks → strip_tool_call_blocks() not called"
echo "  - Images not analyzed → Need vision-enabled AI model (GPT-4V/Claude 3)"
echo ""

echo -e "${GREEN}"
echo "============================================"
echo "  Deployment guide complete!"
echo "============================================"
echo -e "${NC}"
echo ""
echo "Next steps:"
echo "1. Review BACKEND_IMAGE_ATTACHMENT_FIX.py"
echo "2. Review BACKEND_TOOL_CALL_FIX.py"
echo "3. SSH to backend and apply fixes manually"
echo "4. Run verification script"
echo "5. Test in VS Code"
echo ""
echo "Need help? Check IMAGE_ATTACHMENT_ANALYSIS.md for details."
echo ""
