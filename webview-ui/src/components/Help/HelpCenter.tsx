import React, { useState } from 'react';
import './HelpCenter.css';

interface HelpCenterProps {
    vscode: any;
}

interface HelpArticle {
    id: string;
    category: string;
    title: string;
    content: string;
    keywords: string[];
}

type ViewMode = 'categories' | 'article' | 'search';

export const HelpCenter: React.FC<HelpCenterProps> = ({ vscode }) => {
    const [viewMode, setViewMode] = useState<ViewMode>('categories');
    const [selectedCategory, setSelectedCategory] = useState<string>('');
    const [selectedArticle, setSelectedArticle] = useState<HelpArticle | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<HelpArticle[]>([]);

    const helpArticles: HelpArticle[] = [
        // Getting Started
        {
            id: 'getting-started',
            category: 'Getting Started',
            title: 'Quick Start Guide',
            content: `Welcome to Oropendola! Here's how to get started:

1. **Start a Conversation**
   - Click the chat icon to start a new conversation
   - Type your question or request
   - The AI will respond with code, explanations, or actions

2. **Choose an AI Mode**
   - Click the mode selector (default: Code Mode)
   - Select from 8 specialized modes
   - Each mode optimizes AI behavior for specific tasks

3. **Use Tools**
   - AI can read, write, and edit files
   - Execute commands
   - Search the web
   - And more!

4. **Create Checkpoints**
   - Save conversation states
   - Branch conversations
   - Time travel through history

5. **Configure Settings**
   - Click the settings icon
   - Customize model, tools, UI, and more
   - 36 comprehensive settings available`,
            keywords: ['start', 'begin', 'new', 'first', 'quick', 'guide', 'tutorial']
        },
        {
            id: 'ai-modes',
            category: 'Getting Started',
            title: 'Understanding AI Modes',
            content: `Oropendola includes 8 specialized AI modes:

**💻 Code Mode** - General development
- Writing new code
- Implementing features
- General coding tasks

**🐛 Debug Mode** - Troubleshooting
- Finding bugs
- Analyzing errors
- Fixing issues

**📚 Documentation Mode** - Code documentation
- Writing JSDoc comments
- Creating READMEs
- API documentation

**🔍 Review Mode** - Code quality
- Code reviews
- Best practices
- Security analysis

**🧪 Test Mode** - Testing
- Unit tests
- Integration tests
- Test coverage

**♻️ Refactor Mode** - Code improvement
- Restructuring code
- Reducing complexity
- Design patterns

**💡 Explain Mode** - Understanding
- Code explanations
- Concept clarification
- Learning

**🏗️ Architecture Mode** - System design
- Architecture planning
- Design decisions
- Scalability

**Custom Modes**
You can create your own modes with custom prompts and variables!`,
            keywords: ['mode', 'modes', 'code', 'debug', 'documentation', 'review', 'test', 'refactor', 'explain', 'architecture', 'custom']
        },

        // Features
        {
            id: 'checkpoints',
            category: 'Features',
            title: 'Using Checkpoints & Time Travel',
            content: `Checkpoints let you save and restore conversation states:

**Creating Checkpoints**
1. Click the checkpoint icon during a conversation
2. Give it a descriptive name
3. The checkpoint is saved

**Using Checkpoints**
- View all checkpoints in the sidebar
- Click to restore that conversation state
- Branch from any checkpoint

**Time Travel**
- Navigate forward/backward through conversation
- See the full history
- Jump to any point

**Use Cases**
- Try different approaches
- Explore multiple solutions
- Undo mistakes
- Branch conversations
- Compare outcomes`,
            keywords: ['checkpoint', 'checkpoints', 'time', 'travel', 'save', 'restore', 'branch', 'history']
        },
        {
            id: 'code-search',
            category: 'Features',
            title: 'Semantic Code Search',
            content: `Search your codebase using natural language:

**Setup**
1. Open Settings → Code Index
2. Configure Qdrant URL
3. Add OpenAI API key
4. Enable indexing

**Indexing**
1. Click "Index Workspace"
2. Wait for indexing to complete
3. View indexed files

**Searching**
1. Use natural language queries
2. Example: "function that validates email addresses"
3. AI finds semantically similar code
4. Results ranked by relevance

**How It Works**
- Uses vector embeddings (OpenAI ada-002)
- Stores in Qdrant vector database
- Cosine similarity matching
- Understands meaning, not just keywords`,
            keywords: ['search', 'code', 'semantic', 'find', 'index', 'qdrant', 'vector', 'embedding']
        },
        {
            id: 'browser-automation',
            category: 'Features',
            title: 'Browser Automation',
            content: `Automate web browsing, scraping, and testing:

**Creating Sessions**
1. Open Browser Automation
2. Configure headless/headed mode
3. Set viewport size
4. Click "Create Session"

**Navigation**
1. Enter URL in address bar
2. Click Go or press Enter
3. Use Back/Forward/Reload
4. Take screenshots

**Web Scraping**
1. Navigate to target page
2. Add CSS selectors
3. Map data fields
4. Click "Scrape Data"

**Automation Scripts**
1. Write JavaScript code
2. Execute in browser context
3. Access page DOM
4. Return results

**Use Cases**
- Automated testing
- Web scraping
- Screenshot capture
- Form automation
- Data collection`,
            keywords: ['browser', 'automation', 'puppeteer', 'scrape', 'scraping', 'screenshot', 'web', 'test']
        },

        // Settings
        {
            id: 'model-settings',
            category: 'Settings',
            title: 'Model Settings',
            content: `Configure AI model behavior:

**Model Provider**
- Anthropic (Claude)
- OpenAI (GPT)
- Custom providers

**Model Selection**
- Claude Sonnet (balanced)
- Claude Opus (most capable)
- Claude Haiku (fastest)

**Parameters**
- Temperature (0.0-1.0): Creativity level
- Max Tokens: Response length
- Top P: Sampling diversity
- Top K: Token selection

**Context Window**
- Maximum context size
- Message trimming
- History management

**API Configuration**
- API keys
- Base URLs
- Headers
- Timeouts`,
            keywords: ['model', 'settings', 'api', 'key', 'temperature', 'tokens', 'parameters', 'claude', 'openai']
        },
        {
            id: 'tool-settings',
            category: 'Settings',
            title: 'Tool Configuration',
            content: `Configure tool behavior and access:

**File Tools**
- Read, Write, Edit permissions
- File size limits
- Allowed directories
- Excluded patterns

**Command Execution**
- Allowed commands
- Timeout settings
- Working directory
- Environment variables

**Web Tools**
- Web search enabled
- Web fetch domains
- Request timeouts
- Rate limiting

**MCP Integration**
- MCP servers
- Custom tools
- Tool permissions
- Server configuration`,
            keywords: ['tool', 'tools', 'settings', 'configuration', 'permissions', 'file', 'command', 'web', 'mcp']
        },

        // Advanced
        {
            id: 'cloud-sync',
            category: 'Advanced',
            title: 'Cloud Sync Setup',
            content: `Synchronize data across devices:

**Setup**
1. Open Cloud Sync settings
2. Enter API endpoint
3. Add API key
4. Click Connect

**Configuration**
- Enable auto-sync
- Set sync interval (1-60 minutes)
- Select items to sync:
  - Settings
  - Prompts
  - Checkpoints
  - Conversations
  - Custom modes
  - Code index

**Conflict Resolution**
1. Conflicts detected automatically
2. View side-by-side comparison
3. Choose local or remote version
4. Resolve conflict

**Statistics**
- Total syncs
- Success rate
- Failed syncs
- Active conflicts
- Last sync time`,
            keywords: ['cloud', 'sync', 'synchronization', 'backup', 'multi-device', 'conflict']
        },
        {
            id: 'organizations',
            category: 'Advanced',
            title: 'Organizations & Teams',
            content: `Collaborate with your team:

**Creating Organization**
1. Open Organizations
2. Click "Create Organization"
3. Enter name and description
4. Set plan (free/pro/enterprise)

**Inviting Members**
1. Click "Invite Member"
2. Enter email address
3. Select role:
   - Owner (full control)
   - Admin (management)
   - Member (standard)
   - Viewer (read-only)
4. Send invitation

**Creating Teams**
1. Click "Create Team"
2. Add team members
3. Assign projects
4. Set permissions

**Shared Workspaces**
1. Create workspace
2. Add members or teams
3. Share resources
4. Collaborate on projects

**Resource Sharing**
- Prompts
- Modes
- Settings
- Checkpoints`,
            keywords: ['organization', 'organizations', 'team', 'teams', 'collaborate', 'share', 'workspace', 'members']
        },

        // Troubleshooting
        {
            id: 'common-issues',
            category: 'Troubleshooting',
            title: 'Common Issues',
            content: `Solutions to common problems:

**AI Not Responding**
- Check API key validity
- Verify internet connection
- Check rate limits
- Review error messages

**Tools Not Working**
- Check tool permissions
- Verify file paths
- Review allowed commands
- Check workspace settings

**Sync Conflicts**
- Review conflict details
- Choose correct version
- Force push if needed
- Contact support

**Performance Issues**
- Reduce context window
- Lower max tokens
- Disable unnecessary features
- Clear cache

**Connection Errors**
- Check API endpoints
- Verify credentials
- Test network connection
- Review firewall settings`,
            keywords: ['issue', 'issues', 'problem', 'problems', 'error', 'errors', 'troubleshoot', 'fix', 'help']
        },
        {
            id: 'keyboard-shortcuts',
            category: 'Troubleshooting',
            title: 'Keyboard Shortcuts',
            content: `Keyboard shortcuts for efficiency:

**Global**
- Cmd/Ctrl+Shift+P: Command palette
- Cmd/Ctrl+K Cmd/Ctrl+O: Open chat
- Cmd/Ctrl+K Cmd/Ctrl+N: New conversation

**Chat**
- Enter: Send message
- Shift+Enter: New line
- Esc: Cancel input
- ↑/↓: Navigate history

**Navigation**
- Cmd/Ctrl+[: Previous conversation
- Cmd/Ctrl+]: Next conversation
- Cmd/Ctrl+Home: First message
- Cmd/Ctrl+End: Last message

**Checkpoints**
- Cmd/Ctrl+S: Create checkpoint
- Cmd/Ctrl+Shift+S: View checkpoints
- Cmd/Ctrl+Z: Undo (time travel)
- Cmd/Ctrl+Shift+Z: Redo (time travel)

**Custom Shortcuts**
Configure in Settings → UI/UX → Keyboard Shortcuts`,
            keywords: ['keyboard', 'shortcuts', 'hotkeys', 'keys', 'commands', 'quick']
        }
    ];

    const categories = Array.from(new Set(helpArticles.map(a => a.category)));

    const handleSearch = (query: string) => {
        setSearchQuery(query);
        if (query.trim() === '') {
            setSearchResults([]);
            return;
        }

        const results = helpArticles.filter(article => {
            const searchLower = query.toLowerCase();
            return (
                article.title.toLowerCase().includes(searchLower) ||
                article.content.toLowerCase().includes(searchLower) ||
                article.keywords.some(k => k.includes(searchLower))
            );
        });

        setSearchResults(results);
        setViewMode('search');
    };

    const renderCategories = () => {
        return (
            <div className="categories-view">
                <h2>Help Center</h2>
                <p className="subtitle">Browse help topics or search for answers</p>

                <div className="search-box">
                    <input
                        type="text"
                        placeholder="Search for help..."
                        value={searchQuery}
                        onChange={(e) => handleSearch(e.target.value)}
                    />
                </div>

                <div className="categories-grid">
                    {categories.map(category => {
                        const articleCount = helpArticles.filter(a => a.category === category).length;
                        return (
                            <div
                                key={category}
                                className="category-card"
                                onClick={() => {
                                    setSelectedCategory(category);
                                    setViewMode('article');
                                }}
                            >
                                <div className="category-icon">
                                    {category === 'Getting Started' && '🚀'}
                                    {category === 'Features' && '✨'}
                                    {category === 'Settings' && '⚙️'}
                                    {category === 'Advanced' && '🎓'}
                                    {category === 'Troubleshooting' && '🔧'}
                                </div>
                                <h3>{category}</h3>
                                <p>{articleCount} articles</p>
                            </div>
                        );
                    })}
                </div>

                <div className="quick-links">
                    <h3>Quick Links</h3>
                    <a onClick={() => vscode.postMessage({ type: 'openDocs' })}>📚 Full Documentation</a>
                    <a onClick={() => vscode.postMessage({ type: 'openGitHub' })}>💻 GitHub Repository</a>
                    <a onClick={() => vscode.postMessage({ type: 'reportIssue' })}>🐛 Report Issue</a>
                    <a onClick={() => vscode.postMessage({ type: 'openCommunity' })}>👥 Community Forum</a>
                </div>
            </div>
        );
    };

    const renderArticleList = () => {
        const articles = helpArticles.filter(a => a.category === selectedCategory);

        return (
            <div className="article-list-view">
                <button className="back-button" onClick={() => setViewMode('categories')}>
                    ← Back to Categories
                </button>

                <h2>{selectedCategory}</h2>

                <div className="articles-list">
                    {articles.map(article => (
                        <div
                            key={article.id}
                            className="article-item"
                            onClick={() => setSelectedArticle(article)}
                        >
                            <h3>{article.title}</h3>
                            <p>{article.content.substring(0, 150)}...</p>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderArticle = () => {
        if (!selectedArticle) return null;

        return (
            <div className="article-view">
                <button
                    className="back-button"
                    onClick={() => {
                        setSelectedArticle(null);
                        setViewMode('article');
                    }}
                >
                    ← Back to {selectedCategory}
                </button>

                <article className="article-content">
                    <h1>{selectedArticle.title}</h1>
                    <div className="article-text">
                        {selectedArticle.content.split('\n').map((line, index) => {
                            if (line.startsWith('**') && line.endsWith('**')) {
                                return <h3 key={index}>{line.replace(/\*\*/g, '')}</h3>;
                            } else if (line.startsWith('# ')) {
                                return <h2 key={index}>{line.substring(2)}</h2>;
                            } else if (line.trim().startsWith('- ')) {
                                return <li key={index}>{line.substring(2)}</li>;
                            } else if (line.trim().startsWith('1. ') || line.match(/^\d+\. /)) {
                                const number = line.match(/^(\d+)\. /);
                                return <li key={index} value={number ? parseInt(number[1]) : undefined}>{line.replace(/^\d+\. /, '')}</li>;
                            } else if (line.trim() === '') {
                                return <br key={index} />;
                            } else {
                                return <p key={index}>{line}</p>;
                            }
                        })}
                    </div>
                </article>

                <div className="article-footer">
                    <p>Was this article helpful?</p>
                    <div className="feedback-buttons">
                        <button onClick={() => vscode.postMessage({ type: 'helpfulArticle', data: { id: selectedArticle.id, helpful: true } })}>
                            👍 Yes
                        </button>
                        <button onClick={() => vscode.postMessage({ type: 'helpfulArticle', data: { id: selectedArticle.id, helpful: false } })}>
                            👎 No
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    const renderSearchResults = () => {
        return (
            <div className="search-results-view">
                <button className="back-button" onClick={() => {
                    setSearchQuery('');
                    setViewMode('categories');
                }}>
                    ← Back to Help Center
                </button>

                <h2>Search Results</h2>
                <p className="subtitle">Found {searchResults.length} articles matching "{searchQuery}"</p>

                {searchResults.length === 0 ? (
                    <div className="no-results">
                        <p>No articles found. Try different keywords.</p>
                    </div>
                ) : (
                    <div className="search-results-list">
                        {searchResults.map(article => (
                            <div
                                key={article.id}
                                className="search-result-item"
                                onClick={() => {
                                    setSelectedArticle(article);
                                    setSelectedCategory(article.category);
                                }}
                            >
                                <div className="result-category">{article.category}</div>
                                <h3>{article.title}</h3>
                                <p>{article.content.substring(0, 200)}...</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="help-center-container">
            {viewMode === 'categories' && renderCategories()}
            {viewMode === 'article' && !selectedArticle && renderArticleList()}
            {selectedArticle && renderArticle()}
            {viewMode === 'search' && renderSearchResults()}
        </div>
    );
};
