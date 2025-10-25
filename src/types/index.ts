/**
 * TypeScript Type Definitions for Oropendola AI Assistant
 * Version: 3.5.0
 *
 * This file contains all shared types used across the extension.
 */

// ============================================================================
// COMMAND VALIDATION TYPES
// ============================================================================

/**
 * Risk level for command execution
 */
export type RiskLevel = 'low' | 'medium' | 'high';

/**
 * Pattern for risk assessment
 */
export interface RiskPattern {
  pattern: RegExp;
  reason: string;
}

/**
 * Result of command validation
 */
export interface CommandValidationResult {
  allowed: boolean;
  requiresConfirmation: boolean;
  reason: string;
  riskLevel: RiskLevel;
  sanitized: string;
  timeout?: number;
}

/**
 * Result of risk assessment
 */
export interface RiskAssessment {
  level: RiskLevel;
  reason: string;
  details: string[];
  score: number;
}

/**
 * Configuration for command validator
 */
export interface CommandValidatorConfig {
  allowedCommands: string[];
  deniedCommands: string[];
  commandExecutionTimeout: number;
  requireConfirmation: boolean;
  alwaysAllowList: string[];
}

// ============================================================================
// BACKEND CONFIGURATION TYPES
// ============================================================================

/**
 * All API endpoints
 */
export interface BackendEndpoints {
  // Authentication
  login: string;
  logout: string;
  verifySession: string;

  // Chat & AI
  chat: string;
  chatStream: string;
  chatHistory: string;

  // User
  userInfo: string;
  userSettings: string;
  updateSettings: string;

  // Subscription
  checkSubscription: string;
  subscriptionInfo: string;

  // Workspace
  indexWorkspace: string;
  searchCode: string;
  workspaceMemory: string;

  // Files & Context
  uploadFile: string;
  analyzeFile: string;

  // Documents (Week 2.2)
  documents: {
    upload: string;
    status: string;
    get: string;
    analyze: string;
  };

  // Realtime
  socketIO: string;
  webSocket: string;
}

/**
 * Environment mode
 */
export type Environment = 'production' | 'development' | 'custom';

// ============================================================================
// REALTIME CONNECTION TYPES
// ============================================================================

/**
 * Connection state
 */
export type ConnectionState =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'error';

/**
 * Connection state data with metadata
 */
export interface ConnectionStateData {
  state: ConnectionState;
  attempt?: number;
  maxAttempts?: number;
  delay?: number;
  error?: string;
  giveUp?: boolean;
  timestamp?: number;
}

/**
 * Realtime message structure
 */
export interface RealtimeMessage {
  type: string;
  data: any;
  timestamp: number;
  id?: string;
}

/**
 * Socket.IO event types
 */
export type SocketEvent =
  | 'connect'
  | 'disconnect'
  | 'connect_error'
  | 'reconnect'
  | 'reconnect_attempt'
  | 'reconnect_failed'
  | 'ai_progress'
  | 'msgprint'
  | 'eval_js';

/**
 * Configuration for realtime manager
 */
export interface RealtimeManagerConfig {
  apiUrl: string;
  sessionCookies?: string;
  maxReconnectAttempts?: number;
  baseReconnectInterval?: number;
  maxReconnectInterval?: number;
  autoReconnect?: boolean;
}

// ============================================================================
// DOCUMENT PROCESSING TYPES (Week 2.2)
// ============================================================================

/**
 * Supported document types
 */
export type DocumentType = 'pdf' | 'docx' | 'xlsx' | 'pptx' | 'html' | 'txt' | 'md';

/**
 * Document metadata
 */
export interface DocumentMetadata {
  // Basic file info
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  documentType: DocumentType;

  // Legacy fields (for backward compatibility)
  type?: DocumentType;
  size?: number;

  // Content info
  pageCount?: number;
  pages?: number; // Alias for pageCount
  wordCount?: number;

  // Excel-specific
  sheets?: string[];
  sheetCount?: number;

  // Metadata
  language?: string;
  author?: string;
  title?: string;
  description?: string;
  subject?: string;
  keywords?: string[];

  // Dates
  created?: Date;
  modified?: Date;
  createdAt?: Date;
  modifiedAt?: Date;

  // Other
  encoding?: string;
}

/**
 * Processed document result
 */
export interface ProcessedDocument {
  content: string;
  metadata: DocumentMetadata;
  images?: DocumentImage[];
  tables?: DocumentTable[];
  links?: string[];
  headings?: DocumentHeading[];
}

