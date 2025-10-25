// Test script to validate the HTML generation
const fs = require('fs');

// Read the sidebar-provider file
const content = fs.readFileSync('./src/sidebar/sidebar-provider.js', 'utf8');

// Extract the HTML string building part
const lines = content.split('\n');
let inHtmlSection = false;
let braceCount = 0;
let parenCount = 0;
let bracketCount = 0;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.includes("const html = '<!DOCTYPE")) {
        inHtmlSection = true;
        console.log(`HTML section starts at line ${i + 1}`);
    }

    if (inHtmlSection) {
        // Count braces, parens, brackets in the string content
        const matches = line.match(/'[^']*'/g);
        if (matches) {
            matches.forEach(str => {
                // Remove the outer quotes
                const content = str.slice(1, -1);
                braceCount += (content.match(/\{/g) || []).length;
                braceCount -= (content.match(/\}/g) || []).length;
                parenCount += (content.match(/\(/g) || []).length;
                parenCount -= (content.match(/\)/g) || []).length;
                bracketCount += (content.match(/\[/g) || []).length;
                bracketCount -= (content.match(/\]/g) || []).length;
            });
        }
    }

    if (inHtmlSection && line.includes('return html;')) {
        console.log(`HTML section ends at line ${i + 1}`);
        console.log(`Brace balance: ${braceCount}`);
        console.log(`Paren balance: ${parenCount}`);
        console.log(`Bracket balance: ${bracketCount}`);
        if (braceCount !== 0) {console.log('❌ UNBALANCED BRACES!');}
        if (parenCount !== 0) {console.log('❌ UNBALANCED PARENTHESES!');}
        if (bracketCount !== 0) {console.log('❌ UNBALANCED BRACKETS!');}
        break;
    }
}
