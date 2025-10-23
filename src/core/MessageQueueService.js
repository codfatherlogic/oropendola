/**
 * MessageQueueService
 *
 * Async message processing queue inspired by Kilos architecture.
 * Ensures messages are processed sequentially in order, preventing race conditions.
 *
 * Features:
 * - Sequential message processing
 * - State tracking (idle, processing, paused)
 * - Event emission for state changes
 * - Proper disposal and cleanup
 *
 * @author Oropendola Team
 * @date 2025-10-23
 */

const EventEmitter = require('events');

/**
 * Message queue states
 */
const QueueState = {
    IDLE: 'idle',           // No messages being processed
    PROCESSING: 'processing', // Currently processing a message
    PAUSED: 'paused'        // Queue is paused
};

/**
 * MessageQueueService - Async message processing queue
 *
 * Inspired by Kilos MessageQueueService pattern
 */
class MessageQueueService extends EventEmitter {
    constructor() {
        super();

        this.queue = [];              // Message queue
        this.state = QueueState.IDLE; // Current state
        this.currentMessage = null;   // Message being processed
        this.disposed = false;        // Disposal flag

        console.log('📬 [MessageQueueService] Initialized');
    }

    /**
     * Enqueue a message for processing
     *
     * @param {Object} message - Message to enqueue
     * @param {string} message.type - Message type (user, assistant, system)
     * @param {string} message.content - Message content
     * @param {Function} message.handler - Handler function to process message
     * @returns {Promise} Resolves when message is processed
     */
    async enqueue(message) {
        if (this.disposed) {
            throw new Error('Cannot enqueue message: MessageQueueService disposed');
        }

        console.log(`📥 [MessageQueueService] Enqueued message: ${message.type || 'unknown'}`);

        // Create promise that resolves when message is processed
        return new Promise((resolve, reject) => {
            const queueItem = {
                message,
                resolve,
                reject,
                enqueuedAt: Date.now()
            };

            this.queue.push(queueItem);
            this._emitStateChange();

            // Start processing if not already processing
            if (this.state === QueueState.IDLE) {
                this._processQueue().catch(error => {
                    console.error('[MessageQueueService] Queue processing error:', error);
                });
            }
        });
    }

    /**
     * Process the message queue
     * @private
     */
    async _processQueue() {
        if (this.state === QueueState.PROCESSING || this.state === QueueState.PAUSED) {
            return; // Already processing or paused
        }

        this.state = QueueState.PROCESSING;
        this._emitStateChange();

        while (this.queue.length > 0 && !this.disposed) {
            // Check if paused
            if (this.state === QueueState.PAUSED) {
                console.log('⏸️ [MessageQueueService] Queue paused');
                return;
            }

            const queueItem = this.queue.shift();
            this.currentMessage = queueItem.message;

            const waitTime = Date.now() - queueItem.enqueuedAt;
            console.log(`⚙️ [MessageQueueService] Processing message (waited ${waitTime}ms)`);

            try {
                // Call the message handler
                if (queueItem.message.handler) {
                    const result = await queueItem.message.handler(queueItem.message);
                    queueItem.resolve(result);
                } else {
                    queueItem.resolve();
                }

                console.log(`✅ [MessageQueueService] Message processed successfully`);

            } catch (error) {
                console.error(`❌ [MessageQueueService] Error processing message:`, error);
                queueItem.reject(error);

                // Emit error event
                this.emit('error', {
                    error,
                    message: queueItem.message
                });
            } finally {
                this.currentMessage = null;
            }
        }

        // All messages processed
        this.state = QueueState.IDLE;
        this._emitStateChange();

        console.log('✅ [MessageQueueService] Queue empty, returning to idle');
    }

    /**
     * Pause queue processing
     */
    pause() {
        if (this.state === QueueState.PROCESSING) {
            this.state = QueueState.PAUSED;
            this._emitStateChange();
            console.log('⏸️ [MessageQueueService] Queue paused');
        }
    }

    /**
     * Resume queue processing
     */
    async resume() {
        if (this.state === QueueState.PAUSED) {
            this.state = QueueState.IDLE;
            this._emitStateChange();
            console.log('▶️ [MessageQueueService] Queue resumed');

            // Restart processing
            await this._processQueue();
        }
    }

    /**
     * Get queue state
     * @returns {Object} Current state information
     */
    getState() {
        return {
            state: this.state,
            queueLength: this.queue.length,
            currentMessage: this.currentMessage,
            isProcessing: this.state === QueueState.PROCESSING,
            isPaused: this.state === QueueState.PAUSED
        };
    }

    /**
     * Clear the queue
     * Rejects all pending messages
     */
    clear() {
        console.log(`🗑️ [MessageQueueService] Clearing ${this.queue.length} pending messages`);

        const error = new Error('Queue cleared');

        while (this.queue.length > 0) {
            const item = this.queue.shift();
            item.reject(error);
        }

        this._emitStateChange();
    }

    /**
     * Emit state change event
     * @private
     */
    _emitStateChange() {
        this.emit('stateChanged', this.getState());
    }

    /**
     * Dispose of the queue service
     * Clears queue and removes all listeners
     */
    dispose() {
        if (this.disposed) {
            return;
        }

        console.log('🧹 [MessageQueueService] Disposing');

        this.disposed = true;
        this.clear();
        this.removeAllListeners();
        this.currentMessage = null;
        this.state = QueueState.IDLE;

        console.log('✅ [MessageQueueService] Disposed');
    }
}

module.exports = { MessageQueueService, QueueState };
