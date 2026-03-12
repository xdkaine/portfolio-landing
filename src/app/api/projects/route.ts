import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/auth";
import {
  normalizeProjectCaseStudyInput,
  parseProjectCaseStudy,
  projectCaseStudySettingKey,
  serializeProjectCaseStudy,
} from "@/lib/projectCaseStudy";

// Public: list all projects
export async function GET() {
  try {
    const [projects, caseStudySettings] = await Promise.all([
      prisma.project.findMany({
        orderBy: { sortOrder: "asc" },
      }),
      prisma.siteSetting.findMany({
        where: { key: { startsWith: "project_case_" } },
        select: { key: true, value: true },
      }),
    ]);

    const caseStudyMap = new Map(
      caseStudySettings.map((setting) => [
        setting.key,
        parseProjectCaseStudy(setting.value),
      ]),
    );

    // Map DB status enum to display string
    const mapped = projects.map((p) => ({
      ...p,
      status: p.status === "IN_PROGRESS" ? "IN PROGRESS" : p.status,
      caseStudy: caseStudyMap.get(projectCaseStudySettingKey(p.number)) ?? null,
    }));

    return NextResponse.json(mapped);
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 }
    );
  }
}

// Protected: create a project
export async function POST(request: Request) {
  try {
    const session = await verifySession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      number,
      title,
      description,
      tags,
      year,
      url,
      github,
      status,
      featured,
      sortOrder,
      caseStudy,
    } = body;

    if (!number || !title || !description) {
      return NextResponse.json(
        { error: "number, title, and description are required" },
        { status: 400 }
      );
    }

    const project = await prisma.project.create({
      data: {
        number,
        title,
        description,
        tags: tags || [],
        year: year || new Date().getFullYear().toString(),
        url,
        github,
        status: status === "IN PROGRESS" ? "IN_PROGRESS" : (status || "LIVE"),
        featured: featured ?? false,
        sortOrder: sortOrder ?? 0,
      },
    });

    const normalizedCaseStudy = normalizeProjectCaseStudyInput(caseStudy);
    if (normalizedCaseStudy) {
      await prisma.siteSetting.upsert({
        where: { key: projectCaseStudySettingKey(project.number) },
        update: { value: serializeProjectCaseStudy(normalizedCaseStudy) },
        create: {
          key: projectCaseStudySettingKey(project.number),
          value: serializeProjectCaseStudy(normalizedCaseStudy),
        },
      });
    }

    return NextResponse.json(
      {
        ...project,
        status: project.status === "IN_PROGRESS" ? "IN PROGRESS" : project.status,
        caseStudy: normalizedCaseStudy,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("[api/projects] POST error:", error);
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    );
  }
}
