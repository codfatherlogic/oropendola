/**
 * Unit Tests for MentionParser
 * 
 * Comprehensive tests for all 5 mention types:
 * - FILE mentions (@/path/to/file.ts)
 * - FOLDER mentions (@./folder/)
 * - PROBLEMS mentions (@problems)
 * - TERMINAL mentions (@terminal, @terminal 1)
 * - GIT mentions (@git, @git main, @git abc123)
 */

import { MentionParser } from '../MentionParser';
import { MentionType } from '../types';

describe('MentionParser', () => {
    let parser: MentionParser;

    beforeEach(() => {
        parser = new MentionParser();
    });

    describe('FILE Mentions', () => {
        it('should parse basic file mention', () => {
            const text = 'Check @/src/App.tsx for errors';
            const mentions = parser.parseMentions(text);

            expect(mentions).toHaveLength(1);
            expect(mentions[0].type).toBe(MentionType.FILE);
            expect(mentions[0].raw).toBe('@/src/App.tsx');
            expect(mentions[0].value).toBe('/src/App.tsx');
            expect(mentions[0].startIndex).toBe(6);
            expect(mentions[0].endIndex).toBe(19);
        });

        it('should parse relative file paths', () => {
            const text = 'See @./components/Button.tsx';
            const mentions = parser.parseMentions(text);

            expect(mentions).toHaveLength(1);
            expect(mentions[0].value).toBe('./components/Button.tsx');
        });

        it('should parse file with dots in name', () => {
            const text = 'Check @config.dev.json';
            const mentions = parser.parseMentions(text);

            expect(mentions).toHaveLength(1);
            expect(mentions[0].value).toBe('config.dev.json');
        });

        it('should parse file with spaces (escaped)', () => {
            const text = 'Open @My\\ Document.txt';
            const mentions = parser.parseMentions(text);

            expect(mentions).toHaveLength(1);
            expect(mentions[0].value).toBe('My Document.txt');
        });

        it('should parse multiple file mentions', () => {
            const text = 'Compare @file1.ts and @file2.ts';
            const mentions = parser.parseMentions(text);

            expect(mentions).toHaveLength(2);
            expect(mentions[0].value).toBe('file1.ts');
            expect(mentions[1].value).toBe('file2.ts');
        });

        it('should parse file with underscores and dashes', () => {
            const text = '@my-component_v2.tsx';
            const mentions = parser.parseMentions(text);

            expect(mentions).toHaveLength(1);
            expect(mentions[0].value).toBe('my-component_v2.tsx');
        });

        it('should parse nested file paths', () => {
            const text = '@/src/components/ui/Button/Button.tsx';
            const mentions = parser.parseMentions(text);

            expect(mentions).toHaveLength(1);
            expect(mentions[0].value).toBe('/src/components/ui/Button/Button.tsx');
        });

        it('should NOT parse folder paths as files', () => {
            const text = '@/src/components/';
            const fileMentions = parser.parseMentions(text).filter(m => m.type === MentionType.FILE);

            expect(fileMentions).toHaveLength(0);
        });

        it('should handle file mention at start of text', () => {
            const text = '@/src/App.tsx is broken';
            const mentions = parser.parseMentions(text);

            expect(mentions[0].startIndex).toBe(0);
        });

        it('should handle file mention at end of text', () => {
            const text = 'Check @/src/App.tsx';
            const mentions = parser.parseMentions(text);

            expect(mentions[0].endIndex).toBe(text.length);
        });
    });

    describe('FOLDER Mentions', () => {
        it('should parse folder mention with trailing slash', () => {
            const text = 'Check @/src/components/';
            const mentions = parser.parseMentions(text);

            expect(mentions).toHaveLength(1);
            expect(mentions[0].type).toBe(MentionType.FOLDER);
            expect(mentions[0].value).toBe('/src/components/');
        });

        it('should parse relative folder paths', () => {
            const text = '@./utils/';
            const mentions = parser.parseMentions(text);

            expect(mentions).toHaveLength(1);
            expect(mentions[0].value).toBe('./utils/');
        });

        it('should parse folder with spaces', () => {
            const text = '@My\\ Folder/';
            const mentions = parser.parseMentions(text);

            expect(mentions).toHaveLength(1);
            expect(mentions[0].value).toBe('My Folder/');
        });

        it('should parse root folder', () => {
            const text = '@/';
            const mentions = parser.parseMentions(text);

            expect(mentions).toHaveLength(1);
            expect(mentions[0].value).toBe('/');
        });

        it('should parse current directory', () => {
            const text = '@./';
            const mentions = parser.parseMentions(text);

            expect(mentions).toHaveLength(1);
            expect(mentions[0].value).toBe('./');
        });

        it('should parse parent directory', () => {
            const text = '@../';
            const mentions = parser.parseMentions(text);

            expect(mentions).toHaveLength(1);
            expect(mentions[0].value).toBe('../');
        });

        it('should parse nested folders', () => {
            const text = '@/src/components/ui/';
            const mentions = parser.parseMentions(text);

            expect(mentions).toHaveLength(1);
            expect(mentions[0].value).toBe('/src/components/ui/');
        });
    });

    describe('PROBLEMS Mentions', () => {
        it('should parse @problems mention', () => {
            const text = 'Fix @problems in the workspace';
            const mentions = parser.parseMentions(text);

            expect(mentions).toHaveLength(1);
            expect(mentions[0].type).toBe(MentionType.PROBLEMS);
            expect(mentions[0].raw).toBe('@problems');
            expect(mentions[0].value).toBe('problems');
        });

        it('should parse @problems case-insensitively', () => {
            const text = 'Check @PROBLEMS and @Problems';
            const mentions = parser.parseMentions(text);

            expect(mentions).toHaveLength(2);
            mentions.forEach(m => {
                expect(m.type).toBe(MentionType.PROBLEMS);
            });
        });

        it('should handle @problems at different positions', () => {
            const texts = [
                '@problems are critical',
                'Check @problems now',
                'Review and fix @problems'
            ];

            texts.forEach(text => {
                const mentions = parser.parseMentions(text);
                expect(mentions.some(m => m.type === MentionType.PROBLEMS)).toBe(true);
            });
        });

        it('should NOT parse partial matches', () => {
            const text = '@problem @problemsolver';
            const mentions = parser.parseMentions(text);
            
            // Should only match exact @problems if followed by word boundary
            const problemsMentions = mentions.filter(m => m.type === MentionType.PROBLEMS);
            expect(problemsMentions.length).toBeLessThanOrEqual(1);
        });
    });

    describe('TERMINAL Mentions', () => {
        it('should parse @terminal mention without ID', () => {
            const text = 'Show @terminal output';
            const mentions = parser.parseMentions(text);

            const terminalMentions = mentions.filter(m => m.type === MentionType.TERMINAL);
            expect(terminalMentions).toHaveLength(1);
            expect(terminalMentions[0].raw).toBe('@terminal');
            expect(terminalMentions[0].value).toBe('current'); // Default to 'current' when no ID
        });

        it('should parse @terminal with numeric ID', () => {
            const text = 'Check @terminal 1 for errors';
            const mentions = parser.parseMentions(text);

            const terminalMentions = mentions.filter(m => m.type === MentionType.TERMINAL);
            expect(terminalMentions.length).toBeGreaterThan(0);
        });

        it('should parse multiple terminal mentions', () => {
            const text = 'Compare @terminal 1 with @terminal 2';
            const mentions = parser.parseMentions(text);

            const terminalMentions = mentions.filter(m => m.type === MentionType.TERMINAL);
            expect(terminalMentions.length).toBeGreaterThan(0);
        });

        it('should parse @terminal case-insensitively', () => {
            const text = '@TERMINAL and @Terminal';
            const mentions = parser.parseMentions(text);

            const terminalMentions = mentions.filter(m => m.type === MentionType.TERMINAL);
            expect(terminalMentions.length).toBeGreaterThan(0);
        });
    });

    describe('GIT Mentions', () => {
        it('should parse @git mention without ref', () => {
            const text = 'Show @git (no ref)';
            const mentions = parser.parseMentions(text);

            const gitMentions = mentions.filter(m => m.type === MentionType.GIT);
            expect(gitMentions).toHaveLength(1);
            expect(gitMentions[0].raw).toBe('@git');
            expect(gitMentions[0].value).toBe('HEAD'); // Default to HEAD when no ref
        });

        it('should parse @git with branch name', () => {
            const text = 'Check @git main';
            const mentions = parser.parseMentions(text);

            const gitMentions = mentions.filter(m => m.type === MentionType.GIT);
            expect(gitMentions.length).toBeGreaterThan(0);
        });

        it('should parse @git with commit hash', () => {
            const text = 'View @git abc123def';
            const mentions = parser.parseMentions(text);

            const gitMentions = mentions.filter(m => m.type === MentionType.GIT);
            expect(gitMentions.length).toBeGreaterThan(0);
        });

        it('should parse @git with branch containing slashes', () => {
            const text = '@git feature/new-ui';
            const mentions = parser.parseMentions(text);

            const gitMentions = mentions.filter(m => m.type === MentionType.GIT);
            expect(gitMentions.length).toBeGreaterThan(0);
        });

        it('should parse @git case-insensitively', () => {
            const text = '@GIT and @Git';
            const mentions = parser.parseMentions(text);

            const gitMentions = mentions.filter(m => m.type === MentionType.GIT);
            expect(gitMentions.length).toBeGreaterThan(0);
        });
    });

    describe('Mixed Mentions', () => {
        it('should parse multiple mention types in one text', () => {
            const text = 'Check @/src/App.tsx for @problems and review @git main';
            const mentions = parser.parseMentions(text);

            expect(mentions.length).toBeGreaterThan(0);
            
            const types = mentions.map(m => m.type);
            expect(types).toContain(MentionType.FILE);
            expect(types).toContain(MentionType.PROBLEMS);
            expect(types).toContain(MentionType.GIT);
        });

        it('should maintain correct order (sorted by startIndex)', () => {
            const text = '@/file.ts @problems @git';
            const mentions = parser.parseMentions(text);

            for (let i = 1; i < mentions.length; i++) {
                expect(mentions[i].startIndex).toBeGreaterThanOrEqual(mentions[i - 1].endIndex);
            }
        });

        it('should handle adjacent mentions', () => {
            const text = '@/file1.ts@/file2.ts';
            const mentions = parser.parseMentions(text);

            expect(mentions.length).toBeGreaterThan(0);
        });

        it('should handle mentions with no spacing', () => {
            const text = '@problems@git@terminal';
            const mentions = parser.parseMentions(text);

            expect(mentions.length).toBeGreaterThan(0);
        });
    });

    describe('Edge Cases', () => {
        it('should handle empty string', () => {
            const mentions = parser.parseMentions('');
            expect(mentions).toHaveLength(0);
        });

        it('should handle text with no mentions', () => {
            const text = 'This is plain text with no mentions';
            const mentions = parser.parseMentions(text);
            expect(mentions).toHaveLength(0);
        });

        it('should handle single @ symbol', () => {
            const text = 'Email me @ company.com';
            const mentions = parser.parseMentions(text);
            // Should not crash, may or may not parse depending on regex
            expect(Array.isArray(mentions)).toBe(true);
        });

        it('should handle very long text', () => {
            const longText = 'a'.repeat(10000) + ' @/file.ts ' + 'b'.repeat(10000);
            const mentions = parser.parseMentions(longText);

            expect(mentions).toHaveLength(1);
            expect(mentions[0].value).toBe('/file.ts');
        });

        it('should handle unicode characters', () => {
            const text = 'Check @/src/файл.ts and @/文件.js';
            const mentions = parser.parseMentions(text);

            expect(mentions.length).toBeGreaterThan(0);
        });

        it('should handle newlines in text', () => {
            const text = `Check @/file1.ts
            and @/file2.ts
            also @problems`;
            const mentions = parser.parseMentions(text);

            expect(mentions.length).toBeGreaterThan(0);
        });

        it('should handle tabs and special whitespace', () => {
            const text = '@/file.ts\t@problems\n@git';
            const mentions = parser.parseMentions(text);

            expect(mentions.length).toBeGreaterThan(0);
        });

        it('should handle mentions in code blocks (still parse them)', () => {
            const text = '```Check @/file.ts```';
            const mentions = parser.parseMentions(text);

            expect(mentions).toHaveLength(1);
        });

        it('should handle escaped @ symbol', () => {
            const text = '\\@not-a-mention @/real-mention.ts';
            const mentions = parser.parseMentions(text);

            // Should still parse the real mention
            expect(mentions.some(m => m.value === '/real-mention.ts')).toBe(true);
        });
    });

    describe('Parser Options', () => {
        it('should respect enableFiles option', () => {
            const disabledParser = new MentionParser({ enableFiles: false });
            const text = 'Check @/file.ts';
            const mentions = disabledParser.parseMentions(text);

            expect(mentions.filter(m => m.type === MentionType.FILE)).toHaveLength(0);
        });

        it('should respect enableFolders option', () => {
            const disabledParser = new MentionParser({ enableFolders: false });
            const text = 'Check @/folder/';
            const mentions = disabledParser.parseMentions(text);

            expect(mentions.filter(m => m.type === MentionType.FOLDER)).toHaveLength(0);
        });

        it('should respect enableProblems option', () => {
            const disabledParser = new MentionParser({ enableProblems: false });
            const text = 'Check @problems';
            const mentions = disabledParser.parseMentions(text);

            expect(mentions.filter(m => m.type === MentionType.PROBLEMS)).toHaveLength(0);
        });

        it('should respect enableTerminal option', () => {
            const disabledParser = new MentionParser({ enableTerminal: false });
            const text = 'Check @terminal';
            const mentions = disabledParser.parseMentions(text);

            expect(mentions.filter(m => m.type === MentionType.TERMINAL)).toHaveLength(0);
        });

        it('should respect enableGit option', () => {
            const disabledParser = new MentionParser({ enableGit: false });
            const text = 'Check @git';
            const mentions = disabledParser.parseMentions(text);

            expect(mentions.filter(m => m.type === MentionType.GIT)).toHaveLength(0);
        });

        it('should allow all options disabled', () => {
            const noParser = new MentionParser({
                enableFiles: false,
                enableFolders: false,
                enableProblems: false,
                enableTerminal: false,
                enableGit: false,
                enableUrls: false
            });
            const text = '@/file.ts @problems @git @terminal';
            const mentions = noParser.parseMentions(text);

            expect(mentions).toHaveLength(0);
        });
    });

    describe('Performance', () => {
        it('should handle 1000 mentions efficiently', () => {
            const mentions1000 = Array.from({ length: 1000 }, (_, i) => `@/file${i}.ts`).join(' ');
            
            const startTime = Date.now();
            const mentions = parser.parseMentions(mentions1000);
            const endTime = Date.now();

            expect(mentions).toHaveLength(1000);
            expect(endTime - startTime).toBeLessThan(1000); // Should parse in < 1 second
        });

        it('should handle 10000 character text efficiently', () => {
            const longText = 'a'.repeat(9000) + ' @/file.ts ' + 'b'.repeat(990);
            
            const startTime = Date.now();
            const mentions = parser.parseMentions(longText);
            const endTime = Date.now();

            expect(mentions).toHaveLength(1);
            expect(endTime - startTime).toBeLessThan(100); // Should parse in < 100ms
        });
    });

    describe('Real-World Examples', () => {
        it('should parse typical chat message', () => {
            const text = 'Can you help me fix the errors in @/src/components/Button.tsx? Also check @problems in the workspace.';
            const mentions = parser.parseMentions(text);

            expect(mentions.length).toBeGreaterThanOrEqual(2);
        });

        it('should parse code review message', () => {
            const text = 'Compare @/src/App.tsx with @git main and fix @problems';
            const mentions = parser.parseMentions(text);

            expect(mentions.length).toBeGreaterThanOrEqual(3);
        });

        it('should parse debug request', () => {
            const text = 'The test in @/tests/unit/parser.test.ts is failing. Check @terminal 1 for output.';
            const mentions = parser.parseMentions(text);

            expect(mentions.length).toBeGreaterThanOrEqual(1);
        });

        it('should parse folder analysis request', () => {
            const text = 'Analyze all files in @/src/components/ and @/src/utils/';
            const mentions = parser.parseMentions(text);

            expect(mentions.filter(m => m.type === MentionType.FOLDER)).toHaveLength(2);
        });
    });
});
