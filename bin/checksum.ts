import fs from "node:fs";

const checksum = (data: Buffer): number => {
  let u = 1;
  for (const byte of data) {
    if (u & 0x80000000) u = (u << 1) ^ 0x1d872b41;
    else u = u << 1;
    u = (u ^ byte) & 0xffffffff;
  }

  return u;
};

// 139016571
async function main() {
  const firmware = await fs.promises.readFile("data/firmware.bin");
  const cs = checksum(firmware);
  console.log(cs);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
