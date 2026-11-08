import fs from 'fs';
import zlib from 'zlib';

function crc32(buf) {
  let table = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    table[n] = c;
  }
  let crc = 0 ^ (-1);
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ (-1)) >>> 0;
}

function createChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);

  const crcPayload = Buffer.concat([typeBuf, data]);
  const crcVal = crc32(crcPayload);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crcVal, 0);

  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function generatePNG(width, height, isMaskable = false) {
  // Raw scanlines with filter byte 0
  const scanlineLength = 1 + width * 4;
  const rawData = Buffer.alloc(height * scanlineLength);

  const cx = width / 2;
  const cy = height / 2;
  const maxR = width / 2;
  const safeRadius = isMaskable ? maxR * 0.72 : maxR * 0.88;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * scanlineLength;
    rawData[rowOffset] = 0; // Filter: None

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Deep gradient background
      const gradFactor = Math.min(1, Math.max(0, (y / height) * 0.7 + (dist / maxR) * 0.3));
      // Base: dark slate to deep purple (#0f0f15 to #2e1065)
      let r = Math.round(15 + gradFactor * 30);
      let g = Math.round(15 + gradFactor * 10);
      let b = Math.round(24 + gradFactor * 75);
      let a = 255;

      if (!isMaskable) {
        // Squircle outer boundary
        const squircleDist = Math.pow(Math.abs(dx / (maxR * 0.94)), 4) + Math.pow(Math.abs(dy / (maxR * 0.94)), 4);
        if (squircleDist > 1) {
          // Soft antialiased edge
          const alphaFade = Math.max(0, 1 - (squircleDist - 1) * 12);
          a = Math.round(255 * alphaFade);
        }
      }

      // Outer golden circle ring
      const ringOuter = safeRadius;
      const ringInner = safeRadius - Math.max(3, width * 0.016);
      if (dist <= ringOuter && dist >= ringInner) {
        // Gold color #fbbf24 to #d97706
        const angle = Math.atan2(dy, dx);
        const shimmer = 0.5 + 0.5 * Math.sin(angle * 3);
        r = Math.round(217 + shimmer * 38);
        g = Math.round(119 + shimmer * 72);
        b = Math.round(6 + shimmer * 30);
      }

      // Inner thin violet ring
      const vRingOuter = safeRadius - Math.max(7, width * 0.035);
      const vRingInner = vRingOuter - Math.max(2, width * 0.008);
      if (dist <= vRingOuter && dist >= vRingInner) {
        r = 192; g = 132; b = 252; // #c084fc
      }

      // Center disc #151324
      const discR = safeRadius - Math.max(12, width * 0.05);
      if (dist <= discR) {
        const discGrad = dist / discR;
        r = Math.round(21 - discGrad * 8);
        g = Math.round(19 - discGrad * 8);
        b = Math.round(36 - discGrad * 12);
      }

      // Monogram "FA" in center:
      // Normalized coordinates within center disc (-1 to 1)
      const nx = dx / (discR * 0.7);
      const ny = dy / (discR * 0.7);

      // Letter F: left side [-0.65 to -0.05], y from [-0.6 to 0.4]
      let isF = false;
      // F vertical bar: nx in [-0.55, -0.4], ny in [-0.6, 0.4]
      if (nx >= -0.55 && nx <= -0.4 && ny >= -0.6 && ny <= 0.4) isF = true;
      // F top bar: nx in [-0.4, 0.0], ny in [-0.6, -0.45]
      if (nx >= -0.4 && nx <= 0.0 && ny >= -0.6 && ny <= -0.45) isF = true;
      // F mid bar: nx in [-0.4, -0.08], ny in [-0.15, -0.02]
      if (nx >= -0.4 && nx <= -0.08 && ny >= -0.15 && ny <= -0.02) isF = true;

      // Letter A: right side [0.0 to 0.65], y from [-0.6 to 0.4]
      let isA = false;
      // A apex is at nx = 0.35, ny = -0.6. Bottom legs at nx=0.1 and nx=0.6, ny=0.4
      if (ny >= -0.6 && ny <= 0.4) {
        const progress = (ny - (-0.6)) / 1.0; // 0 to 1
        const leftLegX = 0.35 - progress * 0.28;
        const rightLegX = 0.35 + progress * 0.28;
        const thickness = 0.08;
        if (Math.abs(nx - leftLegX) <= thickness / 2 || Math.abs(nx - rightLegX) <= thickness / 2) {
          isA = true;
        }
        // Crossbar of A
        if (ny >= -0.05 && ny <= 0.08 && nx >= leftLegX && nx <= rightLegX) {
          isA = true;
        }
      }

      if (isF) {
        // Rosado #E91E63
        r = 233; g = 30; b = 99;
      } else if (isA) {
        // Azul #1E90FF
        r = 30; g = 144; b = 255;
      }

      // Small jewel / sparkle above monogram (Azul #00B0FF)
      if (Math.abs(dx) <= maxR * 0.06 && dy <= -safeRadius * 0.62 && dy >= -safeRadius * 0.78) {
        r = 0; g = 176; b = 255;
      }

      rawData[pxOffset] = r;
      rawData[pxOffset + 1] = g;
      rawData[pxOffset + 2] = b;
      rawData[pxOffset + 3] = a;
    }
  }

  // PNG Header
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  // IHDR
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // Bit depth: 8
  ihdrData[9] = 6; // Color type: 6 (RGBA)
  ihdrData[10] = 0; // Compression: Deflate
  ihdrData[11] = 0; // Filter: None
  ihdrData[12] = 0; // Interlace: None
  const ihdrChunk = createChunk('IHDR', ihdrData);

  // IDAT
  const compressed = zlib.deflateSync(rawData, { level: 9 });
  const idatChunk = createChunk('IDAT', compressed);

  // IEND
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

// Generate files
const p192 = generatePNG(192, 192, false);
fs.writeFileSync('public/icon-192.png', p192);

const p512 = generatePNG(512, 512, false);
fs.writeFileSync('public/icon-512.png', p512);

const pMask512 = generatePNG(512, 512, true);
fs.writeFileSync('public/icon-maskable-512.png', pMask512);

const pApple = generatePNG(180, 180, false);
fs.writeFileSync('public/apple-touch-icon.png', pApple);

const pFavicon = generatePNG(64, 64, false);
fs.writeFileSync('public/favicon.png', pFavicon);

console.log('✅ All PNG icons generated successfully for Spotyy_AA!');
