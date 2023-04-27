import { BuildHAT } from "./buildhat";
import { DeviceInfo } from "./devicelist";

export type DeviceType<T extends Device> = {
  new (hat: BuildHAT, info: DeviceInfo, index: number): T;
};

interface Cycle {
  shape: "square" | "sine" | "triangle";
  min: number;
  max: number;
  period: number;
  phase?: number;
}

interface OneShot {
  shape: "pulse" | "ramp";
  start: number;
  end: number;
  duration: number;
}

type WaveForm = Cycle | OneShot;

const isCycle = (n: WaveForm | number): n is Cycle =>
  !!n &&
  typeof n === "object" &&
  ["square", "sine", "triangle"].includes(n.shape);

const isOneShot = (n: WaveForm | number): n is OneShot =>
  !!n && typeof n === "object" && ["pulse", "ramp"].includes(n.shape);

const isWaveForm = (n: WaveForm | number): n is WaveForm =>
  isCycle(n) || isOneShot(n);

export class Device {
  hat: BuildHAT;
  info: DeviceInfo;
  index: number;

  constructor(hat: BuildHAT, info: DeviceInfo, index: number) {
    this.hat = hat;
    this.info = info;
    this.index = index;
  }

  private withPort(cmd: string | string[]): string[] {
    if (!Array.isArray(cmd)) return this.withPort([cmd]);
    return [`port ${this.index}`, ...cmd];
  }

  async immediate(cmd: string | string[]): Promise<void> {
    await this.hat.immediate(this.withPort(cmd));
  }

  async send(cmd: string | string[]): Promise<void> {
    await this.hat.send(this.withPort(cmd));
  }

  async set(n: number | WaveForm): Promise<void> {
    if (isWaveForm(n)) {
      if (isOneShot(n)) {
        const { shape, start, end, duration } = n;
        const done = (line: string) => line === `P${this.index}: ${shape} done`;
        const prom = this.hat.waitFor(done);
        await this.send(`set ${shape} ${start} ${end} ${duration} 0`);
        await prom;
      } else if (isCycle(n)) {
        const { shape, min, max, period, phase } = n;
        await this.send(`set ${shape} ${min} ${max} ${period} ${phase ?? 0}`);
      } else throw new Error(`Unknown waveform`);
    } else {
      await this.send(`set ${n}`);
    }
  }

  async bias(n: number): Promise<void> {
    await this.send(`bias ${n}`);
  }
}

export class PassiveMotor extends Device {}
export class Light extends Device {}
export class TiltSensor extends Device {}
export class MotionSensor extends Device {}
export class ColorDistanceSensor extends Device {}
export class ColorSensor extends Device {}
export class DistanceSensor extends Device {}
export class ForceSensor extends Device {}
export class Matrix extends Device {}
export class Motor extends PassiveMotor {}
