import _ from "lodash";
import { DeviceList, parseDeviceList } from "./devicelist";
import { SerialDevice, SerialDeviceEvents } from "./serial";
import { Device, DeviceType } from "./device";

const baudRate = 115200;
const deltat = (line: string): boolean => /^deltat=/.test(line);

export type BuildHATEvents = SerialDeviceEvents & {
  halt: [];
};

export class BuildHAT extends SerialDevice<BuildHATEvents> {
  #devices?: Promise<DeviceList>;
  #ports: Record<number, Device> = {};

  constructor(path: string) {
    super(path, baudRate);
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
