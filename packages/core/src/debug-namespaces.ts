/**
 * Tells whether a `DEBUG` value enables a namespace, with the syntax of the
 * `debug` package: patterns separated by commas or spaces, `*` matching any
 * sequence of characters, and a leading `-` excluding what it matches. An
 * exclusion wins over any inclusion, whatever their order.
 *
 * @param debugEnv - Value of the `DEBUG` environment variable, if set.
 * @param namespace - Namespace of the logger, such as `"atium:cli"`.
 * @returns `true` if some pattern includes the namespace and none excludes it.
 *
 * @example
 * ```ts
 * isDebugEnabled("atium:*", "atium:cli"); // true
 * isDebugEnabled("atium:*,-atium:cli", "atium:cli"); // false
 * ```
 */
export function isDebugEnabled(debugEnv: string | undefined, namespace: string): boolean {
  if (debugEnv === undefined) {
    return false;
  }
  let included = false;
  for (const pattern of debugEnv.split(/[\s,]+/)) {
    if (pattern.startsWith("-")) {
      if (matchesGlob(pattern.slice(1), namespace)) {
        return false;
      }
    } else if (pattern !== "" && matchesGlob(pattern, namespace)) {
      included = true;
    }
  }
  return included;
}

/**
 * Matches a pattern where `*` stands for any sequence, without building a
 * regular expression from the environment.
 */
function matchesGlob(pattern: string, text: string): boolean {
  const [first = "", ...rest] = pattern.split("*");
  const last = rest.pop();
  if (last === undefined) {
    return pattern === text;
  }
  if (text.length < first.length + last.length || !text.startsWith(first) || !text.endsWith(last)) {
    return false;
  }
  // Each middle part is matched as early as possible; for `*`-only patterns
  // that is enough to find a match whenever one exists.
  const end = text.length - last.length;
  let position = first.length;
  for (const part of rest) {
    const index = text.indexOf(part, position);
    if (index === -1 || index + part.length > end) {
      return false;
    }
    position = index + part.length;
  }
  return true;
}