/**
 * Image extracted from document
 */
export interface DocumentImage {
  id?: string;
  url: string; // URL or base64 data URI
  data?: string; // base64 (legacy)
  caption?: string; // Alt text or caption
  mimeType?: string;
  width?: number;
  height?: number;
  page?: number;
  index?: number;
}

/**
 * Table extracted from document
 */
export interface DocumentTable {
  id?: string;
  headers: string[];
  rows: string[][];
  caption?: string; // Table caption
  page?: number;
}

/**
 * Heading extracted from document
 */
export interface DocumentHeading {
  level: number;
  text: string;
  page?: number;
}

/**
 * Document processing options
 */
export interface DocumentProcessingOptions {
  analyzeWithAI?: boolean;
  analysisType?: 'summary' | 'comprehensive' | 'keywords' | 'entities';
  extractImages?: boolean;
  extractTables?: boolean;
  extractLinks?: boolean;
  extractHeadings?: boolean;
  ocr?: boolean;
  ocrLanguages?: string[];
}

/**
 * Document analysis result from AI
 */
export interface DocumentAnalysisResult {
  documentId?: string;
  summary?: string;
  keywords?: string[];
  entities?: Array<{ text: string; type: string; }>;
  sentiment?: {
    score: number;
    label: 'positive' | 'negative' | 'neutral';
  };
  topics?: string[];
  language?: string;
  readability?: {
    score: number;
    grade: string;
  };
}

// ============================================================================
// INTERNATIONALIZATION TYPES (Week 3.1)
// ============================================================================

/**
 * Supported languages (Week 3.1)
 */
export type SupportedLanguage = 'en' | 'es' | 'fr' | 'de' | 'ar';

/**
 * Translation keys structure
 */
export interface TranslationKeys {
  [key: string]: string | TranslationKeys;
}

/**
 * Language metadata
 */
export interface LanguageInfo {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  rtl: boolean;
}

/**
 * i18n configuration
 */
export interface I18nConfig {
  defaultLanguage: SupportedLanguage;
  fallbackLanguage: SupportedLanguage;
  supportedLanguages: SupportedLanguage[];
  detectLanguage: boolean;
}

// ============================================================================
// VECTOR DATABASE TYPES (Week 3.2)
// ============================================================================

/**
 * Vector entry for storage
 */
export interface VectorEntry {
  id: string;
  content: string;
  embedding: number[];
  metadata: Record<string, any>;
  type?: 'code' | 'document' | 'memory';
  similarity?: number;
  timestamp?: Date;
}

/**
 * Vector search result
 */
export interface VectorSearchResult {
  id: string;
  content: string;
  similarity: number;
  metadata: Record<string, any>;
  type?: string;
  timestamp?: Date;
  filePath?: string;
  lineNumber?: number;
}

/**
 * Vector indexing options
 */
export interface VectorIndexOptions {
  filePath?: string;
  metadata?: Record<string, any>;
  type?: 'code' | 'document' | 'memory';
  workspaceId?: string;
  userId?: string;
}

/**
 * Vector search options
 */
export interface VectorSearchOptions {
  limit?: number;
  type?: 'code' | 'document' | 'memory';
  workspaceId?: string;
  userId?: string;
  minSimilarity?: number;
}

/**
 * Conversation memory entry
 */
export interface ConversationMemory {
  id: string;
  conversation: Array<{ role: string; content: string }>;
  summary: string;
  timestamp: Date;
  relevance: number;
}

/**
 * Vector database statistics
 */
export interface VectorDBStats {
  totalVectors: number;
  totalMemories: number;
  vectorsByType: Record<string, number>;
  averageEmbeddingTime: number;
  lastIndexed?: Date;
}

/**
 * Embedding configuration
 */
export interface EmbeddingConfig {
  model: string;
  dimensions: number;
  provider: 'openai' | 'sentence-transformers' | 'custom';
}

// Legacy types for backward compatibility
export type SearchResult = VectorSearchResult;
export type SearchOptions = VectorSearchOptions;
export type MemoryEntry = ConversationMemory;

// ============================================================================
// API REQUEST/RESPONSE TYPES
// ============================================================================

/**
 * Generic API response
 */
export interface ApiResponse<T = any> {
  success: boolean;
  message: T;
  error?: string;
  timestamp?: number;
}

/**
 * API error
 */
