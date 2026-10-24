import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const directory = path.resolve('native/player-host/out');
let good = true;
for (const name of ['zenplex-player-host.exe', 'mpv-2.dll', 'input.conf']) {
  const file = path.join(directory, name);
  if (!fs.existsSync(file)) {
    console.error(`Missing ${name}`);
    good = false;
    continue;
  }
  const bytes = fs.readFileSync(file);
  if (/\.(exe|dll)$/.test(name)) {
    const offset = bytes.length >= 64 ? bytes.readUInt32LE(60) : 0;
    if (
      bytes.toString('ascii', 0, 2) !== 'MZ' ||
      offset + 6 > bytes.length ||
      bytes.toString('ascii', offset, offset + 4) !== 'PE\0\0' ||
      bytes.readUInt16LE(offset + 4) !== 0x8664
    ) {
      console.error(`${name}: expected a Windows x64 PE binary.`);
      good = false;
      continue;
    }
  }
  console.log(
    `${name}: present; SHA-256 ${crypto.createHash('sha256').update(bytes).digest('hex')}`,
  );
}
console.log(
  'This checks files and architecture only. Run npm run test:native on Windows to verify engine startup and playback.',
);
if (!good) {
  console.error('See docs/WINDOWS_NATIVE.md for runtime setup.');
  process.exitCode = 1;
}
