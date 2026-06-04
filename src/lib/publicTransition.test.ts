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
  assert.equal(isPublicTransitionPath("/"), true);
  assert.equal(isPublicTransitionPath("/projects/03"), true);
  assert.equal(isPublicTransitionPath("/blog/transmission"), true);
  assert.equal(isPublicTransitionPath("/privacy"), true);
  assert.equal(isPublicTransitionPath("/admin"), false);
  assert.equal(isPublicTransitionPath("/login"), false);
});

test("maps detail paths to their public parent section", () => {
  assert.equal(publicSectionForPath("/projects/03"), "/projects");
  assert.equal(publicSectionForPath("/blog/post?preview=1"), "/blog");
  assert.equal(publicSectionForPath("/terms"), "/terms");
});

test("infers directional section transitions and explicit navigation intents", () => {
  assert.deepEqual(
    transitionTypesForNavigation({
      currentPath: "/",
      href: "/blog",
      intent: "section",
    }),
    [TRANSITION_TYPES.sectionForward],
  );
  assert.deepEqual(
    transitionTypesForNavigation({
      currentPath: "/contact",
      href: "/projects",
      intent: "section",
    }),
    [TRANSITION_TYPES.sectionBack],
  );
  assert.deepEqual(
    transitionTypesForNavigation({
      currentPath: "/projects",
      href: "/projects/03",
      intent: "drill-in",
    }),
    [TRANSITION_TYPES.drillIn],
  );
  assert.deepEqual(
    transitionTypesForNavigation({
      currentPath: "/blog/post",
      href: "/blog",
      intent: "drill-out",
    }),
    [TRANSITION_TYPES.drillOut],
  );
});

test("suppresses same-path/query-only and non-public transitions", () => {
  assert.deepEqual(
    transitionTypesForNavigation({
      currentPath: "/blog",
      href: "/blog?tag=DESIGN",
      intent: "utility",
    }),
    [TRANSITION_TYPES.skip],
  );
  assert.deepEqual(
    transitionTypesForNavigation({
      currentPath: "/admin",
      href: "/projects",
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
