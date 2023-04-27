import _ from "lodash";
import { DeviceList, parseDeviceList } from "./devicelist";
import { SerialDevice } from "./serial";
import { Device, DeviceType } from "./device";

const baudRate = 115200;
const deltat = (line: string): boolean => /^deltat=/.test(line);

// type getType<T> = T extends Device<infer U> ? U : never

export class BuildHAT extends SerialDevice {
  #devices?: Promise<DeviceList>;
  #ports: Record<number, Device> = {};

  constructor(path: string) {
    super(path, baudRate);
  }

  async devices(): Promise<DeviceList> {
    return (this.#devices =
      this.#devices || this.wait("list", deltat).then(parseDeviceList));
  }

  async halt(): Promise<void> {
    await this.immediate(_.range(4).flatMap(port => [`port ${port}`, `set 0`]));
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
