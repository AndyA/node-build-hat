import _ from "lodash";

type Predicate<T> = (value: T) => boolean;
type Matcher<T> = { name: string; pattern: Predicate<T>[] };

enum SMState {
  CONTINUE,
  MATCHED,
  FAILED,
}

const canStart =
  <T>(value: T) =>
  ({ pattern }: Matcher<T>): boolean =>
    pattern.length > 0 && pattern[0](value);

class StateMachine<T> {
  matcher: Matcher<T>;
  index = 0;

  constructor(matcher: Matcher<T>) {
    this.matcher = matcher;
  }

  get name(): string {
    return this.matcher.name;
  }

  advance(value: T): SMState {
    const { pattern } = this.matcher;
    if (!pattern[this.index](value)) return SMState.FAILED;
    return ++this.index === pattern.length ? SMState.MATCHED : SMState.CONTINUE;
  }
}

class Scanner<T> {
  matchers: Matcher<T>[];
  active: StateMachine<T>[] = [];

  constructor(matchers: Matcher<T>[]) {
    this.matchers = matchers;
  }

  advance(value: T): StateMachine<T>[] {
    const startups = this.matchers
      .filter(canStart(value))
      .map(matcher => new StateMachine(matcher));
    const active = this.active.concat(startups);
    const next = _.groupBy(active, sm => sm.advance(value));
    this.active = next[SMState.CONTINUE] ?? [];
    return next[SMState.MATCHED] ?? [];
  }
}

const equals =
  <T>(want: T): Predicate<T> =>
  value =>
    value === want;

const stringMatcher = (name: string): Matcher<string> => ({
  name,
  pattern: Array.from(name).map(equals),
});

const scanner = new Scanner<string>(
  ["XXXX", "XXX", "XX", "YX", "XY", "XYX", "BHBL> "].map(stringMatcher)
);

const data = Array.from("ZYXXYXXXXYZ\rBHBHBL> XYZ");
for (const value of data) {
  const before = scanner.active.length;
  const matched = scanner.advance(value);
  console.log(`sent "${value}", active: ${before} → ${scanner.active.length}`);
  for (const sm of matched) {
    console.log(`  matched "${sm.name}"`);
  }
}
