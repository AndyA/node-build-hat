import _ from "lodash";
import { DeviceList, parseDevice, parseDeviceList } from "./devicelist";
import { SerialDevice, SerialDeviceEvents } from "./serial";
import { Device, DeviceType } from "./device";
import { predicate } from "./util";

const baudRate = 115200;
const deltat = (line: string): boolean => /^deltat=/.test(line);

export type BuildHATEvents = SerialDeviceEvents & {
  connect: [port: number];
  disconnect: [port: number];
  halt: [];
};

export class BuildHAT extends SerialDevice<BuildHATEvents> {
  #devices?: Promise<DeviceList>;
  #ports: Record<number, Device> = {};
  #ready: Promise<void>;

  constructor(path: string) {
    super(path, baudRate);
    this.#ready = this.initialise();
  }

  private async initialise(): Promise<void> {
    await this.send([]);
    await this.send("echo 0");
    await this.devices();
    this.installWatchers();
  }

  private installWatchers() {
    // Disconnect handler
    this.addWatcher(line => {
      const m = line.match(/^P(\d+):\s+disconnected/i);
      if (!m) return false;

      const port = Number(m[1]);
      this.devices().then(devices => {
        devices[port] = null;
        const dev = this.#ports[port];
        if (dev) {
          delete this.#ports[port];
          dev.destroy();
        }
        this.emit("disconnect", port);
      });

      return true;
    });

    // Connect handler
    this.addWatcher(line => {
      const m = line.match(/^P(\d+):\s+connecting\b/i);
      if (!m) return false;

      const port = Number(m[1]);

      const readDevice = async () => {
        const lines = await this.keepLines(predicate(`P${port}: established`));
        const header = predicate(`P${port}: connected`);
        while (lines.length && !header(lines[0])) lines.shift();
        const info = parseDevice(lines.slice(0, -1), port);
        const devices = await this.devices();
        devices[port] = info;
        this.emit("connect", port);
      };

      void readDevice();

      return true;
    });

    // Errors
    this.addWatcher(line => {
      if (!/^Error/i.test(line)) return false;
      this.emit("error", new Error(`Error from BuildHAT`));
      return true;
    });
  }

  async devices(): Promise<DeviceList> {
    return (this.#devices =
      this.#devices || this.wait("list", deltat).then(parseDeviceList));
  }

  ready(): Promise<void> {
    return this.#ready;
  }

  halt(): void {
    this.immediate(
      _.range(4).flatMap(port => [`port ${port}`, `pwm`, `set 0`, `select`])
    ).then(() => this.emit("halt"));
  }

  async port<T extends Device>(index: number, type: DeviceType<T>): Promise<T> {
    const ports = this.#ports;

    if (ports[index]) return ports[index] as T;

    const info = (await this.devices())[index];
    if (!info) throw new Error(`No device ${index}`);

    const clazz = info.type.class;
    const port = new clazz(this, info, index);

    if (!(port instanceof type))
      throw new Error(`Port ${index} is a ${clazz.name} not a ${type.name}`);

    ports[index] = port;
    return port;
  }
}
