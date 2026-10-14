import { describe, expect, it } from "vitest";
import { parseSource } from "../../test/parse.js";
import { fixedWaitOf } from "./waits.js";

function waitIn(code: string) {
  return fixedWaitOf(parseSource(code).call(code));
}

function promiseWaitIn(code: string) {
  return fixedWaitOf(parseSource(code).newExpression(code));
}

describe("fixedWaitOf", () => {
  it.each(["page.waitForTimeout(5000)", "frame.waitForTimeout(5000)"])("recognizes %s", (code) => {
    expect(waitIn(code)).toMatchObject({
      kind: "waitForTimeout",
      duration: { type: "Literal", value: 5000 },
    });
  });

  it("recognizes cy.wait with a number", () => {
    expect(waitIn("cy.wait(500)")).toMatchObject({ kind: "cy.wait" });
  });

  it("recognizes a cy.wait chained after another command", () => {
    expect(waitIn('cy.get("a").wait(500)')).toMatchObject({ kind: "cy.wait" });
  });

  it.each([
    ["cy.wait with an alias, which waits for a request", 'cy.wait("@getCart")'],
    ["cy.wait with several aliases", 'cy.wait(["@getCart", "@getUser"])'],
    ["cy.wait with a value of unknown type", "cy.wait(delay)"],
    ["a wait outside a cy chain", "queue.wait(500)"],
    ["a plain function", "waitForTimeout(500)"],
    ["another method", 'page.waitForSelector("#cart")'],
  ])("ignores %s", (_case, code) => {
    expect(waitIn(code)).toBeUndefined();
  });

  it.each([
    "new Promise(r => setTimeout(r, 1000))",
    "new Promise((resolve) => { setTimeout(resolve, 1000); })",
    "new Promise(function (done) { setTimeout(done, 1000); })",
  ])("recognizes %s", (code) => {
    expect(promiseWaitIn(code)).toMatchObject({
      kind: "setTimeout",
      duration: { type: "Literal", value: 1000 },
    });
  });

  it.each([
    ["another class", "new Deferred(r => setTimeout(r, 1000))"],
    ["a Promise without executor", "new Promise(executor)"],
    ["an executor without parameters", "new Promise(() => setTimeout(done, 1000))"],
    ["a timer that does not resolve", "new Promise(r => setTimeout(log, 1000))"],
    ["a timer that resolves through a callback", "new Promise(r => setTimeout(() => r(), 1000))"],
    ["another function", "new Promise(r => queueMicrotask(r))"],
    ["an executor that does more", "new Promise(r => { log(); setTimeout(r, 1000); })"],
    ["an executor whose statement is not a call", "new Promise(r => { r; })"],
    ["an executor that returns a value", "new Promise(r => r)"],
    ["an executor that returns the timer", "new Promise(r => { return setTimeout(r, 1000); })"],
    ["a destructured parameter", "new Promise(({ r }) => setTimeout(r, 1000))"],
  ])("ignores a Promise with %s", (_case, code) => {
    expect(promiseWaitIn(code)).toBeUndefined();
  });
});
