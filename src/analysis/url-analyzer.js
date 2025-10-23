const axios = require('axios');
const vscode = require('vscode');

/**
 * URLAnalyzer - Intelligently detects and processes URLs from chat input
 * Supports Git repositories (GitHub, GitLab, Bitbucket) and general web URLs
 */
class URLAnalyzer {
    constructor() {
        this.urlPatterns = {
            github: /(?:https?:\/\/)?(?:www\.)?github\.com\/([^/\s]+)\/([^/\s]+)(?:\/(?:tree|blob)\/([^/\s]+)(?:\/(.+))?)?/gi,
            gitlab: /(?:https?:\/\/)?(?:www\.)?gitlab\.com\/([^/\s]+)\/([^/\s]+)(?:\/-\/(?:tree|blob)\/([^/\s]+)(?:\/(.+))?)?/gi,
            bitbucket: /(?:https?:\/\/)?(?:www\.)?bitbucket\.org\/([^/\s]+)\/([^/\s]+)(?:\/src\/([^/\s]+)(?:\/(.+))?)?/gi,
            gitUrl: /(?:git@|https?:\/\/)[\w.-]+[:/][\w.-]+\/[\w.-]+\.git/gi,
            webUrl: /https?:\/\/[^\s]+/gi
        };

        // Get GitHub token from VS Code configuration
        this.githubToken = this._getGitHubToken();

        // Domains to skip from URL analysis (not repositories)
        this.skipDomains = [
            'claude.com',
            'anthropic.com',
            'openai.com',
            'microsoft.com',
            'google.com',
            'npmjs.com',
            'pypi.org',
            'stackoverflow.com',
            'youtube.com',
            'twitter.com',
            'linkedin.com'
        ];
    }

    /**
     * Get GitHub token from VS Code settings
     * @private
     */
    _getGitHubToken() {
        try {
            const config = vscode.workspace.getConfiguration('oropendola');
            const token = config.get('github.token');

            if (token) {
                console.log('✅ GitHub token configured for URL analysis');
                return token;
            } else {
                console.log('ℹ️ No GitHub token - using unauthenticated requests (60/hour limit)');
                return null;
            }
        } catch (error) {
            console.error('Error reading GitHub token:', error);
            return null;
        }
    }

    /**
     * Check if a URL should be skipped from analysis
     * @param {string} url - URL to check
     * @returns {boolean} True if URL should be skipped
     * @private
     */
    _shouldSkipURL(url) {
        try {
            const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
            const hostname = urlObj.hostname.toLowerCase();

            // Check if hostname matches any skip domain
            return this.skipDomains.some(domain => hostname.includes(domain));
        } catch (error) {
            // Invalid URL format - skip it
            return true;
        }
    }

    /**
     * Detect URLs in text input
     * @param {string} text - User input text
     * @returns {Array<Object>} Array of detected URLs with metadata
     */
    detectURLs(text) {
        const detectedUrls = [];

        // Check for GitHub URLs
        const githubMatches = [...text.matchAll(this.urlPatterns.github)];
        for (const match of githubMatches) {
            detectedUrls.push({
                type: 'github',
                url: match[0],
                owner: match[1],
                repo: match[2],
                branch: match[3] || 'main',
                path: match[4] || '',
                fullMatch: match[0]
            });
        }

        // Check for GitLab URLs
        const gitlabMatches = [...text.matchAll(this.urlPatterns.gitlab)];
        for (const match of gitlabMatches) {
            detectedUrls.push({
                type: 'gitlab',
                url: match[0],
                owner: match[1],
                repo: match[2],
                branch: match[3] || 'main',
                path: match[4] || '',
                fullMatch: match[0]
            });
        }

        // Check for Bitbucket URLs
        const bitbucketMatches = [...text.matchAll(this.urlPatterns.bitbucket)];
        for (const match of bitbucketMatches) {
            detectedUrls.push({
                type: 'bitbucket',
                url: match[0],
                owner: match[1],
                repo: match[2],
                branch: match[3] || 'master',
                path: match[4] || '',
                fullMatch: match[0]
            });
        }

        // Check for generic Git URLs
        const gitMatches = [...text.matchAll(this.urlPatterns.gitUrl)];
        for (const match of gitMatches) {
            if (!detectedUrls.some(u => u.fullMatch === match[0])) {
                detectedUrls.push({
                    type: 'git',
                    url: match[0],
                    fullMatch: match[0]
                });
            }
        }

        // Check for general web URLs (only if not already detected as git)
        const webMatches = [...text.matchAll(this.urlPatterns.webUrl)];
        for (const match of webMatches) {
            if (!detectedUrls.some(u => u.fullMatch === match[0])) {
                detectedUrls.push({
                    type: 'web',
                    url: match[0],
                    fullMatch: match[0]
                });
            }
        }

        // Filter out URLs from skip domains
        const filteredUrls = detectedUrls.filter(urlInfo => {
            const shouldSkip = this._shouldSkipURL(urlInfo.url);
            if (shouldSkip) {
                console.log(`ℹ️ Skipping URL analysis for: ${urlInfo.url} (non-repo domain)`);
            }
            return !shouldSkip;
        });

        return filteredUrls;
    }

