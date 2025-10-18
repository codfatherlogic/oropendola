const sharp = require('sharp');
const fs = require('fs');

async function convertIcon() {
    const svgBuffer = fs.readFileSync('./media/icon.svg');
    await sharp(svgBuffer)
        .resize(128, 128)
        .png()
        .toFile('./media/icon.png');
    console.log('Icon converted successfully!');
}

convertIcon().catch(console.error);