export interface ApiError {
  code: string;
  message: string;
  details?: any;
  timestamp: number;
}

/**
 * Chat message
 */
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  images?: string[];
  toolName?: string | null;
}

/**
 * Chat request
 */
export interface ChatRequest {
  message: string;
  context?: any;
  images?: string[];
  stream?: boolean;
}

/**
 * Chat response
 */
export interface ChatResponse {
  response: string;
  conversationId?: string;
  tokensUsed?: number;
  model?: string;
}

// ============================================================================
// WORKSPACE TYPES
// ============================================================================

/**
 * Workspace file
 */
export interface WorkspaceFile {
  path: string;
  relativePath: string;
  type: string;
  size: number;
  modified: Date;
}

/**
 * Workspace index entry
 */
export interface WorkspaceIndexEntry {
  file: WorkspaceFile;
  symbols: CodeSymbol[];
  imports: string[];
  exports: string[];
}

/**
 * Code symbol (function, class, etc.)
 */
export interface CodeSymbol {
  name: string;
  kind: 'function' | 'class' | 'variable' | 'interface' | 'type';
  line: number;
  signature?: string;
}

// ============================================================================
// CONFIGURATION TYPES
// ============================================================================

/**
 * Extension configuration
 */
export interface ExtensionConfig {
  // Backend
  serverUrl: string;
  apiRequestTimeout: number;

  // Security
  allowedCommands: string[];
  deniedCommands: string[];
  commandExecutionTimeout: number;
  commandRequireConfirmation: boolean;

  // Connection
  maxReconnectAttempts: number;
  reconnectInterval: number;

  // Language
  language: SupportedLanguage;

  // Features
  enableDocumentProcessing: boolean;
  enableVectorSearch: boolean;
  enableMemory: boolean;
}

// ============================================================================
// EVENT TYPES
// ============================================================================

/**
 * Custom event data
 */
export interface CustomEventData {
  type: string;
  payload: any;
  timestamp: number;
}

/**
 * Progress event
 */
export interface ProgressEvent {
  type: 'start' | 'progress' | 'complete' | 'error';
  message: string;
  percentage?: number;
  total?: number;
  current?: number;
}

// ============================================================================
// TERMINAL TYPES (Week 7)
// ============================================================================

/**
 * Terminal command record
 */
export interface TerminalCommand {
  id?: string;
  command: string;
  workspaceId?: string;
  cwd?: string;
  shell?: string;
  exitCode?: number;
  durationMs?: number;
  output?: string;
  error?: string;
  timestamp?: Date;
}

/**
 * Terminal history query options
 */
export interface TerminalHistoryOptions {
  workspaceId?: string;
  shell?: string;
  exitCode?: number;
  search?: string;
  limit?: number;
  offset?: number;
}

/**
 * Terminal context for AI suggestions
 */
export interface TerminalContext {
  cwd: string;
  shell: string;
  os: string;
  recentCommands?: string[];
}

/**
 * Terminal command suggestion from AI
 */
export interface TerminalSuggestion {
  command: string;
  explanation: string;
  confidence: number;
}

/**
 * Command explanation breakdown
 */
export interface CommandExplanation {
  summary: string;
  breakdown: Array<{
    part: string;
    meaning: string;
  }>;
}

/**
 * Command fix suggestion
 */
export interface CommandFix {
  originalCommand: string;
  fixedCommand: string;
  explanation: string;
}

/**
 * Terminal output analysis
 */
export interface OutputAnalysis {
  summary: string;
  warnings: string[];
  errors: string[];
  suggestions: string[];
}

// ============================================================================
// MARKETPLACE & PLUGINS TYPES (Week 8)
// ============================================================================

/**
 * Marketplace extension/plugin
 */
export interface MarketplaceExtension {
  id: string;
  extensionId: string;
  publisher: string;
  name: string;
  displayName: string;
  shortDescription: string;
  description: string;
  version: string;
  installs: number;
  downloads: number;
  rating: number;
  ratingCount: number;
  categories: string[];
  tags: string[];
  repository?: string;
  homepage?: string;
  iconUrl?: string;
  lastUpdated: Date;
  publishedDate: Date;
}

/**
 * Marketplace search options
 */
export interface MarketplaceSearchOptions {
  query?: string;
  category?: string;
  pageSize?: number;
  pageNumber?: number;
  sortBy?: 'Installs' | 'Rating' | 'Name' | 'PublishedDate' | 'UpdatedDate';
}

/**
 * Marketplace search result
 */
