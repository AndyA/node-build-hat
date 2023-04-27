import util from "node:util";
import { SerialPort } from "serialport";
import split2 from "split2";
import { TypedEventEmitter } from "./events";

const baudRate = 115200;

type BuildHATEvents = {
  line: [line: string];
  error: [err: Error];
  nextJob: [];
};

export class BuildHAT extends TypedEventEmitter<BuildHATEvents> {
  port: SerialPort;
  initDone = false;
  queue: (() => Promise<unknown>)[] = [];

  constructor(path: string) {
    super();
    this.port = new SerialPort({ path, baudRate, autoOpen: false });
    this.port.on("error", err => this.emit("error", err));
  }

  private async init() {
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

  async txn<T>(job: () => Promise<T>): Promise<T> {
    const { queue } = this;

    await this.init();
    queue.push(job);

    // Wait for our job to be runnable
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
    await this.txn(
      () =>
        new Promise<string[]>(async resolve => {
          const keepLine = (line: string) => {
            if (line.length) lines.push(line);
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
