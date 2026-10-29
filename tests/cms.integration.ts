import { randomUUID } from "node:crypto";
import {
  captureVisitorEvent,
  getVisitor,
  listVisitors,
  pruneVisitorAnalytics,
  visitorReport,
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
        await pruneVisitorAnalytics();
        assert.equal(await getVisitor(oldId), null);
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
});