    /**
     * Analyze GitHub repository structure
     * @param {Object} urlInfo - Parsed URL information
     * @returns {Promise<Object>} Repository analysis
     */
    async analyzeGitHubRepo(urlInfo) {
        try {
            const apiUrl = `https://api.github.com/repos/${urlInfo.owner}/${urlInfo.repo}`;

            // Build headers with optional authentication
            const headers = {
                Accept: 'application/vnd.github.v3+json',
                'User-Agent': 'Oropendola-AI-Assistant'
            };

            // Add authentication if token is available
            if (this.githubToken) {
                headers['Authorization'] = `Bearer ${this.githubToken}`;
            }

            // Get repository metadata
            const repoResponse = await axios.get(apiUrl, { headers });

            const repoData = repoResponse.data;

            // Get repository contents
            const contentsUrl = `${apiUrl}/contents/${urlInfo.path || ''}${urlInfo.branch ? `?ref=${urlInfo.branch}` : ''}`;
            const contentsResponse = await axios.get(contentsUrl, { headers });

            // Get README if exists
            let readme = null;
            try {
                const readmeHeaders = { ...headers, Accept: 'application/vnd.github.v3.raw' };
                const readmeResponse = await axios.get(`${apiUrl}/readme`, { headers: readmeHeaders });
                readme = readmeResponse.data;
            } catch (error) {
                // README doesn't exist
            }

            // Get languages
            const languagesResponse = await axios.get(`${apiUrl}/languages`, { headers });

            // Analyze file structure
            const fileStructure = this._analyzeFileStructure(contentsResponse.data);

            return {
                success: true,
                type: 'github',
                repository: {
                    name: repoData.name,
                    fullName: repoData.full_name,
                    description: repoData.description,
                    owner: repoData.owner.login,
                    language: repoData.language,
                    stars: repoData.stargazers_count,
                    forks: repoData.forks_count,
                    openIssues: repoData.open_issues_count,
                    createdAt: repoData.created_at,
                    updatedAt: repoData.updated_at,
                    topics: repoData.topics || [],
                    license: repoData.license?.name || 'No license'
                },
                languages: languagesResponse.data,
                fileStructure: fileStructure,
                readme: readme ? readme.substring(0, 2000) : null, // Limit README size
                branch: urlInfo.branch,
                path: urlInfo.path
            };
        } catch (error) {
            console.error('GitHub analysis error:', error.message);
            return {
                success: false,
                error: error.response?.status === 404
                    ? 'Repository not found or is private'
                    : `Failed to analyze repository: ${error.message}`
            };
        }
    }

