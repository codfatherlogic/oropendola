const esbuild = require('esbuild');
const fs = require('fs');

// Configuration
const production = process.env.NODE_ENV === 'production';
const watch = process.argv.includes('--watch');

console.log(`[esbuild] Mode: ${production ? 'PRODUCTION' : 'DEVELOPMENT'}`);
console.log(`[esbuild] Watch: ${watch ? 'ENABLED' : 'DISABLED'}`);

// Extension build configuration
const extensionConfig = {
    entryPoints: ['./extension.js'],
    bundle: true,
    outfile: './dist/extension.js',
    format: 'cjs', // CommonJS format for Node.js
    platform: 'node', // Node.js platform
    target: 'node16', // Node 16+ (VS Code requirement)
    sourcemap: !production, // Source maps for development
    minify: production, // Minify in production
    treeShaking: true, // Remove unused code
    logLevel: 'info',
    define: {
        'process.env.NODE_ENV': JSON.stringify(production ? 'production' : 'development')
    },
    // External node modules that should not be bundled
    external: [
        'vscode',
        'node:*', // Node built-ins
        // Keep these external as they have native dependencies
        'tree-sitter-wasms',
        'web-tree-sitter',
        'fsevents' // macOS file system events
    ]
};

// Build function
async function build() {
    try {
        console.log('[esbuild] Building extension...');

        // Clean dist directory
        if (fs.existsSync('./dist')) {
            fs.rmSync('./dist', { recursive: true });
            console.log('[esbuild] Cleaned dist directory');
        }
        fs.mkdirSync('./dist', { recursive: true });

        if (watch) {
            // Watch mode
            const ctx = await esbuild.context(extensionConfig);
            await ctx.watch();
            console.log('[esbuild] Watching for changes...');
        } else {
            // Single build
            const result = await esbuild.build(extensionConfig);

            // Log bundle size
            const stats = fs.statSync('./dist/extension.js');
            const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
            console.log(`[esbuild] ✅ Extension built successfully!`);
            console.log(`[esbuild] Bundle size: ${sizeMB} MB`);

            if (result.metafile) {
                // Analyze bundle if metafile is generated
                const analysis = await esbuild.analyzeMetafile(result.metafile);
                console.log('[esbuild] Bundle analysis:');
                console.log(analysis);
            }
        }

    } catch (error) {
        console.error('[esbuild] ❌ Build failed:', error);
        process.exit(1);
    }
}

// Run build
build();
