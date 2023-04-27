exports = [
  {
    type: { class: "Motor", desc: "Medium Angular Motor (Grey)" },
    vars: { nmodes: 5, nview: 3, baud: 115200, hwver: 4, swver: 10000000 },
    modes: [
      {
        name: "power",
        unit: "pct",
        format: { count: 1, type: 0, chars: 4, dp: 0 },
        limits: {
          raw: { min: 0, max: 100 },
          pct: { min: 0, max: 100 },
          si: { min: 0, max: 100 },
        },
      },
      {
        name: "speed",
        unit: "pct",
        format: { count: 1, type: 0, chars: 4, dp: 0 },
        limits: {
          raw: { min: 0, max: 100 },
          pct: { min: 0, max: 100 },
          si: { min: 0, max: 100 },
        },
      },
      {
        name: "pos",
        unit: "deg",
        format: { count: 1, type: 2, chars: 11, dp: 0 },
        limits: {
          raw: { min: 0, max: 360 },
          pct: { min: 0, max: 100 },
          si: { min: 0, max: 360 },
        },
      },
      {
        name: "apos",
        unit: "deg",
        format: { count: 1, type: 1, chars: 3, dp: 0 },
        limits: {
          raw: { min: 0, max: 179 },
          pct: { min: 0, max: 200 },
          si: { min: 0, max: 179 },
        },
      },
      {
        name: "calib",
        unit: "cal",
        format: { count: 2, type: 1, chars: 5, dp: 0 },
        limits: {
          raw: { min: 0, max: 3600 },
          pct: { min: 0, max: 100 },
          si: { min: 0, max: 3600 },
        },
      },
      {
        name: "stats",
        unit: "min",
        format: { count: 14, type: 1, chars: 5, dp: 0 },
        limits: {
          raw: { min: 0, max: 65535 },
          pct: { min: 0, max: 100 },
          si: { min: 0, max: 65535 },
        },
      },
    ],
    combi: ["M1+M2+M3"],
    pids: { speed: [3000, 100, 9000, 1080], position: [12000, 1000, 80000, 0] },
  },
  null,
  {
    type: { class: "DistanceSensor", desc: "Distance Sensor" },
    vars: {
      nmodes: 8,
      nview: 0,
      baud: 115200,
      hwver: 10000000,
      swver: 10000000,
    },
    modes: [
      {
        name: "distl",
        unit: "cm",
        format: { count: 1, type: 1, chars: 5, dp: 1 },
        limits: {
          raw: { min: 0, max: 2500 },
          pct: { min: 0, max: 100 },
          si: { min: 0, max: 250 },
        },
      },
      {
        name: "dists",
        unit: "cm",
        format: { count: 1, type: 1, chars: 4, dp: 1 },
        limits: {
          raw: { min: 0, max: 320 },
          pct: { min: 0, max: 100 },
          si: { min: 0, max: 32 },
        },
      },
      {
        name: "singl",
        unit: "cm",
        format: { count: 1, type: 1, chars: 5, dp: 1 },
        limits: {
          raw: { min: 0, max: 2500 },
          pct: { min: 0, max: 100 },
          si: { min: 0, max: 250 },
        },
      },
      {
        name: "listn",
        unit: "st",
        format: { count: 1, type: 0, chars: 1, dp: 0 },
        limits: {
          raw: { min: 0, max: 1 },
          pct: { min: 0, max: 100 },
          si: { min: 0, max: 1 },
        },
      },
      {
        name: "traw",
        unit: "us",
        format: { count: 1, type: 2, chars: 5, dp: 0 },
        limits: {
          raw: { min: 0, max: 14577 },
          pct: { min: 0, max: 100 },
          si: { min: 0, max: 14577 },
        },
      },
      {
        name: "light",
        unit: "pct",
        format: { count: 4, type: 0, chars: 3, dp: 0 },
        limits: {
          raw: { min: 0, max: 100 },
          pct: { min: 0, max: 100 },
          si: { min: 0, max: 100 },
        },
      },
      {
        name: "ping",
        unit: "pct",
        format: { count: 1, type: 0, chars: 1, dp: 0 },
        limits: {
          raw: { min: 0, max: 1 },
          pct: { min: 0, max: 100 },
          si: { min: 0, max: 1 },
        },
      },
      {
        name: "adraw",
        unit: "pct",
        format: { count: 1, type: 1, chars: 4, dp: 0 },
        limits: {
          raw: { min: 0, max: 1024 },
          pct: { min: 0, max: 100 },
          si: { min: 0, max: 1024 },
        },
      },
      {
        name: "calib",
        unit: "pct",
        format: { count: 7, type: 0, chars: 3, dp: 0 },
        limits: {
          raw: { min: 0, max: 255 },
          pct: { min: 0, max: 100 },
          si: { min: 0, max: 255 },
        },
      },
    ],
    combi: [],
    pids: { speed: [0, 0, 0, 0], position: [0, 0, 0, 0] },
  },
  {
    type: { class: "ColorSensor", desc: "Color Sensor" },
    vars: {
      nmodes: 9,
      nview: 0,
      baud: 115200,
      hwver: 10000000,
      swver: 10000000,
    },
    modes: [
      {
        name: "color",
        unit: "idx",
        format: { count: 1, type: 0, chars: 2, dp: 0 },
        limits: {
          raw: { min: 0, max: 10 },
          pct: { min: 0, max: 100 },
          si: { min: 0, max: 10 },
        },
      },
      {
        name: "reflt",
        unit: "pct",
        format: { count: 1, type: 0, chars: 3, dp: 0 },
        limits: {
          raw: { min: 0, max: 100 },
          pct: { min: 0, max: 100 },
          si: { min: 0, max: 100 },
        },
      },
      {
        name: "ambi",
        unit: "pct",
        format: { count: 1, type: 0, chars: 3, dp: 0 },
        limits: {
          raw: { min: 0, max: 100 },
          pct: { min: 0, max: 100 },
          si: { min: 0, max: 100 },
        },
      },
      {
        name: "light",
        unit: "pct",
        format: { count: 3, type: 0, chars: 3, dp: 0 },
        limits: {
          raw: { min: 0, max: 100 },
          pct: { min: 0, max: 100 },
          si: { min: 0, max: 100 },
        },
      },
      {
        name: "rrefl",
        unit: "raw",
        format: { count: 2, type: 1, chars: 4, dp: 0 },
        limits: {
          raw: { min: 0, max: 1024 },
          pct: { min: 0, max: 100 },
          si: { min: 0, max: 1024 },
        },
      },
      {
        name: "rgb i",
        unit: "raw",
        format: { count: 4, type: 1, chars: 4, dp: 0 },
        limits: {
          raw: { min: 0, max: 1024 },
          pct: { min: 0, max: 100 },
          si: { min: 0, max: 1024 },
        },
      },
      {
        name: "hsv",
        unit: "raw",
        format: { count: 3, type: 1, chars: 4, dp: 0 },
        limits: {
          raw: { min: 0, max: 360 },
          pct: { min: 0, max: 100 },
          si: { min: 0, max: 360 },
        },
      },
      {
        name: "shsv",
        unit: "raw",
        format: { count: 4, type: 1, chars: 4, dp: 0 },
        limits: {
          raw: { min: 0, max: 360 },
          pct: { min: 0, max: 100 },
          si: { min: 0, max: 360 },
        },
      },
      {
        name: "debug",
        unit: "raw",
        format: { count: 4, type: 1, chars: 4, dp: 0 },
        limits: {
          raw: { min: 0, max: 65535 },
          pct: { min: 0, max: 100 },
          si: { min: 0, max: 65535 },
        },
      },
      {
        name: "calib",
        unit: "",
        format: { count: 7, type: 1, chars: 5, dp: 0 },
        limits: {
          raw: { min: 0, max: 65535 },
          pct: { min: 0, max: 100 },
          si: { min: 0, max: 65535 },
        },
      },
    ],
    combi: ["M0+M1+M5+M6"],
    pids: { speed: [0, 0, 0, 0], position: [0, 0, 0, 0] },
  },
];
