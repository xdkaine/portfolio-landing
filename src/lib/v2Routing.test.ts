import { legacyProjectNumber } from "./v2/legacyProjects";
import test from "node:test";
import assert from "node:assert/strict";
import { entranceDirectionForNavigation, isPublicTransitionPath } from "./v2/publicTransition";

test("V2 navigation follows the public page order without claiming V1 or authentication routes", () => {
  assert.equal(entranceDirectionForNavigation("/v2/blog", "/v2/projects"), "from-right");
  assert.equal(entranceDirectionForNavigation("/v2", "/v2/blog"), "from-left");
  for (const path of ["/v2", "/v2/projects/1", "/v2/blog/example", "/v2/about", "/v2/contact", "/v2/privacy", "/v2/terms"]) assert.equal(isPublicTransitionPath(path), true);
  for (const path of ["/v1", "/v1/admin", "/v2/api/projects", "/v2/admin", "/v2/login"]) assert.equal(isPublicTransitionPath(path), false);
});

test("old V2 bookmarks resolve CMS numbers and ignore object prototype keys", () => {
  assert.equal(legacyProjectNumber("uma"), "2");
  assert.equal(legacyProjectNumber("uar"), "1");
  assert.equal(legacyProjectNumber("__proto__"), undefined);
  assert.equal(legacyProjectNumber("constructor"), undefined);
});
