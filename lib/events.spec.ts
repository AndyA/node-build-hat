import { TypedEventEmitter } from "./events.js";

type EventTypes = {
  hello: [];
  stats: [count: number, label: string];
};

describe(`events`, () => {
  it(`should handle events`, () => {
    const ee = new TypedEventEmitter<EventTypes>();
    let called = 0;
    const handler = () => called++;
    expect(ee.emit("hello")).toBeFalsy();
    ee.on("hello", handler);
    expect(ee.emit("hello")).toBeTruthy();
    expect(called).toBe(1);
    expect(ee.emit("hello")).toBeTruthy();
    expect(called).toBe(2);
    ee.off("hello", handler);
    expect(ee.emit("hello")).toBeFalsy();
    expect(called).toBe(2);
    ee.once("hello", handler);
    expect(ee.emit("hello")).toBeTruthy();
    expect(called).toBe(3);
    expect(ee.emit("hello")).toBeFalsy();
    expect(called).toBe(3);
  });

  it(`should pass arguments`, () => {
    const ee = new TypedEventEmitter<EventTypes>();
    const seen: { count: number; label: string }[] = [];
    const handler = (count: number, label: string) =>
      seen.push({ count, label });
    expect(ee.emit("stats", 123, "test")).toBeFalsy();
    ee.on("stats", handler);
    expect(ee.emit("stats", 123, "test")).toBeTruthy();
    expect(seen).toEqual([{ count: 123, label: "test" }]);
    expect(ee.emit("stats", 345, "test2")).toBeTruthy();
    expect(seen).toEqual([
      { count: 123, label: "test" },
      { count: 345, label: "test2" },
    ]);
  });
});
