import _ from "lodash";
import {
  Device,
  PassiveMotor,
  Light,
  TiltSensor,
  MotionSensor,
  ColorDistanceSensor,
  ColorSensor,
  DistanceSensor,
  ForceSensor,
  Matrix,
  Motor,
} from "./device";

export interface DeviceTypeInfo {
  class: typeof Device;
  desc: string;
}

export interface DeviceMode {
  name: string;
  unit: string;
  format: { count: number; type: number; chars: number; dp: number };
  limits: Record<string, { min: number; max: number }>;
}

export interface DeviceInfo {
  type: DeviceTypeInfo;
  vars: Record<string, number>;
  modes: DeviceMode[];
  combi: string[];
  pids: Record<string, number[]>;
}

export type DeviceList = (DeviceInfo | null)[];

const deviceNames: Record<string, DeviceTypeInfo> = {
  "1": { class: PassiveMotor, desc: "Passive Motor" },
  "2": { class: PassiveMotor, desc: "Passive Motor" },
  "8": { class: Light, desc: "Light" },
  "34": { class: TiltSensor, desc: "WeDo 2.0 Tilt Sensor" },
  "35": { class: MotionSensor, desc: "Motion Sensor" },
  "37": { class: ColorDistanceSensor, desc: "Color & Distance Sensor" },
  "61": { class: ColorSensor, desc: "Color Sensor" },
  "62": { class: DistanceSensor, desc: "Distance Sensor" },
  "63": { class: ForceSensor, desc: "Force Sensor" },
  "64": { class: Matrix, desc: "3x3 Color Light Matrix" },
  "38": { class: Motor, desc: "Medium Linear Motor" },
  "46": { class: Motor, desc: "Large Motor" },
  "47": { class: Motor, desc: "XL Motor" },
  "48": { class: Motor, desc: "Medium Angular Motor (Cyan)" },
  "49": { class: Motor, desc: "Large Angular Motor (Cyan)" },
  "65": { class: Motor, desc: "Small Angular Motor" },
  "75": { class: Motor, desc: "Medium Angular Motor (Grey)" },
  "76": { class: Motor, desc: "Large Angular Motor (Grey)" }, // 88017
};

type DeviceParser = (idx: number) => DeviceInfo | null;

export const makeDeviceParser = (list: string[]): DeviceParser => {
  const getLine = (): string => {
    if (!list.length) throw new Error(`Device list truncated`);
    return list.shift() as string;
  };

  const expect = (want: RegExp): string[] => {
    const line = getLine();
    const m = line.match(want);
    if (!m) throw new Error(`Wanted ${want}, got "${line}"`);
    return m.slice(1);
  };

  const allof = (want: RegExp): string[][] => {
    const out: string[][] = [];
    for (;;) {
      if (!list.length) break;
      const m = list[0].match(want);
      if (!m) break;
      list.shift();
      out.push(m.slice(1));
    }
    return out;
  };

  const parseHex = (n: string) => parseInt(n, 16);
  const lc = (s: string) => s.toLowerCase();

  const parseMode = (idx: number): DeviceMode => {
    const mode = getLine();
    const mm = mode.match(/^\s*M(\d)\s+(\S+(?:\s+\S+)*)\s+SI\s*=\s*(\S*)/i);
    if (!mm) throw new Error(`Bad mode header: "${mode}"`);
    const [mn, name, unit] = mm.slice(1).map(lc);
    if (Number(mn) !== idx) throw new Error(`Bad mode number: ${mn} != ${idx}`);

    const format = getLine();
    const fm = format.match(
      /^\s*format\s+count=(\d+)\s+type=(\d+)\s+chars=(\d+)\s+dp=(\d+)/i
    );
    if (!fm) throw new Error(`Bad format line: "${format}"`);
    const [count, type, chars, dp] = fm.slice(1).map(Number);

    const parseLimit = ([unit, min, max]: string[]) => [
      lc(unit),
      { min: parseHex(min), max: parseHex(max) },
    ];

    const limits = _(getLine())
      .split(/\s*(\w+):\s*([0-9a-f]+)\s+([0-9a-f]+)/gi)
      .filter(x => x.length > 0)
      .chunk(3)
      .map(parseLimit)
      .fromPairs()
      .value();

    return { name, unit, format: { count, type, chars, dp }, limits };
  };

  const parseDevice: DeviceParser = idx => {
    const hdr = getLine();

    if (!hdr.startsWith(`P${idx}:`))
      throw new Error(`Bad header for P${idx}: "${hdr}"`);
    if (/^P\d:\s+no\s+device/i.test(hdr)) return null;
    if (!/^P\d:\s+connected/i.test(hdr))
      throw new Error(`Expected "P${idx}: connected...", got "${hdr}"`);

    const typeId = parseHex(expect(/^\s*type\s+(\S+)/i)[0]);
    const type = deviceNames[String(typeId)] || {
      class: Device,
      desc: `Unknown device ${typeId}`,
    };

    const vars = _(allof(/^\s*(\w+)\s*=\s*(\d+)$/))
      .map(([name, value]) => [lc(name), Number(value)])
      .fromPairs()
      .value();

    const modes = _.range((vars.nmodes || -1) + 1).map(parseMode);
    const combi = allof(/^\s*C\d+:\s*(\S+)/i).flat();

    const pids = _(allof(/^\s*(\w+)\s+PID:\s*(.+)/i))
      .map(([name, params]) => [name, params.split(/\s+/).map(parseHex)])
      .fromPairs()
      .value();

    return { type, vars, modes, combi, pids };
  };

  return parseDevice;
};

export const parseDeviceList = (list: string[]): DeviceList =>
  _.range(4).map(makeDeviceParser(list));

export const parseDevice = (list: string[], index: number): DeviceInfo | null =>
  makeDeviceParser(list)(index);
