import { BuildHAT } from "../lib/buildhat";
import { Motor } from "../lib/device";

const dev = "/dev/serial0";

// const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const LOG = false;

async function main() {
  const hat = new BuildHAT(dev);

  hat
    .on("error", err => console.error(err))
    .on("line", line => console.log(`// line: ${JSON.stringify(line)}`))
    .on(
      "log",
      msg => LOG && console.log(`// ${msg.type}: ${JSON.stringify(msg.line)}`)
    );

  await hat.send([]);
  await hat.send("echo 0");

  const motor = await hat.port(0, Motor);
  await motor.set({ shape: "ramp", start: 0, end: 1, duration: 5 });
  await motor.set({ shape: "ramp", start: 1, end: 0, duration: 5 });
  // await delay(5000);

  await hat.halt();

  hat.close();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
