/**
 * Exponential Backoff Utility
 *
 * Implements intelligent retry logic with exponential backoff.
 * Inspired by Kilos error recovery patterns.
 *
 * Features:
 * - Exponential delay increase
 * - Maximum retry limit
 * - Retryable error detection
 * - Backoff cap to prevent excessive waits
 *
 * @author Oropendola Team
 * @date 2025-10-23
 */

/**
 * Sleep for specified milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Check if an error is retryable
 *
 * @param {Error} error - Error object
 * @returns {boolean} True if error is retryable
 */
function isRetryableError(error) {
    if (!error) {
        return false;
    }

    const errorMessage = error.message?.toLowerCase() || '';
    const errorCode = error.code || '';

    // Network errors - retryable
    const networkErrors = [
        'econnrefused',
        'econnreset',
        'etimedout',
        'enotfound',
        'enetunreach',
        'ehostunreach'
    ];

    if (networkErrors.includes(errorCode.toLowerCase())) {
        return true;
    }

    // HTTP status code errors - retryable for certain codes
    const retryableStatusCodes = [408, 429, 500, 502, 503, 504];
    if (error.statusCode && retryableStatusCodes.includes(error.statusCode)) {
        return true;
    }

    // Message-based detection
    const retryableMessages = [
        'timeout',
        'timed out',
        'connection refused',
        'connection reset',
        'socket hang up',
        'econnrefused',
        'rate limit',
        'too many requests',
        'service unavailable',
        'bad gateway',
        'gateway timeout',
        'temporarily unavailable'
    ];

    if (retryableMessages.some(msg => errorMessage.includes(msg))) {
        return true;
    }

    return false;
}

/**
 * Execute a function with exponential backoff retry logic
 *
 * @param {Function} fn - Async function to execute
 * @param {Object} options - Retry options
 * @param {number} [options.maxRetries=3] - Maximum number of retries
 * @param {number} [options.initialDelay=1000] - Initial delay in ms
 * @param {number} [options.maxDelay=60000] - Maximum delay in ms (cap)
 * @param {number} [options.backoffMultiplier=2] - Delay multiplier for each retry
 * @param {Function} [options.onRetry] - Callback called before each retry
 * @returns {Promise<any>} Result of function execution
 */
async function withExponentialBackoff(fn, options = {}) {
    const {
        maxRetries = 3,
        initialDelay = 1000,
        maxDelay = 60000,
        backoffMultiplier = 2,
        onRetry = null
    } = options;

    let lastError;
    let delay = initialDelay;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            // Execute function
            const result = await fn();
            return result;

        } catch (error) {
            lastError = error;

            // Check if we should retry
            if (attempt === maxRetries) {
                console.error(`❌ [Exponential Backoff] Max retries (${maxRetries}) reached`);
                throw error;
            }

            if (!isRetryableError(error)) {
                console.error(`❌ [Exponential Backoff] Non-retryable error, failing immediately`);
                throw error;
            }

            // Calculate delay with exponential backoff
            const currentDelay = Math.min(delay, maxDelay);
            console.warn(`⚠️ [Exponential Backoff] Attempt ${attempt + 1}/${maxRetries + 1} failed, retrying in ${currentDelay}ms...`);
            console.warn(`   Error: ${error.message}`);

            // Call onRetry callback if provided
            if (onRetry) {
                await onRetry(attempt, currentDelay, error);
            }

            // Wait before retry
            await sleep(currentDelay);

            // Increase delay exponentially
            delay *= backoffMultiplier;
        }
    }

    // Should never reach here, but just in case
    throw lastError;
}

/**
 * Retry configuration presets
 */
const RetryPresets = {
    /**
     * Quick retry - for operations that should fail fast
     */
    QUICK: {
        maxRetries: 2,
        initialDelay: 500,
        maxDelay: 5000,
        backoffMultiplier: 2
    },

    /**
     * Standard retry - balanced approach
     */
    STANDARD: {
        maxRetries: 3,
        initialDelay: 1000,
        maxDelay: 30000,
        backoffMultiplier: 2
    },

    /**
     * Aggressive retry - for critical operations
     */
    AGGRESSIVE: {
        maxRetries: 5,
        initialDelay: 1000,
        maxDelay: 60000,
        backoffMultiplier: 2
    },

    /**
     * Patient retry - for operations that can wait
     */
    PATIENT: {
        maxRetries: 5,
        initialDelay: 2000,
        maxDelay: 120000,
        backoffMultiplier: 3
    }
};

/**
 * Execute function with retry preset
 *
 * @param {Function} fn - Async function to execute
 * @param {string} preset - Preset name ('QUICK' | 'STANDARD' | 'AGGRESSIVE' | 'PATIENT')
 * @param {Object} extraOptions - Additional options to override preset
 * @returns {Promise<any>} Result of function execution
 */
async function withRetryPreset(fn, preset = 'STANDARD', extraOptions = {}) {
    const presetConfig = RetryPresets[preset];
    if (!presetConfig) {
        throw new Error(`Unknown retry preset: ${preset}`);
    }

    return withExponentialBackoff(fn, {
        ...presetConfig,
        ...extraOptions
    });
}

module.exports = {
    withExponentialBackoff,
    withRetryPreset,
    RetryPresets,
    isRetryableError,
    sleep
};