export interface MarketplaceSearchResult {
  extensions: MarketplaceExtension[];
  total: number;
  pageNumber: number;
  pageSize: number;
}

/**
 * Installed plugin info
 */
export interface InstalledPlugin {
  id: string;
  extensionId: string;
  name: string;
  displayName: string;
  version: string;
  publisher: string;
  enabled: boolean;
  installedAt: Date;
  lastUsedAt?: Date;
  path?: string;
}

/**
 * Plugin installation options
 */
export interface PluginInstallOptions {
  version?: string;
  source?: 'marketplace' | 'vsix' | 'custom';
  autoEnable?: boolean;
}

/**
 * Plugin categories
 */
export type PluginCategory =
  | 'Programming Languages'
  | 'Snippets'
  | 'Linters'
  | 'Themes'
  | 'Debuggers'
  | 'Formatters'
  | 'Keymaps'
  | 'SCM Providers'
  | 'Other'
  | 'Extension Packs'
  | 'Language Packs'
  | 'Data Science'
  | 'Machine Learning'
  | 'Visualization'
  | 'Notebooks'
  | 'Testing';

/**
 * Plugin review (for Phase 2 with custom backend)
 */
export interface PluginReview {
  reviewId: string;
  pluginId: string;
  userId: string;
  userName: string;
  rating: number;
  title: string;
  comment: string;
  version: string;
  helpfulCount: number;
  createdAt: Date;
  updatedAt?: Date;
}

/**
 * Plugin stats (for Phase 2)
 */
export interface PluginStats {
  totalDownloads: number;
  weeklyDownloads: number;
  activeUsers: number;
  averageRating: number;
  totalRatings: number;
}

// ============================================================================
// BROWSER AUTOMATION TYPES (Week 6)
// ============================================================================

/**
 * Browser session
 */
export interface BrowserSession {
  id: string;
  sessionName?: string;
  status: string;
  currentUrl?: string;
  pageTitle?: string;
  createdAt: Date;
  lastActivity: Date;
  viewportWidth: number;
  viewportHeight: number;
}

/**
 * Browser session options
 */
export interface BrowserSessionOptions {
  sessionName?: string;
  headless?: boolean;
  viewportWidth?: number;
  viewportHeight?: number;
  userAgent?: string;
  workspaceId?: string;
}

/**
 * Navigate options
 */
export interface NavigateOptions {
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle';
  timeout?: number;
}

/**
 * Click options
 */
export interface ClickOptions {
  timeout?: number;
}

/**
 * Type options
 */
export interface TypeOptions {
  delay?: number;
  timeout?: number;
}

/**
 * Select options
 */
export interface SelectOptions {
  timeout?: number;
}

/**
 * Scroll options
 */
export interface ScrollOptions {
  x?: number;
  y?: number;
}

/**
 * Screenshot options
 */
export interface ScreenshotOptions {
  fullPage?: boolean;
  format?: 'png' | 'jpeg';
  quality?: number;
}

/**
 * PDF options
 */
export interface PdfOptions {
  format?: 'A4' | 'Letter' | 'Legal' | 'Tabloid';
  printBackground?: boolean;
  margin?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
}

/**
 * Browser file (screenshot/PDF)
 */
export interface BrowserFile {
  id: string;
  sessionId: string;
  fileType: string;
  fileFormat: string;
  filePath: string;
  fileSize: number;
  width?: number;
  height?: number;
  url?: string;
  createdAt: Date;
  expiresAt?: Date;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Make all properties optional recursively
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Make all properties required recursively
 */
export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
};

/**
 * Pick properties by value type
 */
export type PickByValue<T, V> = Pick<
  T,
  { [K in keyof T]: T[K] extends V ? K : never }[keyof T]
>;

/**
 * Async function type
 */
export type AsyncFunction<T = any> = (...args: any[]) => Promise<T>;

/**
 * Callback function type
 */
export type Callback<T = void> = (error: Error | null, result?: T) => void;

// ============================================================================
// WEEK 11: CODE ACTIONS & ANALYSIS TYPES
// ============================================================================

/**
 * Type of code analysis
 */
export type AnalysisType = 'quality' | 'security' | 'performance' | 'style';

/**
 * Issue severity level
 */
export type IssueSeverity = 'critical' | 'high' | 'medium' | 'low' | 'info';

/**
 * Issue type
 */
export type IssueType = 'bug' | 'security' | 'performance' | 'style' | 'complexity' | 'maintainability';

