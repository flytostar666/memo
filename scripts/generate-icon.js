const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");

const size = 256;
const scale = 4;
const pixels = Buffer.alloc(size * size * 4);

function inRoundedRect(x, y, left, top, right, bottom, radius) {
  const clampedX = Math.max(left + radius, Math.min(x, right - radius));
  const clampedY = Math.max(top + radius, Math.min(y, bottom - radius));
  return (x - clampedX) ** 2 + (y - clampedY) ** 2 <= radius ** 2;
}

function inLine(x, y, left, right, top, thickness = 1.7) {
  return x >= left && x <= right && Math.abs(y - top) <= thickness;
}

function setPixel(x, y, color) {
  const offset = (y * size + x) * 4;
  pixels[offset] = color[0];
  pixels[offset + 1] = color[1];
  pixels[offset + 2] = color[2];
  pixels[offset + 3] = color[3];
}

for (let y = 0; y < size; y += 1) {
  for (let x = 0; x < size; x += 1) {
    let greenHits = 0;
    let paperHits = 0;
    let warmHits = 0;

    for (let sampleY = 0; sampleY < scale; sampleY += 1) {
      for (let sampleX = 0; sampleX < scale; sampleX += 1) {
        const px = x + (sampleX + 0.5) / scale;
        const py = y + (sampleY + 0.5) / scale;
        const inGreen = inRoundedRect(px, py, 18, 18, 238, 238, 54);

        if (inGreen) {
          greenHits += 1;
        }

        const inPaper =
          inRoundedRect(px, py, 67, 51, 189, 202, 21) ||
          (px >= 77 && px <= 180 && py >= 68 && py <= 82);
        const isNotch = px >= 106 && px <= 150 && py <= 38;
        const isBookmarkCut =
          py > 150 &&
          py < 202 &&
          Math.abs(px - 128) < (py - 150) * 0.92;

        if (inPaper && !isNotch && !isBookmarkCut) {
          paperHits += 1;
        }

        if (
          (inLine(px, py, 94, 162, 103) ||
            inLine(px, py, 94, 146, 126) ||
            inLine(px, py, 94, 136, 149)) &&
          !isBookmarkCut
        ) {
          warmHits += 1;
        }
      }
    }

    const total = scale * scale;
    const greenCoverage = greenHits / total;
    const paperCoverage = paperHits / total;
    const warmCoverage = warmHits / total;
    const alpha = Math.round(greenCoverage * 255);
    const base = [50, 89, 75];
    const paper = [255, 252, 243];
    const warm = [201, 122, 74];

    setPixel(x, y, [
      Math.round(base[0] + (paper[0] - base[0]) * paperCoverage + (warm[0] - paper[0]) * warmCoverage),
      Math.round(base[1] + (paper[1] - base[1]) * paperCoverage + (warm[1] - paper[1]) * warmCoverage),
      Math.round(base[2] + (paper[2] - base[2]) * paperCoverage + (warm[2] - paper[2]) * warmCoverage),
      alpha,
    ]);
  }
}

function crc32(buffer) {
  let crc = 0xffffffff;

  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type);
  const length = Buffer.alloc(4);
  const checksum = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])));
  return Buffer.concat([length, typeBuffer, data, checksum]);
}

const scanlines = Buffer.alloc(size * (size * 4 + 1));
for (let y = 0; y < size; y += 1) {
  const rowOffset = y * (size * 4 + 1);
  scanlines[rowOffset] = 0;
  pixels.copy(scanlines, rowOffset + 1, y * size * 4, (y + 1) * size * 4);
}

const header = Buffer.alloc(13);
header.writeUInt32BE(size, 0);
header.writeUInt32BE(size, 4);
header[8] = 8;
header[9] = 6;

const png = Buffer.concat([
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
  pngChunk("IHDR", header),
  pngChunk("IDAT", zlib.deflateSync(scanlines, { level: 9 })),
  pngChunk("IEND", Buffer.alloc(0)),
]);

const iconDirectory = Buffer.alloc(22);
iconDirectory.writeUInt16LE(0, 0);
iconDirectory.writeUInt16LE(1, 2);
iconDirectory.writeUInt16LE(1, 4);
iconDirectory[6] = 0;
iconDirectory[7] = 0;
iconDirectory[8] = 0;
iconDirectory[9] = 0;
iconDirectory.writeUInt16LE(1, 10);
iconDirectory.writeUInt16LE(32, 12);
iconDirectory.writeUInt32LE(png.length, 14);
iconDirectory.writeUInt32LE(22, 18);

const buildDirectory = path.join(__dirname, "..", "build");
fs.mkdirSync(buildDirectory, { recursive: true });
fs.writeFileSync(path.join(buildDirectory, "icon.png"), png);
fs.writeFileSync(path.join(buildDirectory, "icon.ico"), Buffer.concat([iconDirectory, png]));

console.log("已生成 build/icon.png 和 build/icon.ico");
