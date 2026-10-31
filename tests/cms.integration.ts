import { randomUUID } from "node:crypto";
import {
  captureVisitorEvent,
  getVisitor,
  listVisitors,
  pruneVisitorAnalytics,
  visitorReport,
  setVisitorQa,
} from "../src/lib/visitorStore";
import { DETAIL_DAILY_LIMIT } from "../src/lib/visitorIdentity";
import test from "node:test";
import assert from "node:assert/strict";
import { prisma } from "../src/lib/prisma";
import {
  createDraftPost,
  updateAdminPost,
  publishAdminPost,
  getPublishedPostBySlug,
  listPublishedPosts,
  listPublishedTags,
  deleteAdminPost,
  restoreAdminPost,
  restorePostRevision,
} from "../src/lib/postEditorial";
import {
  createProject,
  updateProject,
  deleteProject,
  reorderProjects,
  listProjects,
} from "../src/lib/projectCatalog";
import { listMessages, updateMessages } from "../src/lib/messageInbox";
import {
  updateSiteSettings,
  getAdminSiteSettings,
} from "../src/lib/siteSettings";
import { recordAnalytics, analyticsReport } from "../src/lib/analyticsStore";

test("CMS database workflows preserve publication, concurrency and recovery contracts", async (t) => {
  const marker = `cms-test-${Date.now()}`;
  const postIds: string[] = [];
  const projectIds: string[] = [];
  const messageIds: string[] = [];
  t.after(async () => {
    await prisma.post.deleteMany({ where: { id: { in: postIds } } });
    await prisma.project.deleteMany({ where: { id: { in: projectIds } } });
    await prisma.contactMessage.deleteMany({
      where: { id: { in: messageIds } },
    });
    await prisma.siteSetting.deleteMany({
      where: { key: { contains: marker } },
    });
    await prisma.$disconnect();
    await (
      globalThis as unknown as { prismaPool?: { end: () => Promise<void> } }
    ).prismaPool?.end();
  });
  await t.test(
    "draft saves, publication snapshots and stale editor rejection",
    async () => {
      const draft = await createDraftPost(marker);
      postIds.push(draft.id);
      const saved = await updateAdminPost(
        draft.id,
        {
          version: draft.version,
          title: "Published title",
          slug: marker,
          excerpt: "Original excerpt",
          tags: ["ORIGINAL"],
          bodyJson: {
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "Original article body" }],
              },
            ],
          },
        },
        marker,
      );
      let live = await publishAdminPost(draft.id, saved.version, marker);
      const edits = await updateAdminPost(
        draft.id,
        {
          version: live.version,
          title: "Secret working title",
          tags: ["DRAFTONLY"],
        },
        marker,
      );
      assert.equal(edits.hasUnpublishedChanges, true);
      // The previous application also reads these columns directly: rollback cannot expose drafts.
      const storedPublished = await prisma.post.findUniqueOrThrow({
        where: { id: draft.id },
      });
      assert.equal(storedPublished.title, "Published title");
      assert.deepEqual(storedPublished.tags, ["ORIGINAL"]);
      assert.ok(storedPublished.draftSnapshot);
      assert.equal(
        (await getPublishedPostBySlug(marker))?.title,
        "Published title",
      );
      assert.equal(
        (await listPublishedPosts({ query: "Secret working title" })).some(
          (post) => post.id === draft.id,
        ),
        false,
      );
      assert.equal(
        (await listPublishedTags()).some((tag) => tag.name === "DRAFTONLY"),
        false,
      );
      await assert.rejects(
        updateAdminPost(
          draft.id,
          { version: live.version, title: "Overwrite" },
          marker,
        ),
        { status: 409 },
      );
      const races = await Promise.allSettled([
        updateAdminPost(
          draft.id,
          { version: edits.version, excerpt: "Winner A" },
          marker,
        ),
        updateAdminPost(
          draft.id,
          { version: edits.version, excerpt: "Winner B" },
          marker,
        ),
      ]);
      assert.equal(
        races.filter((result) => result.status === "fulfilled").length,
        1,
      );
      const current = await prisma.post.findUniqueOrThrow({
        where: { id: draft.id },
      });
      live = await publishAdminPost(draft.id, current.version, marker);
      assert.equal(
        (await getPublishedPostBySlug(marker))?.title,
        "Secret working title",
      );
      const restored = await restorePostRevision(
        draft.id,
        live.version,
        saved.version,
        marker,
      );
      assert.equal(restored.title, "Published title");
      assert.equal(
        (await getPublishedPostBySlug(marker))?.title,
        "Secret working title",
      );
      const trashed = await deleteAdminPost(draft.id, restored.version, marker);
      assert.equal(await getPublishedPostBySlug(marker), null);
      const recovered = await restoreAdminPost(
        draft.id,
        trashed.version,
        marker,
      );
      assert.equal(recovered.status, "DRAFT");
      assert.equal(recovered.title, "Published title");
      assert.ok(
        (await prisma.postRevision.count({ where: { postId: draft.id } })) >= 6,
      );
    },
  );
  await t.test(
    "bulk inbox edits roll back entirely on a stale version",
    async () => {
      const one = await prisma.contactMessage.create({
        data: { name: "QA One", email: "one@example.invalid", message: marker },
      });
      const two = await prisma.contactMessage.create({
        data: { name: "QA Two", email: "two@example.invalid", message: marker },
      });
      messageIds.push(one.id, two.id);
      await assert.rejects(
        updateMessages(
          {
            records: [
              { id: one.id, version: 1 },
              { id: two.id, version: 999 },
            ],
            changes: { read: true },
          },
          marker,
        ),
        { status: 409 },
      );
      assert.equal(
        (
          await prisma.contactMessage.findUniqueOrThrow({
            where: { id: one.id },
          })
        ).read,
        false,
      );
      await updateMessages(
        {
          records: [{ id: one.id, version: 1 }],
          changes: {
            read: true,
            status: "RESOLVED",
            note: "Follow-up completed",
          },
        },
        marker,
      );
      const inbox = await listMessages(
        new URLSearchParams({ q: marker, status: "RESOLVED" }),
      );
      assert.equal(inbox.items[0].note, "Follow-up completed");
      assert.equal(inbox.total, 1);
    },
  );
  await t.test(
    "project content, ordering and Trash use atomic versioned changes",
    async () => {
      const one = await createProject(
        {
          number: `${marker}-1`,
          title: "QA One",
          description: "Description",
          tags: [],
          year: "2026",
          status: "LIVE",
          caseStudy: { subtitle: "Original case study" },
        },
        marker,
      );
      const two = await createProject(
        {
          number: `${marker}-2`,
          title: "QA Two",
          description: "Description",
          tags: [],
          year: "2026",
          status: "LIVE",
        },
        marker,
      );
      projectIds.push(one.id, two.id);
      await assert.rejects(
        updateProject(
          one.id,
          {
            version: 999,
            title: "Overwrite",
            caseStudy: { subtitle: "Wrong" },
          },
          marker,
        ),
        { status: 409 },
      );
      assert.equal(
        (await listProjects()).find((item) => item.id === one.id)?.caseStudy
          ?.subtitle,
        "Original case study",
      );
      const all = await prisma.project.findMany({ where: { deletedAt: null } });
      const original = all.find((row) => row.id === one.id)?.sortOrder;
      await assert.rejects(
        reorderProjects(
          all.map((row) => ({
            id: row.id,
            version: row.id === two.id ? 999 : row.version,
          })),
          marker,
        ),
        { status: 409 },
      );
      assert.equal(
        (await prisma.project.findUniqueOrThrow({ where: { id: one.id } }))
          .sortOrder,
        original,
      );
      await deleteProject(one.id, one.version, marker);
      assert.equal(
        (await listProjects()).some((row) => row.id === one.id),
        false,
      );
      await deleteProject(one.id, one.version + 1, marker, true);
      assert.equal(
        (await listProjects()).find((row) => row.id === one.id)?.caseStudy
          ?.subtitle,
        "Original case study",
      );
    },
  );
  await t.test(
    "settings reject stale updates and retain the saved configuration",
    async () => {
      const previous = await getAdminSiteSettings();
      const saved = await updateSiteSettings(
        { siteName: "QA Workspace", version: previous._version },
        marker,
      );
      assert.equal(saved?.siteName, "QA Workspace");
      await assert.rejects(
        updateSiteSettings(
          { siteName: "Overwrite", version: previous._version },
          marker,
        ),
        { status: 409 },
      );
      assert.equal((await getAdminSiteSettings()).siteName, "QA Workspace");
      await updateSiteSettings(
        { ...previous, version: saved?._version },
        marker,
      );
    },
  );
  await t.test(
    "parallel analytics increments are exact and old daily buckets expire",
    async () => {
      const path = `/v1/blog/${marker}`;
      await prisma.analyticsDaily.create({
        data: {
          day: new Date("2020-01-01"),
          key: marker,
          type: "pageview",
          path,
          count: 4,
        },
      });
      await Promise.all(
        Array.from({ length: 24 }, () =>
          recordAnalytics({
            type: "pageview",
            path,
            destination: "",
            label: "",
            referrer: "Direct",
            device: "desktop",
          }),
        ),
      );
      const report = await analyticsReport(7);
      assert.equal(report.pages.find((row) => row.label === path)?.count, 24);
      assert.equal(
        await prisma.analyticsDaily.count({ where: { key: marker } }),
        0,
      );
      await prisma.analyticsDaily.deleteMany({ where: { path } });
    },
  );
  await t.test(
    "visitor capture deduplicates events, keeps similar profiles separate and enforces retention/capacity",
    async () => {
      const priorProxy = process.env.ANALYTICS_TRUST_PROXY;
      process.env.ANALYTICS_TRUST_PROXY = "true";
      const path = `/v1/blog/visitor-${marker}`;
      const headers = new Headers({
        "user-agent": "Mozilla/5.0 (Windows NT 10.0) Chrome/130.0",
        "x-real-ip": "198.51.100.7",
        "x-forwarded-for": "192.0.2.99",
        "cf-ipcountry": "US",
      });
      const first = {
        visitorToken: randomUUID(),
        sessionToken: randomUUID(),
        eventId: randomUUID(),
        signals: {
          language: "en-US",
          timezone: "America/Los_Angeles",
          screen: "1920x1080",
          pixelRatio: 1,
          touchPoints: 0,
          hardwareConcurrency: 8,
        },
        loadMs: 1234,
        campaignName: "QA-campaign",
        ip: "203.0.113.99",
      };
      const event = {
        type: "pageview" as const,
        path,
        destination: "",
        label: "",
        referrer: "Direct",
        device: "desktop",
      };
      let cappedDay: Date | undefined;
      let budgetBeforeCap = 0;
      try {
        const captures = await Promise.all([
          captureVisitorEvent(event, first, headers),
          captureVisitorEvent(event, first, headers),
        ]);
        assert.equal(captures.filter((item) => item.stored).length, 1);
        assert.equal(captures.filter((item) => item.duplicate).length, 1);
        assert.equal(
          (await analyticsReport(7)).pages.find((row) => row.label === path)
            ?.count,
          1,
        );
        const second = {
          ...first,
          visitorToken: randomUUID(),
          sessionToken: randomUUID(),
          eventId: randomUUID(),
        };
        await captureVisitorEvent(event, second, headers);
        const rows = await listVisitors(
          new URLSearchParams({ q: "198.51.100.7" }),
        );
        assert.equal(rows.total, 2);
        const detail = await getVisitor(rows.items[0].id);
        assert.equal(detail?.lastIp, "198.51.100.7");
        assert.equal(detail?.similar, 1);
        assert.equal(detail?.sessions[0].events[0].loadMs, 1234);
        assert.equal(detail?.sessions[0].events[0].ip, "198.51.100.7");
        await captureVisitorEvent(
          { ...event, type: "engagement" },
          {
            ...first,
            eventId: randomUUID(),
            activeMs: 20_000,
            scrollDepth: 90,
            loadMs: 0,
          },
          headers,
        );
        const audience = await visitorReport(7);
        assert.ok(audience.engagedSessions >= 1);
        assert.ok(
          audience.campaigns.some((row) => row.label.includes("QA-campaign")),
        );
        assert.equal(audience.retentionDays, 30);
        assert.equal(
          audience.performancePages.find((row) => row.path === path)
            ?.milliseconds,
          1234,
        );
        const count = await prisma.analyticsVisitEvent.count({
          where: { path },
        });
        const privateHeaders = new Headers(headers);
        privateHeaders.set("sec-gpc", "1");
        await captureVisitorEvent(
          event,
          { ...first, eventId: randomUUID() },
          privateHeaders,
        );
        await captureVisitorEvent(event, false, headers);
        assert.equal(
          (await analyticsReport(7)).pages.find((row) => row.label === path)
            ?.count,
          2,
        );
        assert.equal(
          await prisma.analyticsVisitEvent.count({ where: { path } }),
          count,
        );
        const oldId = "f".repeat(64);
        const oldDate = new Date(Date.now() - 31 * 86_400_000);
        await prisma.analyticsVisitor.create({
          data: {
            id: oldId,
            firstSeen: oldDate,
            lastSeen: oldDate,
            lastIp: "192.0.2.1",
            ipSource: "trusted-proxy",
            browser: "Other",
            os: "Other",
            device: "other",
            fingerprint: oldId,
            userAgent: "QA expired",
            signals: {},
          },
        });
        const expiredAudit = await prisma.cmsAuditEvent.create({ data: { actor: marker, action: "analytics.classify", entity: "visitor", entityId: oldId, summary: "Browser marked as QA/internal", createdAt: oldDate } });
        await pruneVisitorAnalytics();
        assert.equal(await getVisitor(oldId), null);
        const retainedAudit = await prisma.cmsAuditEvent.findUniqueOrThrow({ where: { id: expiredAudit.id } });
        assert.equal(retainedAudit.entityId, "", "Visitor identity expires from classification audit history too");
        assert.equal(retainedAudit.actor, marker, "Administrator action attribution remains available");
        await prisma.cmsAuditEvent.delete({ where: { id: expiredAudit.id } });
        const day = new Date(new Date().toISOString().slice(0, 10));
        const budget = await prisma.analyticsCaptureDay.findUniqueOrThrow({
          where: { day },
        });
        budgetBeforeCap = budget.events;
        cappedDay = day;
        await prisma.analyticsCaptureDay.update({
          where: { day },
          data: { events: DETAIL_DAILY_LIMIT },
        });
        const limited = await captureVisitorEvent(
          event,
          { ...first, eventId: randomUUID() },
          headers,
        );
        assert.equal(limited.stored, false);
        assert.equal(
          await prisma.analyticsVisitEvent.count({ where: { path } }),
          count,
        );
        assert.equal(
          (await analyticsReport(7)).pages.find((row) => row.label === path)
            ?.count,
          3,
        );
      } finally {
        if (cappedDay)
          await prisma.analyticsCaptureDay.update({
            where: { day: cappedDay },
            data: { events: budgetBeforeCap },
          });
        const sessions = await prisma.analyticsSession.findMany({
          where: { entryPath: path },
          select: { visitorId: true },
        });
        await prisma.analyticsVisitor.deleteMany({
          where: { id: { in: sessions.map((row) => row.visitorId) } },
        });
        await prisma.analyticsDaily.deleteMany({ where: { path } });
        if (priorProxy === undefined) delete process.env.ANALYTICS_TRUST_PROXY;
        else process.env.ANALYTICS_TRUST_PROXY = priorProxy;
      }
    },
  );
  await t.test("visitor ordering, IP/fingerprint history and analytics key continuity", async () => {
    const path = `/v1/blog/ordering-${marker}`;
    const context = { visitorToken: randomUUID(), sessionToken: randomUUID(), eventId: randomUUID(), clientSequence: 2, occurredAt: Date.now() - 1000, signals: { language: "en-US" } };
    const event = { type: "pageview" as const, path, destination: "", label: "", referrer: "Direct", device: "desktop" };
    const headers = new Headers({ "user-agent": "Regression Chrome/130.0 Windows", "x-real-ip": "198.51.100.77" });
    const priorProxy = process.env.ANALYTICS_TRUST_PROXY;
    const priorKey = process.env.ANALYTICS_HASH_SECRET;
    const priorJwt = process.env.JWT_SECRET;
    process.env.ANALYTICS_TRUST_PROXY = "true";
    process.env.ANALYTICS_HASH_SECRET = "stable-analytics-test-key-0123456789abcdef";
    let id: string | undefined;
    let matchingId: string | undefined;
    try {
      await captureVisitorEvent(event, context, headers);
      const row = await prisma.analyticsSession.findFirstOrThrow({ where: { entryPath: path } }); id = row.visitorId;
      // A prior pageview arriving late changes entry, never rolls back exit.
      await captureVisitorEvent({ ...event, path: "/v1/contact" }, { ...context, eventId: randomUUID(), clientSequence: 1, occurredAt: Date.now() - 2000 }, headers);
      // A delayed old-page engagement cannot replace the destination.
      await captureVisitorEvent({ ...event, path: "/v1/contact", type: "engagement" }, { ...context, eventId: randomUUID(), clientSequence: 3, activeMs: 1000, occurredAt: Date.now() - 1500 }, headers);
      let detail = await getVisitor(id);
      assert.equal(detail?.sessions[0].entryPath, "/v1/contact");
      assert.equal(detail?.sessions[0].exitPath, path);
      assert.deepEqual(detail?.sessions[0].events.map(row => row.clientSequence), [1, 2]);
      assert.ok(detail && detail.firstSeen <= detail.lastSeen);
      // Existing sessions have a known first page but no pre-upgrade sequence.
      await prisma.analyticsSession.update({ where: { id: row.id }, data: { entrySequence: 0 } });
      await captureVisitorEvent({ ...event, path: `${path}-latest` }, { ...context, eventId: randomUUID(), clientSequence: 4, occurredAt: Date.now() }, headers);
      detail = await getVisitor(id);
      assert.equal(detail?.sessions[0].entryPath, "/v1/contact", "An upgraded client preserves a legacy session's original entry");
      assert.equal(detail?.sessions[0].exitPath, `${path}-latest`);
      const fingerprint = detail!.fingerprint;
      const matchingPath = `${path}-match`;
      await captureVisitorEvent({ ...event, path: matchingPath }, { ...context, visitorToken: randomUUID(), sessionToken: randomUUID(), eventId: randomUUID() }, headers);
      matchingId = (await prisma.analyticsSession.findFirstOrThrow({ where: { entryPath: matchingPath } })).visitorId;
      headers.set("x-real-ip", "2001:db8::77"); headers.set("user-agent", "Regression Chrome/131.0 Windows");
      process.env.JWT_SECRET = "rotated-auth-test-secret-0123456789abcdef";
      await captureVisitorEvent(event, { ...context, eventId: randomUUID(), sessionToken: randomUUID(), clientSequence: 1 }, headers);
      detail = await getVisitor(id);
      assert.equal(detail?.sessions.length, 2, "Auth key rotation preserves the analytics visitor ID");
      assert.equal(detail?.ipHistory.length, 2);
      assert.equal(detail?.fingerprintHistory.length, 2);
      assert.equal(detail?.similar, 1, "An earlier fingerprint still matches after a browser update");
      assert.equal(detail?.lastIp, "2001:db8::77");
      assert.ok((await listVisitors(new URLSearchParams({ q: "198.51.100.77" }))).items.some(row => row.id === id));
      assert.ok((await listVisitors(new URLSearchParams({ q: fingerprint }))).items.some(row => row.id === id));
    } finally {
      if (id) await prisma.analyticsVisitor.delete({ where: { id } });
      if (matchingId) await prisma.analyticsVisitor.delete({ where: { id: matchingId } });
      await prisma.analyticsDaily.deleteMany({ where: { OR: [{ path: { startsWith: path } }, { path: "/v1/contact" }] } });
      for (const [key, value] of Object.entries({ ANALYTICS_TRUST_PROXY: priorProxy, ANALYTICS_HASH_SECRET: priorKey, JWT_SECRET: priorJwt })) {
        if (value === undefined) delete process.env[key]; else process.env[key] = value;
      }
    }
  });
  await t.test("window engagement excludes earlier activity; return metrics and QA filters stay consistent", async () => {
    const path = `/v1/blog/reporting-${marker}`;
    const context = { visitorToken: randomUUID(), sessionToken: randomUUID(), eventId: randomUUID(), clientSequence: 1, occurredAt: Date.now(), signals: {} };
    const event = { type: "pageview" as const, path, destination: "", label: "", referrer: "Direct", device: "desktop" };
    const headers = new Headers({ "user-agent": "Regression report Chrome/130.0" });
    let id: string | undefined;
    try {
      const beforePublic = await visitorReport(7, "public");
      await captureVisitorEvent(event, context, headers);
      const session = await prisma.analyticsSession.findFirstOrThrow({ where: { entryPath: path } }); id = session.visitorId;
      const old = new Date(Date.now() - 8 * 86_400_000);
      await prisma.analyticsVisitEvent.updateMany({ where: { sessionId: session.id }, data: { createdAt: old, occurredAt: old } });
      await prisma.analyticsSession.update({ where: { id: session.id }, data: { startedAt: old, activeMs: 80000, pageviews: 9, contacts: 1 } });
      await prisma.analyticsVisitor.update({ where: { id }, data: { firstSeen: old } });
      await captureVisitorEvent({ ...event, type: "engagement" }, { ...context, eventId: randomUUID(), clientSequence: 2, activeMs: 1000 }, headers);
      const window = await visitorReport(7, "public");
      assert.equal(window.engagedSessions, beforePublic.engagedSessions, "Lifetime counters do not create in-window engagement");
      assert.equal(window.contactSessions, beforePublic.contactSessions, "Earlier contacts do not convert this window");
      assert.ok(!window.landingPages.some(row => row.label === path));
      // Restore fixture timestamp so its linked aggregate has the same day.
      await prisma.analyticsVisitEvent.updateMany({ where: { sessionId: session.id, type: "pageview" }, data: { createdAt: new Date(), occurredAt: new Date() } });
      await captureVisitorEvent(event, { ...context, sessionToken: randomUUID(), eventId: randomUUID() }, headers);
      const returns = await visitorReport(7, "public");
      assert.ok(returns.returningVisitors > beforePublic.returningVisitors);
      assert.ok(returns.returningSessions > beforePublic.returningSessions);
      assert.equal(returns.newVisitors, beforePublic.newVisitors);
      const otherSession = await prisma.analyticsSession.findFirstOrThrow({ where: { visitorId: id, id: { not: session.id } } });
      const yesterday = new Date(Date.now() - 86_400_000);
      await prisma.analyticsVisitEvent.updateMany({ where: { sessionId: otherSession.id }, data: { createdAt: yesterday, occurredAt: yesterday } });
      assert.ok((await visitorReport(7, "public")).repeatDayVisitors > beforePublic.repeatDayVisitors);
      await prisma.analyticsVisitEvent.updateMany({ where: { sessionId: otherSession.id }, data: { createdAt: new Date(), occurredAt: new Date() } });
      const publicCount = (await analyticsReport(7, "public")).pages.find(row => row.label === path)?.count;
      assert.equal(publicCount, 2);
      await setVisitorQa(id, true, false, marker);
      assert.equal((await analyticsReport(7, "public")).pages.find(row => row.label === path), undefined);
      assert.equal((await analyticsReport(7, "qa")).pages.find(row => row.label === path)?.count, 2);
      assert.ok((await listVisitors(new URLSearchParams({ traffic: "qa" }))).items.some(row => row.id === id));
      assert.ok(!(await listVisitors(new URLSearchParams({ traffic: "public" }))).items.some(row => row.id === id));
      await assert.rejects(setVisitorQa(id, false, false, marker), /Classification changed/);
      await captureVisitorEvent(event, { ...context, eventId: randomUUID(), sessionToken: randomUUID() }, headers);
      assert.equal((await analyticsReport(7, "qa")).pages.find(row => row.label === path)?.count, 3);
      await setVisitorQa(id, false, true, marker);
      assert.equal((await analyticsReport(7, "public")).pages.find(row => row.label === path)?.count, 3);
      // Explicit QA tag arriving later reclassifies only this session's events.
      await captureVisitorEvent(event, { ...context, eventId: randomUUID(), clientSequence: 3, campaignSource: "qa" }, headers);
      assert.equal((await analyticsReport(7, "qa")).pages.find(row => row.label === path)?.count, 2);
      assert.equal((await analyticsReport(7, "all")).pages.find(row => row.label === path)?.count, 4);
    } finally {
      if (id) await prisma.analyticsVisitor.delete({ where: { id } });
      await prisma.analyticsDaily.deleteMany({ where: { path } });
      await prisma.cmsAuditEvent.deleteMany({ where: { actor: marker, action: "analytics.classify" } });
    }
  });

});