/**
 * Code issue found during analysis
 */
export interface CodeIssue {
    issue_id?: string;
    issue_type: IssueType;
    severity: IssueSeverity;
    title: string;
    description: string;
    file_path?: string;
    line_start: number;
    line_end: number;
    code_snippet?: string;
    suggested_fix?: string;
    auto_fixable: boolean;
    cwe_id?: string;  // Common Weakness Enumeration
    cvss_score?: number;  // Common Vulnerability Scoring System
    references?: string[];
}

/**
 * Code analysis result
 */
export interface CodeAnalysisResult {
    success: boolean;
    analysis_id?: string;
    issues: CodeIssue[];
    suggestions: RefactoringSuggestion[];
    severity_breakdown: {
        critical: number;
        high: number;
        medium: number;
        low: number;
        info: number;
    };
    analysis_types: AnalysisType[];
    language: string;
    from_cache?: boolean;
    timestamp?: Date;
}

/**
 * Code analysis options
 */
export interface CodeAnalysisOptions {
    analysisTypes?: AnalysisType[];
    filePath?: string;
    workspaceId?: string;
    includeExplanations?: boolean;
    autoFix?: boolean;
}

/**
 * Refactoring suggestion
 */
export interface RefactoringSuggestion {
    suggestion_id?: string;
    refactor_type: string;  // extract_function, rename, simplify, optimize, etc.
    title: string;
    description: string;
    original_code: string;
    refactored_code: string;
    reasoning: string;
    impact: {
        readability?: number;  // -5 to +5
        performance?: number;  // -5 to +5
        complexity?: number;   // -5 to +5
    };
    confidence: number;  // 0.0 to 1.0
    status?: 'suggested' | 'accepted' | 'rejected' | 'applied';
}

/**
 * Security vulnerability
 */
export interface SecurityVulnerability {
    cve_id?: string;  // CVE identifier
    cwe_id?: string;  // CWE identifier
    title: string;
    description: string;
    severity: IssueSeverity;
    cvss_score?: number;  // 0.0 to 10.0
    affected_packages?: Array<{
        package: string;
        version_range: string;
    }>;
    fixed_in?: string;  // Version where it's fixed
    references?: string[];
    detected_at?: Date;
}

/**
 * Code explanation
 */
export interface CodeExplanation {
    summary: string;
    purpose: string;
    complexity: 'low' | 'medium' | 'high';
    breakdown: Array<{
        line_start: number;
        line_end: number;
        code: string;
        explanation: string;
    }>;
    patterns_used?: string[];  // Design patterns, idioms
    potential_issues?: string[];
    recommendations?: string[];
}

/**
 * Custom code action configuration
 */
export interface CustomCodeAction {
    action_id: string;
    action_name: string;
    description: string;
    trigger: {
        file_types?: string[];  // e.g., ['.py', '.js']
        patterns?: string[];    // Regex patterns
        conditions?: string[];  // Conditions to check
    };
    action_type: 'ai_prompt' | 'script' | 'api_call';
    action_config: any;  // Type depends on action_type
    visibility: 'private' | 'organization' | 'public';
    usage_count?: number;
}

/**
 * Performance profile result
 */
export interface PerformanceProfile {
    bottlenecks: Array<{
        line_start: number;
        line_end: number;
        description: string;
        impact: 'critical' | 'high' | 'medium' | 'low';
        suggestion: string;
    }>;
    optimizations: RefactoringSuggestion[];
    complexity_score: number;  // 1-10
    estimated_speedup?: number;  // Percentage
}

/**
 * Code quality metrics
 */
export interface CodeQualityMetrics {
    complexity: number;  // Cyclomatic complexity
    maintainability: number;  // 0-100
    testability: number;  // 0-100
    documentation_coverage?: number;  // 0-100
    code_smells?: Array<{
        type: string;
        description: string;
        location: { line: number; column: number };
    }>;
}

/**
 * Code review result
 */
export interface CodeReviewResult {
    score: number;  // 0-100
    summary: string;
    comments: Array<{
        line: number;
        severity: IssueSeverity;
        comment: string;
        suggestion?: string;
    }>;
    strengths: string[];
    improvements: string[];
    security_concerns?: string[];
}

// ============================================================================
// RE-EXPORTS
// ============================================================================

// Re-export VS Code types for convenience
export type { ExtensionContext, TextDocument, Uri, WebviewPanel } from 'vscode';
