import test from "node:test";
import assert from "node:assert/strict";
import {
  isPublicTransitionPath,
  publicSectionForPath,
  sharedElementName,
  TRANSITION_TYPES,
  transitionTypesForNavigation,
} from "@/lib/publicTransition";

test("classifies public routes without including administration or sign-in", () => {
  assert.equal(isPublicTransitionPath("/v1"), true);
  assert.equal(isPublicTransitionPath("/v1/projects/03"), true);
  assert.equal(isPublicTransitionPath("/v1/blog/transmission"), true);
  assert.equal(isPublicTransitionPath("/v1/privacy"), true);
  assert.equal(isPublicTransitionPath("/v1/admin"), false);
  assert.equal(isPublicTransitionPath("/v1/login"), false);
});

test("maps detail paths to their public parent section", () => {
  assert.equal(publicSectionForPath("/v1/projects/03"), "/v1/projects");
  assert.equal(publicSectionForPath("/v1/blog/post?preview=1"), "/v1/blog");
  assert.equal(publicSectionForPath("/v1/terms"), "/v1/terms");
});

test("infers directional section transitions and explicit navigation intents", () => {
  assert.deepEqual(
    transitionTypesForNavigation({
      currentPath: "/v1",
      href: "/v1/blog",
      intent: "section",
    }),
    [TRANSITION_TYPES.sectionForward],
  );
  assert.deepEqual(
    transitionTypesForNavigation({
      currentPath: "/v1/contact",
      href: "/v1/projects",
      intent: "section",
    }),
    [TRANSITION_TYPES.sectionBack],
  );
  assert.deepEqual(
    transitionTypesForNavigation({
      currentPath: "/v1/blog/one",
      href: "/v1/blog/two",
      intent: "sibling-next",
    }),
    [TRANSITION_TYPES.siblingNext],
  );
  assert.deepEqual(
    transitionTypesForNavigation({
      currentPath: "/v1/blog/two",
      href: "/v1/blog/one",
      intent: "sibling-prev",
    }),
    [TRANSITION_TYPES.siblingPrev],
  );
  assert.deepEqual(
    transitionTypesForNavigation({
      currentPath: "/v1/projects",
      href: "/v1/projects/03",
      intent: "drill-in",
    }),
    [TRANSITION_TYPES.drillIn],
  );
  assert.deepEqual(
    transitionTypesForNavigation({
      currentPath: "/v1/blog/post",
      href: "/v1/blog",
      intent: "drill-out",
    }),
    [TRANSITION_TYPES.drillOut],
  );
});

test("suppresses same-path/query-only and non-public transitions", () => {
  assert.deepEqual(
    transitionTypesForNavigation({
      currentPath: "/v1/blog",
      href: "/v1/blog?tag=DESIGN",
      intent: "utility",
    }),
    [TRANSITION_TYPES.skip],
  );
  assert.deepEqual(
    transitionTypesForNavigation({
      currentPath: "/v1/admin",
      href: "/v1/projects",
      intent: "section",
    }),
    [TRANSITION_TYPES.skip],
  );
});

test("builds stable shared element names from content keys", () => {
  assert.equal(
    sharedElementName("project-title", " 03 / Signal Grid "),
    "editorial-project-title-03-signal-grid",
  );
  assert.equal(
    sharedElementName("post-cover", "A New Transmission"),
    "editorial-post-cover-a-new-transmission",
  );
});
