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

  constructor(path: string) {
    super(path, baudRate);
    void this.initialise();
  }

  private async initialise() {
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
  }

  async devices(): Promise<DeviceList> {
    return (this.#devices =
      this.#devices || this.wait("list", deltat).then(parseDeviceList));
  }

  halt(): void {
    this.immediate(
      _.range(4).flatMap(port => [`port ${port}`, `set 0`, `select`])
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
      throw new Error(`Port ${index} is a ${clazz} not a ${type}`);

    ports[index] = port;
    return port;
  }
}
