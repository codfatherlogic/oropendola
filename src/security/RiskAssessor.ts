import type { RiskLevel, RiskPattern, RiskAssessment } from '../types';

/**
 * RiskAssessor - Assesses the risk level of shell commands
 * Categorizes commands as low, medium, or high risk
 */
export class RiskAssessor {
  private highRiskPatterns: RiskPattern[];
  private mediumRiskPatterns: RiskPattern[];
  private lowRiskPatterns: RiskPattern[];

  constructor() {
    // Define risk patterns
    this.highRiskPatterns = [
      // Destructive commands
      { pattern: /\brm\b.*-r/i, reason: 'Recursive deletion' },
      { pattern: /\brm\b.*-f/i, reason: 'Forced deletion' },
      { pattern: /\bdd\b/i, reason: 'Direct disk write (dangerous)' },
      { pattern: /\bmkfs\b/i, reason: 'Filesystem formatting' },
      { pattern: /\bformat\b/i, reason: 'Disk formatting' },

      // System modification
      { pattern: /\bsudo\b/i, reason: 'Root/admin privileges' },
      { pattern: /\bchmod\s+777/i, reason: 'Insecure permissions' },
      { pattern: /\bchown\b/i, reason: 'Ownership changes' },

      // System control
      { pattern: /\bshutdown\b/i, reason: 'System shutdown' },
      { pattern: /\breboot\b/i, reason: 'System reboot' },
      { pattern: /\bhalt\b/i, reason: 'System halt' },
      { pattern: /\bpoweroff\b/i, reason: 'System power off' },

      // Process killing
      { pattern: /\bkill\s+-9/i, reason: 'Force kill processes' },
      { pattern: /\bkillall\b/i, reason: 'Kill all processes' },
      { pattern: /\bpkill\b/i, reason: 'Pattern-based process killing' },

      // Fork bombs and malicious code
      { pattern: /:\(\)\s*\{.*:\s*\|\s*:\s*&.*\}\s*;?\s*:/i, reason: 'Fork bomb detected' },
      { pattern: /while\s*true.*do/i, reason: 'Infinite loop' },

      // Network manipulation
      { pattern: /\biptables\b/i, reason: 'Firewall modification' },
      { pattern: /\bifconfig\b.*down/i, reason: 'Network interface down' },

      // Package manager with force
      { pattern: /\bapt-get\b.*--force/i, reason: 'Forced package operation' },
      { pattern: /\byum\b.*--force/i, reason: 'Forced package operation' },
      { pattern: /\bnpm\b.*--force/i, reason: 'Forced npm operation' }
    ];

    this.mediumRiskPatterns = [
      // File operations
      { pattern: /\brm\b/i, reason: 'File deletion' },
      { pattern: /\bmv\b/i, reason: 'File move/rename' },
      { pattern: /\bcp\b.*-r/i, reason: 'Recursive copy' },

      // Permission changes
      { pattern: /\bchmod\b/i, reason: 'Permission modification' },

      // Process management
      { pattern: /\bkill\b/i, reason: 'Process termination' },

      // Package management
      { pattern: /\bnpm\s+install\b/i, reason: 'Package installation' },
      { pattern: /\bnpm\s+ci\b/i, reason: 'Clean package install' },
      { pattern: /\byarn\s+install\b/i, reason: 'Package installation' },
      { pattern: /\bpip\s+install\b/i, reason: 'Python package install' },
      { pattern: /\bapt-get\s+install\b/i, reason: 'System package install' },

      // Git operations
      { pattern: /\bgit\s+push\b.*--force/i, reason: 'Force push (dangerous)' },
      { pattern: /\bgit\s+reset\b.*--hard/i, reason: 'Hard reset (loses changes)' },
      { pattern: /\bgit\s+clean\b.*-fd/i, reason: 'Force clean untracked files' },

      // Docker operations
      { pattern: /\bdocker\s+rm\b/i, reason: 'Docker container removal' },
      { pattern: /\bdocker\s+rmi\b/i, reason: 'Docker image removal' },
      { pattern: /\bdocker\s+system\s+prune/i, reason: 'Docker cleanup' },

      // Network operations
      { pattern: /\bcurl\b.*-X\s+(POST|PUT|DELETE)/i, reason: 'HTTP write operation' },
      { pattern: /\bwget\b/i, reason: 'File download' },

      // Script execution
      { pattern: /\bsh\b.*<\(/i, reason: 'Pipe to shell execution' },
      { pattern: /\bbash\b.*<\(/i, reason: 'Pipe to bash execution' }
    ];

    this.lowRiskPatterns = [
      // Read-only operations
      { pattern: /\bls\b/i, reason: 'List files' },
      { pattern: /\bpwd\b/i, reason: 'Print working directory' },
      { pattern: /\bcat\b/i, reason: 'Read file' },
      { pattern: /\bhead\b/i, reason: 'Read file head' },
      { pattern: /\btail\b/i, reason: 'Read file tail' },
      { pattern: /\bgrep\b/i, reason: 'Search text' },
      { pattern: /\bfind\b/i, reason: 'Find files' },

      // Git read operations
      { pattern: /\bgit\s+status\b/i, reason: 'Git status check' },
      { pattern: /\bgit\s+log\b/i, reason: 'Git log view' },
      { pattern: /\bgit\s+diff\b/i, reason: 'Git diff view' },
      { pattern: /\bgit\s+show\b/i, reason: 'Git show commit' },
      { pattern: /\bgit\s+branch\b(?!\s+-D)/i, reason: 'Git branch list' },

      // Version checks
      { pattern: /--version\b/i, reason: 'Version check' },
      { pattern: /\bnode\s+-v\b/i, reason: 'Node version' },
      { pattern: /\bnpm\s+-v\b/i, reason: 'NPM version' },
      { pattern: /\bpython\s+--version\b/i, reason: 'Python version' },

      // Package listing
      { pattern: /\bnpm\s+list\b/i, reason: 'List packages' },
      { pattern: /\bnpm\s+ls\b/i, reason: 'List packages' },
      { pattern: /\bpip\s+list\b/i, reason: 'List Python packages' },

      // Environment info
      { pattern: /\becho\b/i, reason: 'Print text' },
      { pattern: /\benv\b/i, reason: 'List environment' },
      { pattern: /\bprintenv\b/i, reason: 'Print environment' },

      // Docker read operations
      { pattern: /\bdocker\s+ps\b/i, reason: 'List containers' },
      { pattern: /\bdocker\s+images\b/i, reason: 'List images' },
      { pattern: /\bdocker\s+inspect\b/i, reason: 'Inspect container' }
    ];
  }

  /**
   * Assess the risk level of a command
   * @param command - The command to assess
   * @returns Risk assessment result
   */
  assess(command: string): RiskAssessment {
    if (!command || typeof command !== 'string') {
      return {
        level: 'high',
        reason: 'Invalid command',
        details: ['Command is not a valid string'],
        score: 90
      };
    }

    const details: string[] = [];

    // Check for high-risk patterns
    for (const { pattern, reason } of this.highRiskPatterns) {
      if (pattern.test(command)) {
        details.push(`⚠️  ${reason}`);
      }
    }

    if (details.length > 0) {
      return {
        level: 'high',
        reason: 'Command contains high-risk operations',
        details,
        score: 90
      };
    }

    // Check for medium-risk patterns
    for (const { pattern, reason } of this.mediumRiskPatterns) {
      if (pattern.test(command)) {
        details.push(`⚠  ${reason}`);
      }
    }

    if (details.length > 0) {
      return {
        level: 'medium',
        reason: 'Command contains medium-risk operations',
        details,
        score: 50
      };
    }

    // Check for low-risk patterns
    for (const { pattern, reason } of this.lowRiskPatterns) {
      if (pattern.test(command)) {
        details.push(`✓ ${reason}`);
      }
    }

    if (details.length > 0) {
      return {
        level: 'low',
        reason: 'Command appears safe',
        details,
        score: 20
      };
    }

    // Unknown command - treat as medium risk
    return {
      level: 'medium',
      reason: 'Unknown command - please review carefully',
      details: ['⚠ Command not in known patterns database'],
      score: 50
    };
  }

  /**
   * Get risk score (0-100)
   * @param command - The command
   * @returns Risk score
   */
  getRiskScore(command: string): number {
    const assessment = this.assess(command);
    return assessment.score;
  }

  /**
   * Check if command is safe to execute without confirmation
   * @param command - The command
   * @returns True if command is safe
   */
  isSafe(command: string): boolean {
    const assessment = this.assess(command);
    return assessment.level === 'low';
  }

  /**
   * Get all risk patterns for a specific level
   * @param level - Risk level
   * @returns Array of risk patterns
   */
  getPatternsByLevel(level: RiskLevel): RiskPattern[] {
    switch (level) {
      case 'high':
        return [...this.highRiskPatterns];
      case 'medium':
        return [...this.mediumRiskPatterns];
      case 'low':
        return [...this.lowRiskPatterns];
      default:
        return [];
    }
  }
}
