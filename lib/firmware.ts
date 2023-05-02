export const checksum = (data: Buffer): number => {
  let u = 1;
  for (const byte of data) {
    if (u & 0x80000000) u = (u << 1) ^ 0x1d872b41;
    else u = u << 1;
    u = (u ^ byte) & 0xffffffff;
  }

  return u;
};

class Firmware {}
