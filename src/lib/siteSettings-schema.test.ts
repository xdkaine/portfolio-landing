import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_SITE_SETTINGS, mapDbRowsToSiteSettings} from './siteSettings-schema';

test('stored legacy default copy uses current wording while custom descriptions and stored rows stay intact', () => {
  const row = {key:'site_description',value:'Systems engineering and web development by Thomas Phao. Explore infrastructure projects, application case studies, and practical engineering notes.'};
  const original = row.value;
  assert.equal(mapDbRowsToSiteSettings([row]).siteDescription,DEFAULT_SITE_SETTINGS.siteDescription);
  assert.equal(row.value,original);
  const custom='My applications, experiments, and lessons from building them.';
  assert.equal(mapDbRowsToSiteSettings([{key:'site_description',value:custom}]).siteDescription,custom);
});
