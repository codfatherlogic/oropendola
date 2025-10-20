/**
 * TypeScript-style type definitions for API responses
 * Using JSDoc for type safety in JavaScript
 */

/**
 * @typedef {Object} WorkspaceContext
 * @property {string} root
 * @property {string} name
 * @property {FileInfo[]} files
 * @property {GitStatus|null} git_status
 * @property {string[]} package_files
 * @property {string[]} config_files
 * @property {number} total_lines
 * @property {string[]} languages
 * @property {string|null} framework
 * @property {FileCount} file_count
 */

/**
 * @typedef {Object} FileInfo
 * @property {string} path
 * @property {'file'|'dir'} type
 * @property {number} size
 * @property {number} modified
 * @property {string} extension
 */

/**
 * @typedef {Object} GitStatus
 * @property {string} branch
 * @property {boolean} is_dirty
 * @property {string[]} untracked_files
 * @property {string[]} modified_files
 * @property {string} remote_url
 */

/**
 * @typedef {Object} FileCount
 * @property {number} total
 * @property {number} code
 * @property {number} config
 * @property {number} docs
 * @property {number} other
 */

/**
 * @typedef {Object} FileContext
 * @property {string} file_path
 * @property {string} language
 * @property {number} total_lines
 * @property {number} cursor_line
 * @property {Object} nearby_code
 * @property {string[]} nearby_code.lines
 * @property {number} nearby_code.start_line
 * @property {number} nearby_code.end_line
 * @property {number} file_size
 * @property {number} last_modified
 */

/**
 * @typedef {Object} GitChange
 * @property {string} file
 * @property {'modified'|'added'|'deleted'|'renamed'} change_type
 * @property {'modified'|'staged'|'untracked'} status
 * @property {string|null} diff
 * @property {number} additions
 * @property {number} deletions
 */

/**
 * @typedef {Object} GitDiffStats
 * @property {number} files_changed
 * @property {number} insertions
 * @property {number} deletions
 * @property {boolean} is_dirty
 */

/**
 * @typedef {Object} GitRemoteInfo
 * @property {string} name
 * @property {string} url
 * @property {string} fetch_url
 */

/**
 * @typedef {Object} GitCommit
 * @property {string} sha
 * @property {string} message
 * @property {string} author
 * @property {string} [email]
 * @property {string} date
 * @property {number} [files_changed]
 * @property {string} [diff]
 */

/**
 * @typedef {Object} GitBlame
 * @property {string} sha
 * @property {string} author
 * @property {string} email
 * @property {string} date
 * @property {string} message
 * @property {string} line
 */

/**
 * @typedef {Object} CodeSymbol
 * @property {string} name
 * @property {'function'|'class'|'variable'|'method'} type
 * @property {number} line
 * @property {number} column
 * @property {number} [end_line]
 * @property {number} depth
 * @property {string} [signature]
 * @property {string[]} [superclasses]
 */

/**
 * @typedef {Object} ChatMessage
 * @property {'user'|'assistant'|'system'} role
 * @property {string} content
 */

/**
 * @typedef {Object} ChatContext
 * @property {string} [workspacePath]
 * @property {string} [currentFile]
 * @property {number} [cursorLine]
 * @property {string} [selectedText]
 * @property {boolean} [includeWorkspaceContext]
 * @property {boolean} [includeGitContext]
 */

/**
 * @typedef {Object} ToolCall
 * @property {string} action
 * @property {string} path
 * @property {string} [content]
 * @property {string} description
 */

/**
 * @typedef {Object} ToolResult
 * @property {string} action
 * @property {'success'|'error'} status
 * @property {string} message
 */

/**
 * @typedef {Object} FileChangeCreated
 * @property {string} path
 * @property {number} line_count
 */

/**
 * @typedef {Object} FileChangeModified
 * @property {string} path
 * @property {number} lines_added
 * @property {number} lines_removed
 */

/**
 * @typedef {Object} CommandExecution
 * @property {string} command
 * @property {string} output
 * @property {number} exit_code
 */

/**
 * @typedef {Object} FileChanges
 * @property {FileChangeCreated[]} created
 * @property {FileChangeModified[]} modified
 * @property {string[]} deleted
 * @property {CommandExecution[]} commands
 */

/**
 * @typedef {Object} Todo
 * @property {string} id
 * @property {string} text
 * @property {string} type
 * @property {number} order
 * @property {boolean} completed
 * @property {string} [createdAt]
 */

/**
 * @typedef {Object} TodoStats
 * @property {number} total
 * @property {number} completed
 * @property {number} active
 */

/**
 * @typedef {Object} ChatResponse
 * @property {boolean} success
 * @property {'assistant'} role
 * @property {string} content
 * @property {string} response
 * @property {string} conversation_id
 * @property {number} message_count
 * @property {ToolCall[]} tool_calls
 * @property {ToolResult[]} tool_results
 * @property {FileChanges} file_changes
 * @property {Todo[]} todos
 * @property {TodoStats} todos_stats
 */

/**
 * @typedef {Object} InlineCompletion
 * @property {string} text
 * @property {'function'|'class'|'statement'|'ai_suggestion'|'loop'|'variable'} type
 * @property {'pattern'|'ai'} source
 */

/**
 * @typedef {Object} ApiResponse
 * @template T
 * @property {boolean} success
 * @property {string} [error]
 * @property {T} [data]
 * @property {string} [message]
 */

/**
 * @typedef {Object} ApiError
 * @property {string} code
 * @property {string} message
 * @property {*} [details]
 */

// Export types for use in other modules
module.exports = {
    // Types are defined via JSDoc, no runtime exports needed
};
