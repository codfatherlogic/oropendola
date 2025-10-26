/**
 * Unit Tests for MessageCondenser Service
 * 
 * Tests AI-powered message condensing with mocked Claude API.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MessageCondenser } from '../MessageCondenser';
import Anthropic from '@anthropic-ai/sdk';

// Mock Anthropic SDK
vi.mock('@anthropic-ai/sdk', () => {
    return {
        default: vi.fn().mockImplementation(() => ({
            messages: {
                create: vi.fn().mockResolvedValue({
                    content: [{
                        type: 'text',
                        text: 'Summarized conversation: User asked about API, assistant explained features.'
                    }],
                    usage: {
                        input_tokens: 100,
                        output_tokens: 50
                    }
                })
            }
        }))
    };
});

describe('MessageCondenser', () => {
    let condenser: MessageCondenser;
    let mockCreate: any;

    beforeEach(() => {
        // Reset mocks
        vi.clearAllMocks();
        
        condenser = new MessageCondenser('test-api-key');
        
        // Get mock after instance creation
        const MockedAnthropic = Anthropic as any;
        const instance = MockedAnthropic.mock.results[MockedAnthropic.mock.results.length - 1]?.value;
        if (instance) {
            mockCreate = instance.messages.create;
        }
    });

    describe('condenseMessages', () => {
        it('should condense messages with API key', async () => {
            const messages = [
                { type: 'ask', text: 'What is the API?' },
                { type: 'say', text: 'The API is a REST interface...' },
                { type: 'ask', text: 'How do I use it?' },
                { type: 'say', text: 'You can use it by...' }
            ];

            const result = await condenser.condenseMessages(messages);
            
            expect(result).toBeDefined();
            expect(result.length).toBeGreaterThan(0);
            // Should return condensed message
            expect(result[0].type).toBe('summary');
            expect(result[0].originalCount).toBe(4);
            expect(result[0].text).toContain('Summarized');
        });

        it('should return original messages without API key', async () => {
            const condenserNoKey = new MessageCondenser();
            const messages = [
                { type: 'ask', text: 'Test message' }
            ];

            const result = await condenserNoKey.condenseMessages(messages);
            expect(result).toEqual(messages);
        });

        it('should return empty array for empty input', async () => {
            const result = await condenser.condenseMessages([]);
            expect(result).toEqual([]);
        });

        it('should preserve code blocks', async () => {
            const messages = [
                { type: 'ask', text: 'How do I write a loop?' },
                { 
                    type: 'say', 
                    text: 'Here is an example:\n```javascript\nfor(let i=0; i<10; i++) {}\n```' 
                }
            ];

            const result = await condenser.condenseMessages(messages, {
                preserveCodeBlocks: true
            });

            expect(result).toBeDefined();
            expect(result.length).toBeGreaterThan(0);
        });

        it('should preserve error messages', async () => {
            const messages = [
                { type: 'ask', text: 'Why did this fail?' },
                { type: 'error', text: 'TypeError: Cannot read property' }
            ];

            const result = await condenser.condenseMessages(messages, {
                preserveErrors: true
            });

            expect(result).toBeDefined();
            // Should include both summary and preserved error
            expect(result.length).toBeGreaterThanOrEqual(1);
        });

        it('should preserve tool results', async () => {
            const messages = [
                { type: 'ask', text: 'List files' },
                { 
                    type: 'tool', 
                    tool: 'list_dir',
                    result: ['file1.js', 'file2.js']
                }
            ];

            const result = await condenser.condenseMessages(messages, {
                preserveToolResults: true
            });

            expect(result).toBeDefined();
            expect(result.length).toBeGreaterThanOrEqual(1);
        });
    });

    describe('extractPreservedContent', () => {
        it('should extract code blocks', () => {
            const messages = [
                { 
                    type: 'say', 
                    text: 'Here:\n```js\nconst x = 1;\n```' 
                }
            ];

            const preserved = condenser['extractPreservedContent'](messages, {
                preserveCodeBlocks: true,
                preserveErrors: true,
                preserveToolResults: true,
                targetReduction: 50,
                qualityThreshold: 0.7
            });

            expect(preserved).toBeDefined();
            expect(Array.isArray(preserved)).toBe(true);
        });

        it('should extract error messages', () => {
            const messages = [
                { type: 'error', text: 'Error occurred' }
            ];

            const preserved = condenser['extractPreservedContent'](messages, {
                preserveCodeBlocks: true,
                preserveErrors: true,
                preserveToolResults: true,
                targetReduction: 50,
                qualityThreshold: 0.7
            });

            expect(preserved).toBeDefined();
            expect(preserved.length).toBeGreaterThan(0);
        });

        it('should extract tool results', () => {
            const messages = [
                { 
                    type: 'tool_result',  // Match actual type from implementation
                    tool: 'read_file',
                    result: 'file contents'
                }
            ];

            const preserved = condenser['extractPreservedContent'](messages, {
                preserveCodeBlocks: true,
                preserveErrors: true,
                preserveToolResults: true,
                targetReduction: 50,
                qualityThreshold: 0.7
            });

            expect(preserved).toBeDefined();
            expect(preserved.length).toBeGreaterThan(0);
        });
    });

    describe('buildConversationText', () => {
        it('should build text from messages', () => {
            const messages = [
                { type: 'ask', text: 'Question 1' },
                { type: 'say', text: 'Answer 1' },
                { type: 'ask', text: 'Question 2' },
                { type: 'say', text: 'Answer 2' }
            ];

            const text = condenser['buildConversationText'](messages);

            expect(text).toBeDefined();
            expect(typeof text).toBe('string');
            expect(text).toContain('Question 1');
            expect(text).toContain('Answer 1');
        });

        it('should handle different message formats', () => {
            const messages = [
                { ask: 'What is this?' },
                { say: 'This is that' },
                { text: 'Plain text' }
            ];

            const text = condenser['buildConversationText'](messages);

            expect(text).toBeDefined();
            expect(text.length).toBeGreaterThan(0);
        });
    });

    describe('condenseBatches', () => {
        it('should handle large message arrays', async () => {
            const messages = Array.from({ length: 100 }, (_, i) => ({
                type: i % 2 === 0 ? 'ask' : 'say',
                text: `Message ${i}`
            }));

            const result = await condenser['condenseBatches'](messages, 50);

            expect(result).toBeDefined();
            expect(Array.isArray(result)).toBe(true);
        });

        it('should handle small batches', async () => {
            const messages = [
                { type: 'ask', text: 'Q1' },
                { type: 'say', text: 'A1' }
            ];

            const result = await condenser['condenseBatches'](messages, 50);

            expect(result).toBeDefined();
            expect(result.length).toBeGreaterThan(0);
        });
    });

    describe('quality validation', () => {
        it('should validate quality using term preservation', () => {
            const original = [
                { type: 'ask', text: 'How do I fix error in file.ts?' },
                { type: 'say', text: 'You need to update the function parseData()' }
            ];
            const condensed = [
                { type: 'summary', text: 'User asked about error in file.ts. Told to update parseData()' }
            ];

            const isValid = condenser.validateQuality(original, condensed, 0.5);

            expect(typeof isValid).toBe('boolean');
            expect(isValid).toBe(true); // Should preserve key terms
        });

        it('should reject poor quality summaries', () => {
            const original = [
                { type: 'ask', text: 'How do I fix error in file.ts?' },
                { type: 'say', text: 'You need to update the function parseData()' }
            ];
            const condensed = [
                { type: 'summary', text: 'Some stuff happened' }
            ];

            const isValid = condenser.validateQuality(original, condensed, 0.7);

            expect(isValid).toBe(false); // Should fail quality check
        });
    });

    describe('singleton access', () => {
        it('should provide global instance', async () => {
            const { getMessageCondenser, resetMessageCondenser } = 
                await import('../MessageCondenser');
            
            resetMessageCondenser();
            const instance1 = getMessageCondenser('test-key');
            const instance2 = getMessageCondenser();
            
            expect(instance1).toBe(instance2);
        });
    });
});
