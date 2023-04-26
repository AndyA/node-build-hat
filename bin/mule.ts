import util from "node:util";
import { SerialPort } from "serialport";
import split2 from "split2";
import { TypedEventEmitter } from "../lib/events";
import { resolveObjectURL } from "node:buffer";

const dev = "/dev/serial0";
const baudRate = 115200;

type BuildHATEvents = {
  line: [line: string];
  error: [err: Error];
  nextJob: [];
};

class BuildHAT extends TypedEventEmitter<BuildHATEvents> {
  port: SerialPort;
  initDone = false;
  queue: (() => Promise<unknown>)[] = [];

  constructor(path: string) {
    super();
    this.port = new SerialPort({ path, baudRate, autoOpen: false }).on(
      "error",
      (err: Error) => this.emit("error", err)
    );
  }

  async init() {
    if (!this.initDone) {
      const { port } = this;
      port.open();
      port.pipe(split2("\r\n")).on("data", (line: string) => {
        this.emit("line", line.trimEnd());
      });
      this.initDone = true;
    }
  }

  close() {
    if (this.initDone) this.port.close();
  }

  async send(cmd: string | string[]): Promise<void> {
    if (!Array.isArray(cmd)) return this.send([cmd]);
    await this.init();
    const wr = util.promisify(this.port.write.bind(this.port)) as (
      command: string
    ) => Promise<unknown>;
    await wr(`${cmd.join("; ")}\r`);
  }

  async atomic<T>(job: () => Promise<T>): Promise<T> {
    const { queue } = this;

    await this.init();
    queue.push(job);

    while (queue.length && queue[0] !== job)
      await new Promise<void>(resolve => this.once("nextJob", resolve));

    const rv = await job();
    queue.shift();
    this.emit("nextJob");

    return rv;
  }

  async until(
    cmd: string | string[],
    pred: (line: string) => boolean
  ): Promise<string[]> {
    const lines: string[] = [];
    await this.atomic(
      () =>
        new Promise<string[]>(async resolve => {
          const keepLine = (line: string) => {
            lines.push(line);
            if (pred(line)) {
              this.off("line", keepLine);
              resolve(lines);
            }
          };
          this.on("line", keepLine);
          await this.send(cmd);
        })
    );
    return lines;
  }
}

const deltat = (line: string): boolean => /^deltat=/.test(line);

async function main() {
  const hat = new BuildHAT(dev);

  // hat.on("error", err => console.error(err));
  // .on("line", line => console.log(JSON.stringify(line)));
  await hat.send([]);
  await hat.send("echo 0");
  // await hat.send("list");
  const list = await hat.until("list", deltat);
  for (const line of list) console.log(line);
  hat.close();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
