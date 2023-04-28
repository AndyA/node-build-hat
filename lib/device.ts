import { BuildHAT } from "./buildhat";
import { DeviceInfo, DeviceMode } from "./devicelist";
import { predicate } from "./util";
import _ from "lodash";
import { Select, SelectOptions, SelectSpec, parseModeResponse } from "./select";

export type DeviceType<T extends Device> = {
  new (hat: BuildHAT, info: DeviceInfo, index: number): T;
};

type Cycle = {
  shape: "square" | "sine" | "triangle";
  min: number;
  max: number;
  period: number;
  phase?: number;
};

type OneShot = {
  shape: "pulse" | "ramp";
  start: number;
  end: number;
  duration: number;
};

type WaveForm = Cycle | OneShot;

const isCycle = (n: WaveForm | number): n is Cycle =>
  !!n &&
  typeof n === "object" &&
  ["square", "sine", "triangle"].includes(n.shape);

const isOneShot = (n: WaveForm | number): n is OneShot =>
  !!n && typeof n === "object" && ["pulse", "ramp"].includes(n.shape);

const isWaveForm = (n: WaveForm | number): n is WaveForm =>
  isCycle(n) || isOneShot(n);

type ModeName = string | number;

const isModeName = (thing: unknown): thing is ModeName =>
  typeof thing === "string" || typeof thing === "number";

type Format = "u1" | "s1" | "u2" | "s2" | "u4" | "s4" | "f4";

type SelectVar = {
  mode: ModeName;
  offset: number;
  format: Format;
};

type CombiSlot = {
  mode: ModeName;
  offset?: number;
};

const isCombiSlot = (thing: unknown): thing is CombiSlot =>
  !!thing && typeof thing === "object" && "mode" in thing;

type PidSpec = {
  pvport: number | Device;
  pvmode: ModeName;
  pvoffset: number;
  pvformat: Format;
  pvscale: number;
  pvunwrap: number;
  Kp: number;
  Ki: number;
  Kd: number;
  windup: number;
};

export class Device {
  hat: BuildHAT;
  info: DeviceInfo;
  index: number;
  #cleanup = false;
  #select?: Select;
  #modeIndex?: Record<string, DeviceMode>;

  constructor(hat: BuildHAT, info: DeviceInfo, index: number) {
    this.hat = hat;
    this.info = info;
    this.index = index;
    hat.on("halt", () => this.stopSelect());
  }

  destroy(): void {
    this.#cleanup = true;
    this.stopSelect();
  }

  private withPort(cmd: string | string[]): string[] {
    if (!Array.isArray(cmd)) return this.withPort([cmd]);
    return [`port ${this.index}`, ...cmd];
  }

  async immediate(cmd: string | string[]): Promise<void> {
    if (!this.#cleanup) await this.hat.immediate(this.withPort(cmd));
  }

  async send(cmd: string | string[]): Promise<void> {
    if (!this.#cleanup) await this.hat.send(this.withPort(cmd));
  }

  private get modeIndex(): Record<string, DeviceMode> {
    return (this.#modeIndex =
      this.#modeIndex || _.keyBy(this.info.modes, "name"));
  }

  private lookupMode(mode: ModeName): DeviceMode {
    if (typeof mode === "number") return this.info.modes[mode];
    return this.modeIndex[mode.toLowerCase()];
  }

  findMode(mode: ModeName): DeviceMode {
    const info = this.lookupMode(mode);
    if (!info) throw new Error(`No mode: ${mode}`);
    return info;
  }

  resolveMode(mode: ModeName): number {
    return this.findMode(mode).index;
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

  async plimit(limit: number): Promise<void> {
    await this.send(`plimit ${limit}`);
  }

  async pwm(limit: number): Promise<void> {
    await this.send(`pwm`);
  }

  private prepareSelect(modeOrVar: ModeName | SelectVar): SelectSpec {
    const expandMode = (m: ModeName | SelectVar) =>
      isModeName(m) ? [m] : [m.mode, m.offset, m.format];

    const [m, ...args] = expandMode(modeOrVar);
    const mode = this.findMode(m);
    const pred = predicate(`P${this.index}M${mode.index}:`);
    return { pred, args: [mode.index, ...args].join(" "), mode };
  }

  async selOnce(modeOrVar: ModeName | SelectVar): Promise<number[]> {
    const { args, pred } = this.prepareSelect(modeOrVar);
    const done = this.hat.waitFor(pred);
    await this.send(`selonce ${args}`);
    return parseModeResponse(await done);
  }

  async select(modeOrVar: ModeName | SelectVar) {
    const { args } = this.prepareSelect(modeOrVar);
    await this.send(`select ${args}`);
  }

  stopSelect() {
    this.#select?.stop();
    this.#select = undefined;
  }

  selectStream(
    modeOrVar: ModeName | SelectVar,
    opt: SelectOptions = {}
  ): Select {
    this.stopSelect();
    return (this.#select = new Select(
      this,
      this.prepareSelect(modeOrVar),
      opt
    ));
  }

  async combi(slot: number, modes: (CombiSlot | ModeName)[] = []) {
    const spec = modes
      .map(mode => (isCombiSlot(mode) ? mode : { mode }))
      .flatMap(({ mode, offset }) => [this.resolveMode(mode), offset || 0])
      .join(" ");
    await this.send(`combi ${slot} ${spec}`);
  }

  async pid({
    pvport,
    pvmode,
    pvoffset,
    pvformat,
    pvscale,
    pvunwrap,
    Kp,
    Ki,
    Kd,
    windup,
  }: PidSpec) {
    const pvdev =
      pvport instanceof Device ? pvport : await this.hat.port(0, Device);
    const mode = pvdev.resolveMode(pvmode);
    const args = [
      [pvdev.index, mode, pvoffset, pvformat],
      [pvscale, pvunwrap, Kp, Ki, Kd, windup],
    ]
      .flat()
      .map(x => x || 0)
      .join(" ");

    await this.send(`pid ${args}`);
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