    /**
     * Analyze GitLab repository
     * @param {Object} urlInfo - Parsed URL information
     * @returns {Promise<Object>} Repository analysis
     */
    async analyzeGitLabRepo(urlInfo) {
        try {
            const projectPath = encodeURIComponent(`${urlInfo.owner}/${urlInfo.repo}`);
            const apiUrl = `https://gitlab.com/api/v4/projects/${projectPath}`;

            // Get project metadata
            const projectResponse = await axios.get(apiUrl);
            const projectData = projectResponse.data;

            // Get repository tree
            const treeUrl = `${apiUrl}/repository/tree?ref=${urlInfo.branch}&path=${urlInfo.path || ''}`;
            const treeResponse = await axios.get(treeUrl);

            // Get README
            let readme = null;
            try {
                const readmeResponse = await axios.get(`${apiUrl}/repository/files/README.md/raw?ref=${urlInfo.branch}`);
                readme = readmeResponse.data;
            } catch (error) {
                // README doesn't exist
            }

            const fileStructure = this._analyzeFileStructure(treeResponse.data);

            return {
                success: true,
                type: 'gitlab',
                repository: {
                    name: projectData.name,
                    fullName: projectData.path_with_namespace,
                    description: projectData.description,
                    owner: urlInfo.owner,
                    stars: projectData.star_count,
                    forks: projectData.forks_count,
                    openIssues: projectData.open_issues_count,
                    createdAt: projectData.created_at,
                    updatedAt: projectData.last_activity_at,
                    topics: projectData.topics || []
                },
                fileStructure: fileStructure,
                readme: readme ? readme.substring(0, 2000) : null,
                branch: urlInfo.branch,
                path: urlInfo.path
            };
        } catch (error) {
            console.error('GitLab analysis error:', error.message);
            return {
                success: false,
                error: `Failed to analyze GitLab repository: ${error.message}`
            };
        }
    }

    /**
     * Analyze Bitbucket repository
     * @param {Object} urlInfo - Parsed URL information
     * @returns {Promise<Object>} Repository analysis
     */
    async analyzeBitbucketRepo(urlInfo) {
        try {
            const apiUrl = `https://api.bitbucket.org/2.0/repositories/${urlInfo.owner}/${urlInfo.repo}`;

            const repoResponse = await axios.get(apiUrl);
            const repoData = repoResponse.data;

            // Get source code structure
            const srcUrl = `${apiUrl}/src/${urlInfo.branch}/${urlInfo.path || ''}`;
            const srcResponse = await axios.get(srcUrl);

            return {
                success: true,
                type: 'bitbucket',
                repository: {
                    name: repoData.name,
                    fullName: repoData.full_name,
                    description: repoData.description,
                    owner: urlInfo.owner,
                    language: repoData.language,
                    createdAt: repoData.created_on,
                    updatedAt: repoData.updated_on
                },
                fileStructure: this._analyzeFileStructure(srcResponse.data.values || []),
                branch: urlInfo.branch,
                path: urlInfo.path
            };
        } catch (error) {
            console.error('Bitbucket analysis error:', error.message);
            return {
                success: false,
                error: `Failed to analyze Bitbucket repository: ${error.message}`
            };
        }
    }

    /**
     * Analyze general web URL
     * @param {string} url - Web URL
     * @returns {Promise<Object>} URL analysis
     */
    async analyzeWebURL(url) {
        try {
            const response = await axios.get(url, {
                timeout: 10000,
                maxRedirects: 5,
                headers: {
                    'User-Agent': 'Oropendola-AI-Assistant'
                }
            });

            // Extract basic metadata
            const contentType = response.headers['content-type'] || '';
            const title = this._extractTitle(response.data);
            const description = this._extractDescription(response.data);

            return {
                success: true,
                type: 'web',
                url: url,
                contentType: contentType,
                title: title,
                description: description,
                statusCode: response.status
            };
        } catch (error) {
            return {
                success: false,
                error: `Failed to analyze URL: ${error.message}`
            };
        }
    }

