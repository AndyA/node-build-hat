import _ from "lodash";
import { BuildHAT } from "./buildhat";
import { DeviceInfo } from "./devicelist";
import { LinePredicate } from "./serial";

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

type Format = "u1" | "s1" | "u2" | "s2" | "u4" | "s4" | "f4";

interface SelectVar {
  mode: number;
  offset: number;
  format: Format;
}

const expandMode = (
  m: number | SelectVar
): [number] | [number, number, Format] =>
  typeof m === "number" ? [m] : [m.mode, m.offset, m.format];

const literalToRegExp = (lit: string): RegExp =>
  new RegExp(lit.split(/\s+/).map(_.escapeRegExp).join("\\s+"), "i");

const predicate = (test: string | RegExp | LinePredicate): LinePredicate =>
  typeof test === "string"
    ? predicate(literalToRegExp(test))
    : test instanceof RegExp
    ? (line: string) => test.test(line)
    : test;

const parseModeResponse = (line: string): number[] => {
  const m = line.match(/^P\d+M\d+:\s*(.*)/);
  if (!m) throw new Error(`Bad mode response: "${line}"`);
  return m[1].split(/\s+/).map(Number);
};

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
        const done = this.hat.waitFor(
          predicate(`P${this.index}: ${shape} done`)
        );
        await this.send(`set ${shape} ${start} ${end} ${duration} 0`);
        await done;
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

  private prepareSelect(modeOrVar: number | SelectVar) {
    const args = expandMode(modeOrVar);
    const pred = predicate(new RegExp(`^P${this.index}M${args[0]}:`, "i"));
    return { pred, args: args.join(" ") };
  }

  async selOnce(modeOrVar: number | SelectVar): Promise<number[]> {
    const { args, pred } = this.prepareSelect(modeOrVar);
    const done = this.hat.waitFor(pred);
    await this.send(`selonce ${args}`);
    return parseModeResponse(await done);
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
