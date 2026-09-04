const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const zlib = require('zlib');

const REPO_ROOT = path.resolve(__dirname, '..');
const OUTPUT_ZIP = path.join(REPO_ROOT, 'merchantiq-submission.zip');

// Prefer python zipfile script if available, as it is standard and bulletproof
try {
  cp.execSync('python --version', { stdio: 'ignore' });
  console.log('Running python archive packaging script (strict forward-slash enforcement)...');
  cp.execSync(`python "${path.join(__dirname, 'create_submission_zip.py')}"`, { stdio: 'inherit' });
  process.exit(0);
} catch (e) {
  console.log('Python not available, falling back to pure Node.js zip generator with forward slashes...');
}

// Pure Node.js fallback with strict forward-slash '/' paths and standard PKZIP format
const FORBIDDEN_DIRS = new Set(['node_modules', 'dist', 'coverage', '.git', '.vite', '_staging_submission']);
const FORBIDDEN_EXTS = new Set(['.db', '.zip', '.log', '.tmp', '.webm', '.mp4']);

function shouldExclude(relPath) {
  const parts = relPath.replace(/\\/g, '/').split('/');
  for (const part of parts) {
    if (FORBIDDEN_DIRS.has(part)) return true;
  }
  const filename = parts[parts.length - 1];
  if (filename === '.env') return true;
  if (filename.includes('.db')) return true;
  for (const ext of FORBIDDEN_EXTS) {
    if (filename.endsWith(ext)) return true;
  }
  return false;
}

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const relPath = path.relative(REPO_ROOT, fullPath);
    if (shouldExclude(relPath)) continue;
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(walk(fullPath));
    } else {
      results.push({
        fullPath,
        arcname: relPath.replace(/\\/g, '/') // Strictly enforce '/'
      });
    }
  }
  return results;
}

const files = walk(REPO_ROOT).sort((a, b) => a.arcname.localeCompare(b.arcname));
console.log(`Found ${files.length} clean source files for pure Node packaging.`);

if (fs.existsSync(OUTPUT_ZIP)) {
  fs.unlinkSync(OUTPUT_ZIP);
}

// Pure Node PKZIP Builder with Deflate and CRC32
let localParts = [];
let centralParts = [];
let offset = 0;

for (const f of files) {
  const data = fs.readFileSync(f.fullPath);
  const crc = zlib.crc32(data);
  const deflated = zlib.deflateRawSync(data);
  const useCompressed = deflated.length < data.length;
  const compData = useCompressed ? deflated : data;
  const method = useCompressed ? 8 : 0;
  const nameBuf = Buffer.from(f.arcname, 'utf8');

  // Local File Header
  const lfh = Buffer.alloc(30);
  lfh.writeUInt32LE(0x04034b50, 0);
  lfh.writeUInt16LE(20, 4); // version needed
  lfh.writeUInt16LE(0x0800, 6); // general purpose bit flag (UTF-8)
  lfh.writeUInt16LE(method, 8); // compression method
  lfh.writeUInt16LE(0, 10); // time
  lfh.writeUInt16LE(0, 12); // date
  lfh.writeUInt32LE(crc, 14); // crc-32
  lfh.writeUInt32LE(compData.length, 18); // compressed size
  lfh.writeUInt32LE(data.length, 22); // uncompressed size
  lfh.writeUInt16LE(nameBuf.length, 26); // file name length
  lfh.writeUInt16LE(0, 28); // extra field length

  localParts.push(lfh, nameBuf, compData);

  // Central Directory Header
  const cdh = Buffer.alloc(46);
  cdh.writeUInt32LE(0x02014b50, 0);
  cdh.writeUInt16LE(20, 4); // version made by (UNIX style / spec 2.0)
  cdh.writeUInt16LE(20, 6); // version needed
  cdh.writeUInt16LE(0x0800, 8); // general purpose bit flag (UTF-8)
  cdh.writeUInt16LE(method, 10); // compression method
  cdh.writeUInt16LE(0, 12); // time
  cdh.writeUInt16LE(0, 14); // date
  cdh.writeUInt32LE(crc, 16); // crc-32
  cdh.writeUInt32LE(compData.length, 20); // compressed size
  cdh.writeUInt32LE(data.length, 24); // uncompressed size
  cdh.writeUInt16LE(nameBuf.length, 28); // file name length
  cdh.writeUInt16LE(0, 30); // extra field length
  cdh.writeUInt16LE(0, 32); // comment length
  cdh.writeUInt16LE(0, 34); // disk number start
  cdh.writeUInt16LE(0, 36); // internal file attributes
  cdh.writeUInt32LE(0, 38); // external file attributes
  cdh.writeUInt32LE(offset, 42); // relative offset of local header

  centralParts.push(cdh, nameBuf);
  offset += lfh.length + nameBuf.length + compData.length;
}

const centralStart = offset;
const centralSize = centralParts.reduce((sum, b) => sum + b.length, 0);

// End of Central Directory
const eocd = Buffer.alloc(22);
eocd.writeUInt32LE(0x06054b50, 0);
eocd.writeUInt16LE(0, 4);
eocd.writeUInt16LE(0, 6);
eocd.writeUInt16LE(files.length, 8);
eocd.writeUInt16LE(files.length, 10);
eocd.writeUInt32LE(centralSize, 12);
eocd.writeUInt32LE(centralStart, 16);
eocd.writeUInt16LE(0, 20);

const totalZip = Buffer.concat([...localParts, ...centralParts, eocd]);
fs.writeFileSync(OUTPUT_ZIP, totalZip);
console.log(`Clean archive successfully generated at: ${OUTPUT_ZIP}`);
