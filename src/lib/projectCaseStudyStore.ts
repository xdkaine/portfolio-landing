import "server-only";

import {
  normalizeProjectCaseStudyInput,
  parseProjectCaseStudy,
  projectCaseStudySettingKey,
  serializeProjectCaseStudy,
  type ProjectCaseStudyContent,
} from "@/lib/projectCaseStudy";
import { prisma } from "@/lib/prisma";

export const PROJECT_CASE_STUDY_KEY_PREFIX = "project_case_";

export async function listProjectCaseStudiesByNumber(
  projectNumbers: string[],
): Promise<Map<string, ProjectCaseStudyContent | null>> {
  if (projectNumbers.length === 0) {
    return new Map();
  }

  const settings = await prisma.siteSetting.findMany({
    where: {
      key: {
        in: projectNumbers.map((number) => projectCaseStudySettingKey(number)),
      },
    },
    select: { key: true, value: true },
  });

  return new Map(
    settings.map((setting) => [
      setting.key.slice(PROJECT_CASE_STUDY_KEY_PREFIX.length),
      parseProjectCaseStudy(setting.value),
    ]),
  );
}

export async function getProjectCaseStudy(projectNumber: string) {
  const setting = await prisma.siteSetting.findUnique({
    where: { key: projectCaseStudySettingKey(projectNumber) },
    select: { value: true },
  });

  return parseProjectCaseStudy(setting?.value);
}

export async function saveProjectCaseStudy(
  projectNumber: string,
  input: unknown,
): Promise<ProjectCaseStudyContent | null> {
  const normalized = normalizeProjectCaseStudyInput(input);
  const key = projectCaseStudySettingKey(projectNumber);

  if (!normalized) {
    await prisma.siteSetting.delete({ where: { key } }).catch(() => {
      // The caller asked to clear content; missing content is already cleared.
    });
    return null;
  }

  await prisma.siteSetting.upsert({
    where: { key },
    update: { value: serializeProjectCaseStudy(normalized) },
    create: { key, value: serializeProjectCaseStudy(normalized) },
  });

  return normalized;
}

export async function moveProjectCaseStudy(
  oldProjectNumber: string,
  newProjectNumber: string,
): Promise<void> {
  const oldKey = projectCaseStudySettingKey(oldProjectNumber);
  const newKey = projectCaseStudySettingKey(newProjectNumber);
  if (oldKey === newKey) return;

  const previousCaseStudy = await prisma.siteSetting.findUnique({
    where: { key: oldKey },
    select: { value: true },
  });

  if (previousCaseStudy?.value) {
    await prisma.siteSetting.upsert({
      where: { key: newKey },
      update: { value: previousCaseStudy.value },
      create: { key: newKey, value: previousCaseStudy.value },
    });
  }

  await prisma.siteSetting.delete({ where: { key: oldKey } }).catch(() => {
    // Missing old content is already moved from the caller's perspective.
  });
}

export async function deleteProjectCaseStudy(projectNumber: string): Promise<void> {
  await prisma.siteSetting
    .delete({ where: { key: projectCaseStudySettingKey(projectNumber) } })
    .catch(() => {
      // Missing content is already deleted from the caller's perspective.
    });
}
