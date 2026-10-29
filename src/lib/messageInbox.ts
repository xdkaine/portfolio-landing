import "server-only";
import { prisma } from "./prisma";
import type { Prisma } from "@/generated/prisma/client";
import {
  CmsError,
  MESSAGE_STATUSES,
  parseMessageUpdate,
  requireVersion,
} from "./cmsRules";

export async function listMessages(params: URLSearchParams) {
  const page = Math.max(1, Math.min(10000, Number(params.get("page")) || 1));
  const query = (params.get("q") ?? "").trim().slice(0, 120);
  const status = params.get("status");
  const where: Prisma.ContactMessageWhereInput = {
    ...(status && MESSAGE_STATUSES.includes(status as never)
      ? { status: status as never }
      : {}),
    ...(status === "UNREAD"
      ? { read: false, status: { not: "ARCHIVED" } }
      : {}),
    ...(!status || status === "ALL" ? { status: { not: "ARCHIVED" } } : {}),
    ...(query
      ? {
          OR: ["name", "email", "message"].map((field) => ({
            [field]: { contains: query, mode: "insensitive" },
          })),
        }
      : {}),
  };
  const [items, total, unread, active] = await prisma.$transaction([
    prisma.contactMessage.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip: (Math.floor(page) - 1) * 20,
      take: 20,
    }),
    prisma.contactMessage.count({ where }),
    prisma.contactMessage.count({
      where: { read: false, status: { not: "ARCHIVED" } },
    }),
    prisma.contactMessage.count({ where: { status: { not: "ARCHIVED" } } }),
  ]);
  return {
    items,
    total,
    unread,
    active,
    page: Math.floor(page),
    pages: Math.max(1, Math.ceil(total / 20)),
  };
}
export async function updateMessages(input: unknown, actor: string) {
  if (!input || typeof input !== "object") throw new CmsError("Invalid update");
  const body = input as Record<string, unknown>;
  if (
    !Array.isArray(body.records) ||
    !body.records.length ||
    body.records.length > 20
  )
    throw new CmsError("Select between 1 and 20 messages.");
  const records = body.records.map((record) => {
    if (
      !record ||
      typeof record !== "object" ||
      typeof record.id !== "string" ||
      record.id.length > 100
    )
      throw new CmsError("Invalid message selection");
    return { id: record.id, version: requireVersion(record) };
  });
  if (new Set(records.map((record) => record.id)).size !== records.length)
    throw new CmsError("Duplicate message selection");
  const changes = parseMessageUpdate(body.changes);
  return prisma.$transaction(async (tx) => {
    for (const { id, version } of records) {
      const result = await tx.contactMessage.updateMany({
        where: { id, version },
        data: { ...changes, version: { increment: 1 } },
      });
      if (result.count !== 1)
        throw new CmsError(
          "A selected message changed in another session. Refresh and try again. No changes were applied.",
          409,
        );
      await tx.cmsAuditEvent.create({
        data: {
          actor,
          action: changes.status
            ? `marked ${changes.status.toLowerCase()}`
            : changes.note !== undefined
              ? "note updated"
              : changes.read
                ? "marked read"
                : "marked unread",
          entity: "message",
          entityId: id,
          summary: "Contact inbox update",
        },
      });
    }
    return { updated: records.length };
  });
}
