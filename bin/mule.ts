import { SerialPort } from "serialport";

const serial = "/dev/serial0";

async function main() {
  const port = new SerialPort({ path: serial, baudRate: 115200 });
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
