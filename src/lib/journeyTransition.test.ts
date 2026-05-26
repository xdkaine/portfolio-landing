import test from "node:test";
import assert from "node:assert/strict";
import { shouldAnimateJourneyActivation } from "@/lib/journeyTransition";

const baseActivation = {
  active: false,
  reducedMotion: false,
  defaultPrevented: false,
  button: 0,
  metaKey: false,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
};

test("animates ordinary primary and keyboard-originated link activations", () => {
  assert.equal(shouldAnimateJourneyActivation(baseActivation), true);
  assert.equal(
    shouldAnimateJourneyActivation({ ...baseActivation, button: 0 }),
    true,
  );
});

test("does not intercept modified, new-tab, or download navigation", () => {
  assert.equal(
    shouldAnimateJourneyActivation({ ...baseActivation, ctrlKey: true }),
    false,
  );
  assert.equal(
    shouldAnimateJourneyActivation({ ...baseActivation, target: "_blank" }),
    false,
  );
  assert.equal(
    shouldAnimateJourneyActivation({ ...baseActivation, download: true }),
    false,
  );
});

test("does not animate for reduced motion or while a handoff is active", () => {
  assert.equal(
    shouldAnimateJourneyActivation({ ...baseActivation, reducedMotion: true }),
    false,
  );
  assert.equal(
    shouldAnimateJourneyActivation({ ...baseActivation, active: true }),
    false,
  );
});
