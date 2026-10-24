import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { access, readFile, writeFile, mkdtemp, rm, rename, copyFile } from 'node:fs/promises';
import yauzl from 'yauzl';
import { createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { mkdir } from 'node:fs/promises';

// Only regular files/directories are allowed; this installer targets Windows archives.
export function extractZip(archive, destination) {
  return new Promise((resolve, reject) => {
    yauzl.open(archive, { lazyEntries: true, strictFileNames: true }, (error, zip) => {
      if (error) {
        reject(error);
        return;
      }
      let failed = false;
      const fail = (error) => {
        if (!failed) {
          failed = true;
          zip.close();
          reject(error);
        }
      };
      zip.on('error', fail);
      zip.on('end', () => {
        if (!failed) resolve();
      });
      zip.on('entry', (entry) => {
        void (async () => {
          const name = entry.fileName;
          const mode = (entry.externalFileAttributes >>> 16) & 0xf000;
          if (
            (mode && mode !== 0x8000 && mode !== 0x4000) ||
            name.includes('\\') ||
            name.includes(':') ||
            name.includes('\0') ||
            name.startsWith('/') ||
            name.split('/').some((part) => part === '..' || /[. ]$/.test(part))
          )
            throw new Error('Unsafe archive entry rejected.');
          const output = path.resolve(destination, name);
          if (!output.startsWith(path.resolve(destination) + path.sep))
            throw new Error('Archive path escapes destination.');
          if (name.endsWith('/')) await mkdir(output, { recursive: true });
          else {
            await mkdir(path.dirname(output), { recursive: true });
            const stream = await new Promise((yes, no) =>
              zip.openReadStream(entry, (err, value) => (err ? no(err) : yes(value))),
            );
            await pipeline(stream, createWriteStream(output, { flags: 'wx' }));
          }
          if (!failed) zip.readEntry();
        })().catch(fail);
      });
      zip.readEntry();
    });
  });
}
// Use Electron's own downloader and pinned checksums; avoid its native ZIP extractor.
const require = createRequire(import.meta.url);
const packagePath = require.resolve('electron/package.json');
const electronRequire = createRequire(packagePath);
const directory = path.dirname(packagePath);
const { version } = electronRequire('./package.json');
const { downloadArtifact } = electronRequire('@electron/get');
const executables = {
  win32: 'electron.exe',
  linux: 'electron',
  darwin: 'Electron.app/Contents/MacOS/Electron',
};

export async function extractRuntime(archive, target, executable, expectedVersion) {
  const staging = await mkdtemp(path.join(target, '.zenplex-electron-'));
  try {
    await extractZip(archive, staging);
    await access(path.join(staging, executable));
    const actual = (await readFile(path.join(staging, 'version'), 'utf8')).trim().replace(/^v/, '');
    if (actual !== expectedVersion)
      throw new Error('Downloaded Electron version does not match the lockfile.');
    try {
      await copyFile(path.join(staging, 'electron.d.ts'), path.join(target, 'electron.d.ts'));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
    // Only replace Electron's generated runtime after complete extraction and validation.
    await rm(path.join(target, 'dist'), { recursive: true, force: true });
    await rename(staging, path.join(target, 'dist'));
    await writeFile(path.join(target, 'path.txt'), executable);
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}
async function install() {
  if (process.platform !== 'win32')
    throw new Error(
      'This repair installer targets Windows. On other systems use node node_modules/electron/install.js.',
    );
  const executable = executables[process.platform];
  if (!executable) throw new Error(`Unsupported Electron platform: ${process.platform}`);
  try {
    const installed = (await readFile(path.join(directory, 'dist/version'), 'utf8'))
      .trim()
      .replace(/^v/, '');
    const installedPath = await readFile(path.join(directory, 'path.txt'), 'utf8');
    await access(path.join(directory, 'dist', executable));
    if (installed === version && installedPath.trim() === executable) {
      console.log(`Electron ${version} is installed.`);
      return;
    }
  } catch {
    /* Missing or incomplete runtime: install below. */
  }
  console.log(
    `Installing Electron ${version} for ${process.platform}-${process.arch} using JavaScript ZIP extraction…`,
  );
  const archive = await downloadArtifact({
    version,
    artifactName: 'electron',
    platform: process.platform,
    arch: process.arch,
    checksums: electronRequire('./checksums.json'),
  });
  await extractRuntime(archive, directory, executable, version);
  console.log('Electron runtime installed.');
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  install().catch((error) => {
    console.error('Electron installation failed:', error.message);
    process.exitCode = 1;
  });
}
