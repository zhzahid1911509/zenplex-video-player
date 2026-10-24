import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
const sourceArg = process.argv[2];
if (!sourceArg) {
  console.error('Usage: npm run native:install -- "C:\\path\\to\\extracted-libmpv"');
  process.exit(1);
}
const source = path.resolve(sourceArg),
  target = path.resolve('native/player-host/out');
let sourceName = 'mpv-2.dll';
try {
  await fs.access(path.join(source, sourceName));
} catch {
  sourceName = 'libmpv-2.dll';
}
const dll = await fs.readFile(path.join(source, sourceName));
const offset = dll.length >= 64 ? dll.readUInt32LE(60) : 0;
if (
  dll.toString('ascii', 0, 2) !== 'MZ' ||
  offset + 6 > dll.length ||
  dll.toString('ascii', offset, offset + 4) !== 'PE\0\0' ||
  dll.readUInt16LE(offset + 4) !== 0x8664
)
  throw Error('mpv-2.dll must be a Windows x64 binary.');
await fs.mkdir(target, { recursive: true });
const copied = [];
for (const item of await fs.readdir(source, { withFileTypes: true })) {
  if (item.isFile() && /\.dll$/i.test(item.name)) {
    const input = path.join(source, item.name),
      output = path.join(target, item.name);
    if (input !== output) await fs.copyFile(input, output);
    const bytes = await fs.readFile(output);
    copied.push({
      file: item.name,
      sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
    });
  }
}
if (sourceName !== 'mpv-2.dll') {
  await fs.copyFile(path.join(source, sourceName), path.join(target, 'mpv-2.dll'));
  copied.push({ file: 'mpv-2.dll', sha256: crypto.createHash('sha256').update(dll).digest('hex') });
}
await fs.writeFile(
  path.join(target, 'runtime-manifest.json'),
  JSON.stringify(
    {
      note: 'User-supplied runtime; hashes identify bytes, not publisher trust or license compliance.',
      files: copied,
    },
    null,
    2,
  ),
);
console.log(
  `Installed ${copied.length} DLL(s). No downloaded executable was run. Preserve the distribution licenses and corresponding sources. Run npm run native:doctor next.`,
);
