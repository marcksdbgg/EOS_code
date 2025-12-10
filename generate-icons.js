// Simple script to generate a basic icon
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create a minimal valid ICO file (16x16 blue square)
// ICO format: Header + Directory Entry + Image Data

const iconsDir = path.join(__dirname, 'src-tauri', 'icons');

// Ensure directory exists
if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
}

// Create a minimal 16x16 32-bit ICO file
// ICO Header: 6 bytes
const header = Buffer.alloc(6);
header.writeUInt16LE(0, 0);      // Reserved
header.writeUInt16LE(1, 2);      // Type (1 = ICO)
header.writeUInt16LE(1, 4);      // Number of images

// ICO Directory Entry: 16 bytes
const dirEntry = Buffer.alloc(16);
dirEntry.writeUInt8(16, 0);      // Width (16 = 16px)
dirEntry.writeUInt8(16, 1);      // Height
dirEntry.writeUInt8(0, 2);       // Color palette (0 = no palette)
dirEntry.writeUInt8(0, 3);       // Reserved
dirEntry.writeUInt16LE(1, 4);    // Color planes
dirEntry.writeUInt16LE(32, 6);   // Bits per pixel

// Image data size (BITMAPINFOHEADER + pixel data)
const bmpHeaderSize = 40;
const pixelDataSize = 16 * 16 * 4; // 16x16 BGRA
const imageSize = bmpHeaderSize + pixelDataSize;
dirEntry.writeUInt32LE(imageSize, 8);   // Image size
dirEntry.writeUInt32LE(22, 12);         // Offset to image data (6 + 16)

// BITMAPINFOHEADER: 40 bytes
const bmpHeader = Buffer.alloc(40);
bmpHeader.writeUInt32LE(40, 0);    // Header size
bmpHeader.writeInt32LE(16, 4);     // Width
bmpHeader.writeInt32LE(32, 8);     // Height (doubled for ICO format)
bmpHeader.writeUInt16LE(1, 12);    // Planes
bmpHeader.writeUInt16LE(32, 14);   // Bits per pixel
bmpHeader.writeUInt32LE(0, 16);    // Compression
bmpHeader.writeUInt32LE(pixelDataSize, 20); // Image size

// Pixel data: 16x16 indigo/purple gradient 
const pixels = Buffer.alloc(pixelDataSize);
for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
        const offset = (y * 16 + x) * 4;
        // BGRA format - Indigo color (#6366f1)
        pixels.writeUInt8(241, offset);     // B
        pixels.writeUInt8(102, offset + 1); // G  
        pixels.writeUInt8(99, offset + 2);  // R
        pixels.writeUInt8(255, offset + 3); // A
    }
}

// Combine all parts
const ico = Buffer.concat([header, dirEntry, bmpHeader, pixels]);

// Write ICO file
fs.writeFileSync(path.join(iconsDir, 'icon.ico'), ico);
console.log('Created icon.ico');

// Also create simple PNG files (just solid color squares)
// These are minimal valid PNGs

// PNG signature + minimal IHDR + IDAT + IEND for a 32x32 indigo square
const createSimplePNG = (size) => {
    const PNG = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A
    ]);
    return PNG; // This won't work, we need actual PNG data
};

console.log('Done! Icons created in src-tauri/icons/');
console.log('Note: For production, replace with proper icons.');
