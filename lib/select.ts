import { LinePredicate } from "./serial";
import { TypedEventEmitter } from "./events";
import { Device } from "./device";
import _ from "lodash";
import { DeviceMode } from "./devicelist";

export const parseModeResponse = (line: string): number[] => {
  const m = line.match(/^P\d+M\d+:\s*(.*)/);
  if (!m) throw new Error(`Bad mode response: "${line}"`);
  return m[1].split(/\s+/).map(Number);
};

type SelectEvents = {
  update: [parms: number[]];
};

export type SelectSpec = {
  pred: LinePredicate;
  args: string;
  mode: DeviceMode;
};

type SelectConfig = { wiggle: number | number[] };
export type SelectOptions = Partial<SelectConfig>;

const defaultOptions: SelectConfig = {
  wiggle: 0,
};

const getWiggle = (wiggle: number | number[], data: number[]): number[] => {
  if (!Array.isArray(wiggle)) return getWiggle([wiggle], data);
  const need = data.length - wiggle.length;
  if (need <= 0) return wiggle;
  const last = _.last(wiggle) || 0;
  return wiggle.concat(Array.from({ length: need }).fill(last) as number[]);
};

export const differ = (
  wiggle: number | number[],
  data: number[],
  previous?: number[]
) => {
  if (!previous || data.length !== previous.length) return true;
  const deltas = getWiggle(wiggle, data);
  return data.some((v, i) => Math.abs(v - previous[i]) > Math.abs(deltas[i]));
};

export class Select extends TypedEventEmitter<SelectEvents> {
  dev: Device;
  spec: SelectSpec;
  opt: SelectConfig;
  watcher?: LinePredicate;
  previous?: number[];

  constructor(dev: Device, spec: SelectSpec, opt: SelectOptions = {}) {
    super();
    this.dev = dev;
    this.spec = spec;
    this.opt = { ...defaultOptions, ...opt };
  }

  update(data: number[]) {
    const { previous } = this;
    if (differ(this.opt.wiggle, data, previous)) {
      this.emit("update", data);
      this.previous = data;
    }
  }

  stop() {
    if (this.watcher) {
      const { dev } = this;
      // We don't wait for this select to execute. That should be
      // OK because of the command serialisation mechanism.
      void dev.send(`select`);
      dev.hat.removeWatcher(this.watcher);
      this.watcher = undefined;
    }
  }

  async start() {
    const { dev, spec } = this;
    this.stop();
    this.watcher = (line: string) => {
      if (!spec.pred(line)) return false;
      this.update(parseModeResponse(line));
      return true;
    };
    dev.hat.addWatcher(this.watcher);
    dev.send(`select ${spec.args}`);
  }
}