    /**
     * Process detected URLs and generate analysis
     * @param {Array<Object>} detectedUrls - Array of detected URLs
     * @returns {Promise<Object>} Complete analysis
     */
    async processURLs(detectedUrls) {
        const analyses = [];

        for (const urlInfo of detectedUrls) {
            let analysis = null;

            switch (urlInfo.type) {
                case 'github':
                    analysis = await this.analyzeGitHubRepo(urlInfo);
                    break;
                case 'gitlab':
                    analysis = await this.analyzeGitLabRepo(urlInfo);
                    break;
                case 'bitbucket':
                    analysis = await this.analyzeBitbucketRepo(urlInfo);
                    break;
                case 'web':
                    analysis = await this.analyzeWebURL(urlInfo.url);
                    break;
                case 'git':
                    analysis = {
                        success: true,
                        type: 'git',
                        url: urlInfo.url,
                        message: 'Generic Git URL detected. Use clone command to download.'
                    };
                    break;
            }

            if (analysis) {
                analyses.push({
                    original: urlInfo,
                    analysis: analysis
                });
            }
        }

        return {
            totalDetected: detectedUrls.length,
            analyses: analyses,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Generate AI-friendly context from URL analysis
     * @param {Object} analysisResult - Complete analysis result
     * @returns {string} Formatted context for AI
     */
    generateAIContext(analysisResult) {
        if (!analysisResult.analyses || analysisResult.analyses.length === 0) {
            return null;
        }

        let context = '\n\n[URL Analysis Context]\n';
        context += `Detected ${analysisResult.totalDetected} URL(s) in the message:\n\n`;

        for (const item of analysisResult.analyses) {
            const analysis = item.analysis;

            if (!analysis.success) {
                context += `❌ ${item.original.url}\n   Error: ${analysis.error}\n\n`;
                continue;
            }

            if (analysis.type === 'github' || analysis.type === 'gitlab' || analysis.type === 'bitbucket') {
                const repo = analysis.repository;
                context += `📦 Repository: ${repo.fullName}\n`;
                context += `   Description: ${repo.description || 'No description'}\n`;
                context += `   Language: ${repo.language || 'Multiple languages'}\n`;
                if (repo.stars !== undefined) {
                    context += `   Stars: ${repo.stars} | Forks: ${repo.forks}\n`;
                }

                // Add language breakdown
                if (analysis.languages) {
                    const langs = Object.keys(analysis.languages).slice(0, 5).join(', ');
                    context += `   Languages: ${langs}\n`;
                }

                // Add file structure summary
                if (analysis.fileStructure) {
                    const fs = analysis.fileStructure;
                    context += `   Structure: ${fs.totalFiles} files, ${fs.directories.length} directories\n`;
                    if (fs.mainFiles.length > 0) {
                        context += `   Key files: ${fs.mainFiles.slice(0, 5).join(', ')}\n`;
                    }
                }

                // Add README excerpt
                if (analysis.readme) {
                    context += `   README (excerpt): ${analysis.readme.substring(0, 300)}...\n`;
                }

                context += '\n';
            } else if (analysis.type === 'web') {
                context += `🌐 Web URL: ${analysis.url}\n`;
                if (analysis.title) {
                    context += `   Title: ${analysis.title}\n`;
                }
                if (analysis.description) {
                    context += `   Description: ${analysis.description}\n`;
                }
                context += '\n';
            } else if (analysis.type === 'git') {
                context += `📥 Git URL: ${analysis.url}\n`;
                context += `   ${analysis.message}\n\n`;
            }
        }

        context += '[End URL Analysis]\n';
        return context;
    }

    /**
     * Analyze file structure from repository contents
     * @param {Array} contents - Repository contents array
     * @returns {Object} File structure analysis
     */
    _analyzeFileStructure(contents) {
        const files = [];
        const directories = [];
        const mainFiles = [];
        const extensions = {};

        for (const item of contents) {
            const name = item.name || item.path?.split('/').pop();
            if (!name) continue;

            if (item.type === 'dir' || item.type === 'tree') {
                directories.push(name);
            } else if (item.type === 'file' || item.type === 'blob') {
                files.push(name);

                // Track extensions
                const ext = name.split('.').pop();
                if (ext !== name) {
                    extensions[ext] = (extensions[ext] || 0) + 1;
                }

                // Identify important files
                const importantFiles = ['README.md', 'package.json', 'requirements.txt',
                    'Cargo.toml', 'pom.xml', 'build.gradle', 'Makefile',
                    'Dockerfile', '.gitignore', 'LICENSE'];
                if (importantFiles.includes(name)) {
                    mainFiles.push(name);
                }
            }
        }

        return {
            totalFiles: files.length,
            files: files.slice(0, 20), // Limit to first 20 files
            directories: directories,
            mainFiles: mainFiles,
            extensions: extensions
        };
    }

    /**
     * Extract title from HTML
     * @param {string} html - HTML content
     * @returns {string} Extracted title
     */
    _extractTitle(html) {
        const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        return match ? match[1].trim() : null;
    }

    /**
     * Extract description from HTML meta tags
     * @param {string} html - HTML content
     * @returns {string} Extracted description
     */
    _extractDescription(html) {
        const match = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
        return match ? match[1].trim() : null;
    }
}

module.exports = URLAnalyzer;
