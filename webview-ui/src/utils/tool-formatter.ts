/**
 * Tool Formatter Utility
 * 
 * Formats tool calls for human-readable display in approval UI.
 */

import { ToolCall } from '../types/cline-message'

/**
 * Format a tool call for display in the approval UI
 */
export function formatToolDescription(tool: ToolCall): string {
  switch (tool.action) {
    case 'create_file':
      return formatCreateFile(tool)
    
    case 'modify_file':
    case 'edit_file':
      return formatEditFile(tool)
    
    case 'replace_string_in_file':
      return formatReplaceString(tool)
    
    case 'delete_file':
      return formatDeleteFile(tool)
    
    case 'read_file':
      return formatReadFile(tool)
    
    case 'run_terminal':
    case 'run_terminal_command':
    case 'execute_command':
    case 'run_command':  // ✅ Added for backend compatibility
      return formatRunCommand(tool)
    
    case 'semantic_search':
      return formatSemanticSearch(tool)
    
    case 'get_symbol_info':
      return formatSymbolInfo(tool)
    
    default:
      return formatGenericTool(tool)
  }
}

/**
 * Get a short summary for the approval button label
 */
export function getToolSummary(tool: ToolCall): string {
  switch (tool.action) {
    case 'create_file':
      return `Create ${getFileName(tool.path)}`
    
    case 'modify_file':
    case 'edit_file':
      return `Edit ${getFileName(tool.path)}`
    
    case 'replace_string_in_file':
      return `Replace in ${getFileName(tool.path)}`
    
    case 'delete_file':
      return `Delete ${getFileName(tool.path)}`
    
    case 'read_file':
      return `Read ${getFileName(tool.path)}`
    
    case 'run_terminal':
    case 'run_terminal_command':
    case 'execute_command':
    case 'run_command':  // ✅ Added for backend compatibility
      const cmd = tool.command || tool.content || ''
      return `Run: ${truncate(cmd, 30)}`
    
    default:
      return tool.action.replace(/_/g, ' ')
  }
}

// Helper formatters

function formatCreateFile(tool: ToolCall): string {
  const preview = tool.content ? `\n\n\`\`\`\n${truncate(tool.content, 300)}\n\`\`\`` : ''
  const desc = tool.description ? `\n\n${tool.description}` : ''
  return `**Create file**: \`${tool.path}\`${desc}${preview}`
}

function formatEditFile(tool: ToolCall): string {
  const preview = tool.content ? `\n\n\`\`\`\n${truncate(tool.content, 300)}\n\`\`\`` : ''
  const desc = tool.description ? `\n\n${tool.description}` : ''
  return `**Edit file**: \`${tool.path}\`${desc}${preview}`
}

function formatReplaceString(tool: ToolCall): string {
  const oldStr = tool.old_string ? truncate(tool.old_string, 150) : ''
  const newStr = tool.new_string ? truncate(tool.new_string, 150) : ''
  const desc = tool.description ? `\n\n${tool.description}` : ''
  
  return `**Replace in file**: \`${tool.path}\`${desc}

**Find**:
\`\`\`
${oldStr}
\`\`\`

**Replace with**:
\`\`\`
${newStr}
\`\`\``
}

function formatDeleteFile(tool: ToolCall): string {
  const desc = tool.description ? `\n\n${tool.description}` : ''
  return `**Delete file**: \`${tool.path}\`${desc}`
}

function formatReadFile(tool: ToolCall): string {
  const desc = tool.description ? `\n\n${tool.description}` : ''
  return `**Read file**: \`${tool.path}\`${desc}`
}

function formatRunCommand(tool: ToolCall): string {
  const cmd = tool.command || tool.content || ''
  const desc = tool.description ? `\n\n${tool.description}` : ''
  return `**Run command**:${desc}

\`\`\`bash
${cmd}
\`\`\``
}

function formatSemanticSearch(tool: ToolCall): string {
  const query = (tool as any).query || ''
  return `**Semantic search**: "${query}"`
}

function formatSymbolInfo(tool: ToolCall): string {
  const symbol = (tool as any).symbol || ''
  return `**Get symbol info**: \`${symbol}\``
}

function formatGenericTool(tool: ToolCall): string {
  const desc = tool.description ? `${tool.description}\n\n` : ''
  const params = Object.entries(tool)
    .filter(([key]) => !['action', 'id', 'description'].includes(key))
    .map(([key, value]) => `- **${key}**: ${JSON.stringify(value)}`)
    .join('\n')
  
  return `**${tool.action.replace(/_/g, ' ')}**

${desc}${params}`
}

// Helper functions

function truncate(str: string, maxLength: number): string {
  if (!str) return ''
  if (str.length <= maxLength) return str
  return str.substring(0, maxLength) + '...\n[truncated]'
}

function getFileName(path: string | undefined): string {
  if (!path) return 'file'
  const parts = path.split('/')
  return parts[parts.length - 1] || path
}
