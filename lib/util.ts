import _ from "lodash";
import { LinePredicate } from "./serial";

export const literalToRegExp = (lit: string): RegExp =>
  new RegExp(lit.split(/\s+/).map(_.escapeRegExp).join("\\s+"), "i");

export const predicate = (
  test: string | RegExp | LinePredicate
): LinePredicate =>
  typeof test === "string"
    ? predicate(literalToRegExp(test))
    : test instanceof RegExp
    ? (line: string) => test.test(line)
    : test;
