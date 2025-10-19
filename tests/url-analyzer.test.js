/* eslint-env jest */
const URLAnalyzer = require('../src/analysis/url-analyzer');

describe('URLAnalyzer', () => {
    let analyzer;

    beforeEach(() => {
        analyzer = new URLAnalyzer();
    });

    describe('detectURLs', () => {
        test('detects GitHub repository URL', () => {
            const text = 'Check out https://github.com/microsoft/vscode';
            const result = analyzer.detectURLs(text);

            expect(result).toHaveLength(1);
            expect(result[0]).toMatchObject({
                type: 'github',
                owner: 'microsoft',
                repo: 'vscode',
                branch: 'main'
            });
        });

        test('detects GitHub URL with branch', () => {
            const text = 'https://github.com/facebook/react/tree/main/packages/react';
            const result = analyzer.detectURLs(text);

            expect(result).toHaveLength(1);
            expect(result[0]).toMatchObject({
                type: 'github',
                owner: 'facebook',
                repo: 'react',
                branch: 'main',
                path: 'packages/react'
            });
        });

        test('detects GitLab repository URL', () => {
            const text = 'https://gitlab.com/gitlab-org/gitlab';
            const result = analyzer.detectURLs(text);

            expect(result).toHaveLength(1);
            expect(result[0]).toMatchObject({
                type: 'gitlab',
                owner: 'gitlab-org',
                repo: 'gitlab'
            });
        });

        test('detects Bitbucket repository URL', () => {
            const text = 'https://bitbucket.org/atlassian/python-bitbucket';
            const result = analyzer.detectURLs(text);

            expect(result).toHaveLength(1);
            expect(result[0]).toMatchObject({
                type: 'bitbucket',
                owner: 'atlassian',
                repo: 'python-bitbucket'
            });
        });

        test('detects multiple URLs', () => {
            const text = 'Compare https://github.com/angular/angular with https://github.com/vuejs/vue';
            const result = analyzer.detectURLs(text);

            expect(result).toHaveLength(2);
            expect(result[0].owner).toBe('angular');
            expect(result[1].owner).toBe('vuejs');
        });

        test('detects Git clone URL', () => {
            const text = 'Clone git@github.com:microsoft/vscode.git';
            const result = analyzer.detectURLs(text);

            expect(result).toHaveLength(1);
            expect(result[0].type).toBe('git');
        });

        test('detects web URL', () => {
            const text = 'See https://docs.python.org/3/library/asyncio.html';
            const result = analyzer.detectURLs(text);

            expect(result).toHaveLength(1);
            expect(result[0].type).toBe('web');
        });

        test('returns empty array for no URLs', () => {
            const text = 'This is just plain text without any URLs';
            const result = analyzer.detectURLs(text);

            expect(result).toHaveLength(0);
        });

        test('detects URLs without protocol', () => {
            const text = 'Check github.com/microsoft/vscode';
            const result = analyzer.detectURLs(text);

            expect(result).toHaveLength(1);
            expect(result[0].type).toBe('github');
        });
    });

    describe('analyzeGitHubRepo', () => {
        test('analyzes public repository successfully', async () => {
            const urlInfo = {
                owner: 'microsoft',
                repo: 'vscode',
                branch: 'main',
                path: ''
            };

            const result = await analyzer.analyzeGitHubRepo(urlInfo);

            expect(result.success).toBe(true);
            expect(result.type).toBe('github');
            expect(result.repository).toBeDefined();
            expect(result.repository.name).toBe('vscode');
            expect(result.repository.owner).toBe('microsoft');
            expect(result.languages).toBeDefined();
            expect(result.fileStructure).toBeDefined();
        }, 30000); // 30 second timeout for API call

        test('handles non-existent repository', async () => {
            const urlInfo = {
                owner: 'nonexistent',
                repo: 'repo-does-not-exist-12345',
                branch: 'main',
                path: ''
            };

            const result = await analyzer.analyzeGitHubRepo(urlInfo);

            expect(result.success).toBe(false);
            expect(result.error).toContain('not found');
        }, 10000);

        test('includes file structure in analysis', async () => {
            const urlInfo = {
                owner: 'facebook',
                repo: 'react',
                branch: 'main',
                path: 'packages'
            };

            const result = await analyzer.analyzeGitHubRepo(urlInfo);

            if (result.success) {
                expect(result.fileStructure).toBeDefined();
                expect(result.fileStructure.totalFiles).toBeGreaterThan(0);
                expect(result.fileStructure.directories).toBeDefined();
            }
        }, 30000);
    });

    describe('generateAIContext', () => {
        test('generates context for successful GitHub analysis', () => {
            const analysisResult = {
                totalDetected: 1,
                analyses: [{
                    original: { url: 'https://github.com/facebook/react' },
                    analysis: {
                        success: true,
                        type: 'github',
                        repository: {
                            fullName: 'facebook/react',
                            description: 'A JavaScript library for building user interfaces',
                            language: 'JavaScript',
                            stars: 200000,
                            forks: 40000
                        },
                        languages: { JavaScript: 50000, TypeScript: 30000 },
                        fileStructure: {
                            totalFiles: 50,
                            directories: ['src', 'packages'],
                            mainFiles: ['README.md', 'package.json']
                        },
                        readme: 'React is a JavaScript library...'
                    }
                }],
                timestamp: new Date().toISOString()
            };

            const context = analyzer.generateAIContext(analysisResult);

            expect(context).toContain('[URL Analysis Context]');
            expect(context).toContain('facebook/react');
            expect(context).toContain('JavaScript');
            expect(context).toContain('Stars: 200000');
            expect(context).toContain('[End URL Analysis]');
        });

        test('handles failed analysis in context', () => {
            const analysisResult = {
                totalDetected: 1,
                analyses: [{
                    original: { url: 'https://github.com/invalid/repo' },
                    analysis: {
                        success: false,
                        error: 'Repository not found'
                    }
                }],
                timestamp: new Date().toISOString()
            };

            const context = analyzer.generateAIContext(analysisResult);

            expect(context).toContain('Error: Repository not found');
        });

        test('returns null for empty analyses', () => {
            const analysisResult = {
                totalDetected: 0,
                analyses: [],
                timestamp: new Date().toISOString()
            };

            const context = analyzer.generateAIContext(analysisResult);

            expect(context).toBeNull();
        });
    });

    describe('_analyzeFileStructure', () => {
        test('analyzes file structure correctly', () => {
            const contents = [
                { name: 'README.md', type: 'file' },
                { name: 'package.json', type: 'file' },
                { name: 'src', type: 'dir' },
                { name: 'index.js', type: 'file' },
                { name: 'test.spec.js', type: 'file' }
            ];

            const result = analyzer._analyzeFileStructure(contents);

            expect(result.totalFiles).toBe(4);
            expect(result.directories).toContain('src');
            expect(result.mainFiles).toContain('README.md');
            expect(result.mainFiles).toContain('package.json');
            expect(result.extensions.js).toBeGreaterThan(0);
            expect(result.extensions.md).toBe(1);
        });

        test('handles empty contents', () => {
            const contents = [];
            const result = analyzer._analyzeFileStructure(contents);

            expect(result.totalFiles).toBe(0);
            expect(result.directories).toHaveLength(0);
            expect(result.mainFiles).toHaveLength(0);
        });
    });

    describe('processURLs', () => {
        test('processes single GitHub URL', async () => {
            const detectedUrls = [{
                type: 'github',
                url: 'https://github.com/expressjs/express',
                owner: 'expressjs',
                repo: 'express',
                branch: 'master',
                path: '',
                fullMatch: 'https://github.com/expressjs/express'
            }];

            const result = await analyzer.processURLs(detectedUrls);

            expect(result.totalDetected).toBe(1);
            expect(result.analyses).toHaveLength(1);
            expect(result.analyses[0].analysis.type).toBe('github');
        }, 30000);

        test('processes multiple URLs', async () => {
            const detectedUrls = [
                {
                    type: 'github',
                    url: 'https://github.com/facebook/react',
                    owner: 'facebook',
                    repo: 'react',
                    branch: 'main',
                    path: ''
                },
                {
                    type: 'web',
                    url: 'https://reactjs.org'
                }
            ];

            const result = await analyzer.processURLs(detectedUrls);

            expect(result.totalDetected).toBe(2);
            expect(result.analyses).toHaveLength(2);
        }, 60000);
    });

    describe('Edge cases', () => {
        test('handles URLs with special characters', () => {
            const text = 'Check https://github.com/user-name/repo_name-123';
            const result = analyzer.detectURLs(text);

            expect(result).toHaveLength(1);
            expect(result[0].owner).toBe('user-name');
            expect(result[0].repo).toBe('repo_name-123');
        });

        test('handles URLs in markdown', () => {
            const text = '[React](https://github.com/facebook/react) is awesome';
            const result = analyzer.detectURLs(text);

            expect(result).toHaveLength(1);
            expect(result[0].repo).toBe('react');
        });

        test('handles URLs with query parameters', () => {
            const text = 'https://github.com/microsoft/vscode?tab=readme-ov-file';
            const result = analyzer.detectURLs(text);

            expect(result).toHaveLength(1);
            expect(result[0].repo).toBe('vscode');
        });
    });

    describe('Performance', () => {
        test('detectURLs completes quickly', () => {
            const text = 'https://github.com/a/b '.repeat(10);
            const start = Date.now();

            analyzer.detectURLs(text);

            const elapsed = Date.now() - start;
            expect(elapsed).toBeLessThan(100); // Should complete in < 100ms
        });

        test('handles large text input', () => {
            const text = 'Some text '.repeat(1000) + ' https://github.com/microsoft/vscode';
            const result = analyzer.detectURLs(text);

            expect(result).toHaveLength(1);
        });
    });
});
