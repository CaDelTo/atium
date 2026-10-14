import type { TSESTree } from "@typescript-eslint/types";
import { describe, expect, it } from "vitest";
import { parseSource } from "../../test/parse.js";
import { titleOf } from "./title.js";

/** The title of `test(<title>, () => {})`. */
function titleIn(title: string) {
  const call = parseSource(`test(${title}, () => {});`).call(`test(${title}, () => {})`);
  // The first argument of the call written above is the title expression.
  return titleOf(call.arguments[0] as TSESTree.Expression);
}

describe("titleOf", () => {
  describe("static titles", () => {
    it.each([
      ['"adds to cart"', "adds to cart"],
      ["'adds to cart'", "adds to cart"],
      ["`adds to cart`", "adds to cart"],
      ['"caf\\u00e9"', "café"],
      ["`two\nlines`", "two\nlines"],
      ['"  keeps   spaces "', "  keeps   spaces "],
    ])("reads %s as the static title %j", (title, text) => {
      expect(titleIn(title)).toEqual({ text, isStatic: true });
    });
  });

  describe("titles that are not static", () => {
    it.each([
      ["`logs in as ${user.name}`", "logs in as ${user.name}"],
      ["`logs in as ${ user . name }`", "logs in as ${user.name}"],
      ['"cart " + item', "cart ${item}"],
      ['"a" + "b"', "ab"],
      ['"Item " + (count + 1)', "Item ${count + 1}"],
      ['count + 1 + " items"', "${count + 1} items"],
      ["a + b", "${a + b}"],
      ["`${user!.name}`", "${user.name}"],
      ["`${(name as string)}`", "${name}"],
      ["`${(user satisfies User).name}`", "${user.name}"],
      ["name", "${name}"],
      ["`${format(name, 2)} works`", "${format(name, 2)} works"],
      ["`${t('key')}`", '${t("key")}'],
      ["`${data[0].title}`", "${data[0].title}"],
      ["`${user?.name}`", "${user?.name}"],
      ["`${user?.[key]}`", "${user?.[key]}"],
      ["`${get?.()}`", "${get?.()}"],
      ["`${this.title}`", "${this.title}"],
      ["`${this.#title}`", "${this.#title}"],
      ["`${a ?? b}`", "${a ?? b}"],
      ["`${a * 2}`", "${a * 2}"],
      ["`${join(...parts)}`", "${join(...parts)}"],
      ["`${`inner ${x}`}`", "${`inner ${x}`}"],
      ["`${10n}`", "${10n}"],
      ["`${/a+/u}`", "${/a+/u}"],
      ["`${true}`", "${true}"],
      ["`${1_000}`", "${1000}"],
      ["`${null}`", "${null}"],
      ["42", "${42}"],
      ["`${a ? b : c}`", "${…}"],
      ["`${() => x}`", "${…}"],
    ])("renders %s as %j", (title, text) => {
      expect(titleIn(title)).toEqual({ text, isStatic: false });
    });
  });
});
