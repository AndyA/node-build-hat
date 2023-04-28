import { BuildHAT } from "../lib/buildhat";
import { ColorSensor, Device, DistanceSensor, Motor } from "../lib/device";

const dev = "/dev/serial0";

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const LOG = false;

async function main() {
  console.log(`Starting...`);
  const hat = new BuildHAT(dev);

  hat
    .on("error", err => console.error(err))
    .on("halt", () => console.log(`*** halt`))
    .on("connect", async port => {
      console.log(`*** connect ${port}`);
      const dev = await hat.port(port, Device);
      console.log(`Device: ${dev.info.type.desc}`);
      for (const mode of dev.info.modes) {
        console.log(`  Mode: ${mode.index} ${mode.name}`);
      }
    })
    .on("disconnect", port => console.log(`*** disconnect ${port}`))
    .on(
      "log",
      msg => LOG && console.log(`// ${msg.type}: ${JSON.stringify(msg.line)}`)
    );

  await hat.ready();

  console.log(`BuildHAT ready`);

  const motor = await hat.port(0, Motor);
  await motor.combi(0, ["speed", "pos", "apos"]);
  await motor.select(0);
  await motor.plimit(1);
  await motor.bias(0.4);
  await motor.pid({
    pvport: motor,
    pvmode: 0,
    pvoffset: 5,
    pvformat: "s2",
    pvscale: 1 / 360,
    pvunwrap: 1,
    Kp: 1,
    Ki: 4,
    Kd: 0,
    windup: 0,
  });

  const range = await hat.port(3, DistanceSensor);
  await range.set(-1);
  const maxRange = range.findMode("distl").limits.raw.max;
  console.log({ maxRange });
  const dist = await range
    .selectStream("distl")
    .on("update", ([dist]) => {
      if (dist < 0) return;
      motor.set(dist / maxRange).then(() => {
        console.log(dist / maxRange);
      });
    })
    .start();

  // await motor.combi(1, ["speed", "pos", "apos"]);
  // await motor.set({ shape: "ramp", start: 0, end: 1, duration: 5 });
  // await motor.set({ shape: "ramp", start: 1, end: 0, duration: 5 });
  // await delay(5000);

  // const sensor = await hat.port(2, ColorSensor);
  // await sensor.set(-1);

  // const rgb = await sensor
  //   .selectStream("hsv")
  //   .on("update", v => console.log(v))
  //   .start();

  // await delay(20000);

  // hat.halt();
  // hat.close();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
