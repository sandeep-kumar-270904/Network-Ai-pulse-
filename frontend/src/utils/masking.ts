/**
 * Deterministic Demo Mode masking helpers for hostnames, IPs, and MAC addresses.
 * Ensures screenshots never expose internal LAN topology, hostnames, or hardware IDs.
 */

const hashString = (input: string): number => {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

const padHex = (n: number): string => (n & 0xff).toString(16).toUpperCase().padStart(2, '0');

export const maskIpv4 = (ip: string): string => {
  const clean = ip.trim();
  const h = hashString(clean);
  if (clean === '127.0.0.1' || clean === 'localhost') {
    return '10.250.0.1';
  }
  if (/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(clean)) {
    const octet3 = (h % 200) + 1;
    const octet4 = ((h >>> 8) % 240) + 10;
    return `10.240.${octet3}.${octet4}`;
  }
  // Public IPs mapped into RFC 5737 TEST-NET-2 / TEST-NET-3 documentation blocks
  const netBlock = h % 2 === 0 ? '198.51.100' : '203.0.113';
  const hostByte = ((h >>> 4) % 240) + 10;
  return `${netBlock}.${hostByte}`;
};

export const isMacAddress = (value?: string | null): boolean => {
  if (!value) return false;
  return /^([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}$/.test(value.trim());
};

export const maskMac = (mac: string): string => {
  const clean = mac.trim();
  if (!clean || clean === 'No data' || clean === 'dynamic') return clean;
  const h = hashString(clean);
  return `02:DE:MO:${padHex(h)}:${padHex(h >>> 8)}:${padHex(h >>> 16)}`;
};

export const maskHostname = (host: string): string => {
  const clean = host.trim();
  if (!clean || clean === 'No data') return clean;
  // Handle IPv4:port cleanly
  const ipv4PortMatch = clean.match(
    /^((?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}):(\d{1,5})$/
  );
  if (ipv4PortMatch) {
    return `${maskIpv4(ipv4PortMatch[1])}:${ipv4PortMatch[2]}`;
  }
  if (/^((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/.test(clean)) {
    return maskIpv4(clean);
  }
  if (clean.includes(':')) {
    // IPv6
    const h = hashString(clean);
    return `fd00:demo::${(h & 0xffff).toString(16)}`;
  }
  if (clean === 'localhost') return 'local-probe.demo.internal';
  const h = hashString(clean.toLowerCase());
  const num = String((h % 89) + 10);
  if (clean.includes('.')) {
    return `target-${num}.demo.example`;
  }
  return `host-${num}.demo`;
};

export const maskHostOrIp = (value?: string | null): string => {
  if (!value) return 'No data';
  const trimmed = String(value).trim();
  if (!trimmed || trimmed === 'No data') return trimmed || 'No data';
  return maskHostname(trimmed);
};

export const maskSensitiveText = (text?: string | null): string => {
  if (!text) return '';
  let out = String(text);
  // Mask MAC addresses (colon or hyphen separated)
  out = out.replace(/\b([0-9A-Fa-f]{2}[:-]){5}[0-9A-Fa-f]{2}\b/g, (m) => maskMac(m));
  // Mask IPv4 addresses (preserving trailing :port)
  out = out.replace(
    /\b((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\b/g,
    (m) => maskIpv4(m)
  );
  // Mask localhost
  out = out.replace(/\blocalhost\b/gi, 'local-probe.demo.internal');
  // Mask common domain hostnames
  out = out.replace(/\b([a-zA-Z0-9-]+\.)+(com|net|org|io|dev|local|lan|internal)\b/gi, (m) =>
    maskHostname(m)
  );
  return out;
};
