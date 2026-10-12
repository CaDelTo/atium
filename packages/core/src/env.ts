/** Environment variables, normally `process.env`. */
export type EnvVars = Readonly<Record<string, string | undefined>>;

/**
 * `value`, or `undefined` if it is empty. CI systems and shells often define
 * a variable as empty instead of leaving it out, so empty counts as unset.
 *
 * @param value - A variable's value, or a value read from one.
 * @returns The value, or `undefined` if it is missing or empty.
 */
export function nonEmpty(value: string | undefined): string | undefined {
  return value === "" ? undefined : value;
}

/**
 * Value of the variable `name`, with an empty one counted as unset (see
 * {@link nonEmpty}).
 *
 * @param env - Environment variables.
 * @param name - Name of the variable.
 * @returns Its value, or `undefined` if it is missing or empty.
 */
export function envValue(env: EnvVars, name: string): string | undefined {
  return nonEmpty(env[name]);
}
