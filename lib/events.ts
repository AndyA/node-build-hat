import EventEmitter from "node:events";

export class TypedEventEmitter<
  T extends Record<string, unknown[]>
> extends EventEmitter {
  emit<EV extends keyof T & string>(event: EV, ...args: T[EV]): boolean {
    return super.emit(event, ...args);
  }

  on<EV extends keyof T & string>(
    event: EV,
    handler: (...args: T[EV]) => void
  ): this {
    super.on(event, handler as (...args: unknown[]) => void);
    return this;
  }

  off<EV extends keyof T & string>(
    event: EV,
    handler: (...args: T[EV]) => void
  ): this {
    super.off(event, handler as (...args: unknown[]) => void);
    return this;
  }

  once<EV extends keyof T & string>(
    event: EV,
    handler: (...args: T[EV]) => void
  ): this {
    super.once(event, handler as (...args: unknown[]) => void);
    return this;
  }
}
