import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth";
import {
  normalizeProjectCaseStudyInput,
  parseProjectCaseStudy,
  projectCaseStudySettingKey,
  serializeProjectCaseStudy,
} from "@/lib/projectCaseStudy";

type RouteParams = { params: Promise<{ id: string }> };

// Public: get single project
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    let project = await prisma.project.findUnique({ where: { id } });

    if (!project) {
      project = await prisma.project.findUnique({ where: { number: id } });
    }

    if (!project) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const caseStudySetting = await prisma.siteSetting.findUnique({
      where: { key: projectCaseStudySettingKey(project.number) },
      select: { value: true },
    });

    return NextResponse.json({
      ...project,
      status: project.status === "IN_PROGRESS" ? "IN PROGRESS" : project.status,
      caseStudy: parseProjectCaseStudy(caseStudySetting?.value),
    });
  } catch {
    return NextResponse.json({ error: "Failed to fetch project" }, { status: 500 });
  }
}

// Protected: update project
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json() as Record<string, unknown>;
    const hasCaseStudyInPayload = Object.hasOwn(body, "caseStudy");
    const caseStudyFromPayload = normalizeProjectCaseStudyInput(body.caseStudy);

    // Map display status to DB enum
    const normalizedStatus =
      body.status === "IN PROGRESS" ? "IN_PROGRESS" : body.status;

    const existing = await prisma.project.findUnique({
      where: { id },
      select: { number: true },
    });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updateData: {
      number?: string;
      title?: string;
      description?: string;
      tags?: string[];
      year?: string;
      url?: string | null;
      github?: string | null;
      status?: "LIVE" | "IN_PROGRESS" | "ARCHIVED";
      featured?: boolean;
      sortOrder?: number;
    } = {};

    if (typeof body.number === "string" && body.number.trim()) {
      updateData.number = body.number.trim();
    }
    if (typeof body.title === "string" && body.title.trim()) {
      updateData.title = body.title.trim();
    }
    if (typeof body.description === "string" && body.description.trim()) {
      updateData.description = body.description.trim();
    }
    if (
      Array.isArray(body.tags) &&
      body.tags.every((tag) => typeof tag === "string")
    ) {
      updateData.tags = body.tags.map((tag) => tag.trim()).filter(Boolean);
    }
    if (typeof body.year === "string" && body.year.trim()) {
      updateData.year = body.year.trim();
    }
    if (typeof body.url === "string") {
      updateData.url = body.url.trim() || null;
    }
    if (typeof body.github === "string") {
      updateData.github = body.github.trim() || null;
    }
    if (
      normalizedStatus === "LIVE" ||
      normalizedStatus === "IN_PROGRESS" ||
      normalizedStatus === "ARCHIVED"
    ) {
      updateData.status = normalizedStatus;
    }
    if (typeof body.featured === "boolean") {
      updateData.featured = body.featured;
    }
    if (typeof body.sortOrder === "number" && Number.isFinite(body.sortOrder)) {
      updateData.sortOrder = body.sortOrder;
    }

    const project = await prisma.project.update({
      where: { id },
      data: updateData,
    });

    const oldCaseStudyKey = projectCaseStudySettingKey(existing.number);
    const newCaseStudyKey = projectCaseStudySettingKey(project.number);

    if (hasCaseStudyInPayload) {
      if (caseStudyFromPayload) {
        await prisma.siteSetting.upsert({
          where: { key: newCaseStudyKey },
          update: { value: serializeProjectCaseStudy(caseStudyFromPayload) },
          create: {
            key: newCaseStudyKey,
            value: serializeProjectCaseStudy(caseStudyFromPayload),
          },
        });
      } else {
        await prisma.siteSetting.delete({ where: { key: newCaseStudyKey } }).catch(() => {
          // no-op: setting may not exist
        });
      }
    } else if (oldCaseStudyKey !== newCaseStudyKey) {
      const previousCaseStudy = await prisma.siteSetting.findUnique({
        where: { key: oldCaseStudyKey },
        select: { value: true },
      });

      if (previousCaseStudy?.value) {
        await prisma.siteSetting.upsert({
          where: { key: newCaseStudyKey },
          update: { value: previousCaseStudy.value },
          create: { key: newCaseStudyKey, value: previousCaseStudy.value },
        });
      }
    }

    if (oldCaseStudyKey !== newCaseStudyKey) {
      await prisma.siteSetting.delete({ where: { key: oldCaseStudyKey } }).catch(() => {
        // no-op: old key may not exist
      });
    }

    const caseStudySetting = await prisma.siteSetting.findUnique({
      where: { key: newCaseStudyKey },
      select: { value: true },
    });

    return NextResponse.json({
      ...project,
      status: project.status === "IN_PROGRESS" ? "IN PROGRESS" : project.status,
      caseStudy: parseProjectCaseStudy(caseStudySetting?.value),
    });
  } catch {
    return NextResponse.json({ error: "Failed to update project" }, { status: 500 });
  }
}

// Protected: delete project
export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const existing = await prisma.project.findUnique({
      where: { id },
      select: { number: true },
    });
    await prisma.project.delete({ where: { id } });

    if (existing?.number) {
      await prisma.siteSetting
        .delete({ where: { key: projectCaseStudySettingKey(existing.number) } })
        .catch(() => {
          // no-op: case study setting may not exist
        });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete project" }, { status: 500 });
  }
}
