const lzwCompress = require('lzwcompress');
const fs = require('fs');

// Path to the und.js file
const undPath = 'workspaces/fixtures/test-data/big-tincan/locales/und.js';

// Read the und.js file
const js = fs.readFileSync(undPath, 'utf8');
const match = js.match(/__resolveJsonp\("course:und","([^"]+)"\)/);
if (!match) throw new Error('Encoded data not found');
const encoded = match[1];

// Decompress the data
const decompressed = JSON.parse(lzwCompress.unpack(encoded));

// Pretty-print the decompressed JSON
console.log(JSON.stringify(decompressed, null, 2)); 
