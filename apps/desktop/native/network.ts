import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
/** Public IPv4 only for native URL input in this milestone. Not a general SSRF firewall. */
export function publicV4(address: string): boolean {
  if (isIP(address) !== 4) return false;
  const [a = 0, b = 0, c = 0] = address.split('.').map(Number);
  return !(
    a === 0 ||
    a === 10 ||
    a === 127 ||
    a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && (b === 168 || b === 0 || (b === 88 && c === 99))) ||
    (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
    (a === 203 && b === 0 && c === 113)
  );
}
export async function validateNativeUrl(value: string, resolve = lookup) {
  const url = new URL(value.trim());
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    (url.port && url.port !== '443') ||
    isIP(url.hostname) ||
    url.hostname.startsWith('[') ||
    url.hostname === 'localhost' ||
    url.hostname.endsWith('.local') ||
    url.hostname.endsWith('.localhost') ||
    /\.(m3u8?|mpd)$/i.test(url.pathname)
  )
    throw new Error('Use a public HTTPS direct-media URL on port 443.');
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const records = await Promise.race([
      resolve(url.hostname, { all: true, family: 4 }),
      new Promise<never>((_r, reject) => {
        timer = setTimeout(() => reject(new Error('DNS lookup timed out.')), 5000);
      }),
    ]);
    if (!records.length || records.some((record) => !publicV4(record.address)))
      throw new Error('Local or reserved network addresses are not supported.');
  } finally {
    clearTimeout(timer);
  }
  return url.href;
}
