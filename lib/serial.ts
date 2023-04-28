import util from "node:util";
import { SerialPort } from "serialport";
import split2 from "split2";
import { TypedEventEmitter } from "./events";

interface LogMessage {
  type: "tx" | "rx";
  line: string;
}

export type SerialDeviceEvents = {
  line: [line: string];
  error: [err: Error];
  log: [msg: LogMessage];
  nextJob: [];
};

export type LinePredicate = (line: string) => boolean;

export class SerialDevice<
  E extends SerialDeviceEvents
> extends TypedEventEmitter<E> {
  #port: SerialPort;
  #initDone = false;
  #queue: (() => Promise<unknown>)[] = [];
  #watchers = new Set<LinePredicate>();

  constructor(path: string, baudRate: number) {
    super();
    this.#port = new SerialPort({ path, baudRate, autoOpen: false });
    this.#port.on("error", err => this.emit("error", err));
  }

  private async init() {
    if (!this.#initDone) {
      const port = this.#port;
      port.open();
      port.pipe(split2("\r\n")).on("data", (raw: string) => {
        const line = raw.trimEnd();
        this.emit("log", { type: "rx", line });
        if (!this.showWatchers(line)) this.emit("line", line);
      });
      this.#initDone = true;
    }
  }

  addWatcher(w: LinePredicate): this {
    this.#watchers.add(w);
    return this;
  }

  removeWatcher(w: LinePredicate): this {
    this.#watchers.delete(w);
    return this;
  }

  private showWatchers(line: string): boolean {
    for (const w of this.#watchers.values()) if (w(line)) return true;
    return false;
  }

  close() {
    if (this.#initDone) this.#port.close();
  }

  async immediate(cmd: string | string[]): Promise<void> {
    if (!Array.isArray(cmd)) return this.immediate([cmd]);

    const wr = util.promisify(this.#port.write.bind(this.#port)) as (
      command: string
    ) => Promise<unknown>;

    await this.init();

    const line = cmd.join("; ");

    await wr(`${line}\r`);
    this.emit("log", { type: "tx", line });
  }

  async txn<T>(job: () => Promise<T>): Promise<T> {
    const queue = this.#queue;

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

  async wait(
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
          await this.immediate(cmd);
        })
    );
    return lines;
  }

  async send(cmd: string | string[]): Promise<void> {
    await this.wait(cmd, line => line === "" || /^P\d+>/i.test(line));
  }

  waitFor(pred: (line: string) => boolean): Promise<string> {
    return new Promise(resolve => {
      const checkLine = (line: string): boolean => {
        if (pred(line)) {
          this.removeWatcher(checkLine);
          resolve(line);
          return true;
        }
        return false;
      };
      this.addWatcher(checkLine);
    });
  }
}
