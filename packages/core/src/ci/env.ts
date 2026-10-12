import type { EnvVars } from "../env.js";
import { envValue } from "../env.js";

/**
 * Value of the variable `name` as a positive integer, such as a run attempt
 * or a pull request number.
 *
 * @param env - Environment variables.
 * @param name - Name of the variable.
 * @returns The integer, or `undefined` if the variable is missing, empty or
 * anything else, such as `0`, `-1`, `07` or `3.5`.
 */
export function envPositiveInt(env: EnvVars, name: string): number | undefined {
  return toPositiveInt(envValue(env, name));
}

/**
 * Parses a positive integer written in decimal, without sign or leading zeros.
 *
 * @param value - Text to parse.
 * @returns The integer, or `undefined` if `value` is not one or is beyond
 * `Number.MAX_SAFE_INTEGER`.
 */
export function toPositiveInt(value: string | undefined): number | undefined {
  if (value === undefined || !/^[1-9]\d*$/.test(value)) {
    return undefined;
  }
  const number = Number(value);
  return Number.isSafeInteger(number) ? number : undefined;
}
