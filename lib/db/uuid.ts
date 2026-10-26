export function uuidv7(): string {
  const buf = new Uint8Array(16);
  crypto.getRandomValues(buf);
  const ms = Date.now();
  buf[0] = Math.floor(ms / 2 ** 40) % 256;
  buf[1] = Math.floor(ms / 2 ** 32) % 256;
  buf[2] = Math.floor(ms / 2 ** 24) % 256;
  buf[3] = Math.floor(ms / 2 ** 16) % 256;
  buf[4] = Math.floor(ms / 2 ** 8) % 256;
  buf[5] = ms % 256;
  buf[6] = (buf[6] & 0x0f) | 0x70;
  buf[8] = (buf[8] & 0x3f) | 0x80;
  const hex = Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
