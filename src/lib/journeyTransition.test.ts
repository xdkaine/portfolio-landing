import test from "node:test";
import assert from "node:assert/strict";
import {
  shouldAnimateJourneyActivation,
  transformFrameWithinStage,
} from "@/lib/journeyTransition";

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

test("maps source and destination frames into transform-only stage motion", () => {
  assert.deepEqual(
    transformFrameWithinStage(
      { top: 80, left: 40, width: 1000, height: 700 },
      { top: 180, left: 140, width: 500, height: 350 },
    ),
    { x: 100, y: 100, scaleX: 0.5, scaleY: 0.5 },
  );
});
