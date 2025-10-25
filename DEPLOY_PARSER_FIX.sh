#!/bin/bash

##############################################################################
# PARSER BUG FIX DEPLOYMENT SCRIPT
#
# This script fixes the critical parser bug in the backend
# Location: api/__init__.py line ~3200
# Time: 10 minutes
##############################################################################

set -e  # Exit on error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

SERVER="frappe@oropendola.ai"
REMOTE_PATH="/home/frappe/frappe-bench/apps/ai_assistant"
API_FILE="ai_assistant/api/__init__.py"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}PARSER BUG FIX DEPLOYMENT${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Step 1: Backup current file
echo -e "${YELLOW}Step 1/5: Creating backup...${NC}"
ssh $SERVER << 'ENDSSH'
cd ~/frappe-bench/apps/ai_assistant
BACKUP_FILE="ai_assistant/api/__init__.py.backup.$(date +%Y%m%d_%H%M%S)"
cp ai_assistant/api/__init__.py "$BACKUP_FILE"
echo "✓ Backup created: $BACKUP_FILE"
ls -lh "$BACKUP_FILE"
ENDSSH

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Backup complete${NC}"
else
    echo -e "${RED}✗ Backup failed${NC}"
    exit 1
fi

echo ""

# Step 2: Find the function line number
echo -e "${YELLOW}Step 2/5: Locating _parse_tool_calls function...${NC}"
LINE_NUM=$(ssh $SERVER "grep -n 'def _parse_tool_calls' ~/frappe-bench/apps/ai_assistant/ai_assistant/api/__init__.py | cut -d':' -f1")
echo -e "✓ Found at line: ${GREEN}${LINE_NUM}${NC}"

echo ""

# Step 3: Upload the fix
echo -e "${YELLOW}Step 3/5: Uploading parser fix...${NC}"
scp PARSER_BUG_FIX.py $SERVER:/tmp/parser_fix.py

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Fix uploaded${NC}"
else
    echo -e "${RED}✗ Upload failed${NC}"
    exit 1
fi

echo ""

# Step 4: Apply the fix using Python
echo -e "${YELLOW}Step 4/5: Applying fix to api/__init__.py...${NC}"
ssh $SERVER << 'ENDSSH'
cd ~/frappe-bench/apps/ai_assistant

# Read the current file
python3 << 'EOFPYTHON'
import re

# Read current file
with open('ai_assistant/api/__init__.py', 'r') as f:
    content = f.read()

# Read the fix
with open('/tmp/parser_fix.py', 'r') as f:
    fix_content = f.read()

# Extract just the two functions from the fix
fix_pattern = r'(def _parse_tool_calls.*?def _fix_json_newlines.*?return json_str_fixed)'
fix_match = re.search(fix_pattern, fix_content, re.DOTALL)

if not fix_match:
    print("✗ Could not extract fix functions")
    exit(1)

new_functions = fix_match.group(1)

# Find and replace the old _parse_tool_calls function
# Match from "def _parse_tool_calls" to the next function definition or class
old_pattern = r'(def _parse_tool_calls\(.*?\n(?:.*?\n)*?)(?=\ndef [a-z_]|^class )'
replacement_count = 0

def replace_func(match):
    global replacement_count
    replacement_count += 1
    return new_functions + '\n\n'

content_new = re.sub(old_pattern, replace_func, content, count=1, flags=re.MULTILINE)

if replacement_count == 0:
    print("✗ Could not find _parse_tool_calls function to replace")
    exit(1)

# Write back
with open('ai_assistant/api/__init__.py', 'w') as f:
    f.write(content_new)

print(f"✓ Successfully replaced _parse_tool_calls function")
print(f"✓ Added _fix_json_newlines helper function")
EOFPYTHON

ENDSSH

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Fix applied successfully${NC}"
else
    echo -e "${RED}✗ Fix application failed${NC}"
    echo -e "${YELLOW}You may need to apply the fix manually${NC}"
    exit 1
fi

echo ""

# Step 5: Restart backend
echo -e "${YELLOW}Step 5/5: Restarting backend services...${NC}"
ssh $SERVER << 'ENDSSH'
cd ~/frappe-bench
echo "Restarting Frappe..."
bench restart
echo "✓ Backend restarted"
ENDSSH

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Backend restarted${NC}"
else
    echo -e "${RED}✗ Restart failed${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ PARSER BUG FIX DEPLOYED SUCCESSFULLY${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Test tool calling functionality"
echo "2. Check logs: ssh $SERVER 'tail -f ~/frappe-bench/logs/oropendola.ai.log'"
echo "3. Look for: '[Tool Call Parser] SUCCESS: Parsed X tool calls total'"
echo ""
echo -e "${GREEN}After verification, proceed with Phase 2:${NC}"
echo "bash DEPLOY_TO_PRODUCTION.sh"
echo ""
