import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PostArticle } from "@/components/blog/PostArticle";
import { verifySession } from "@/lib/auth";
import { getAdminPostById } from "@/lib/postEditorial";
import { getSiteSettings } from "@/lib/siteSettings";

export const metadata: Metadata = {
  title: "Private Transmission Preview",
  robots: { index: false, follow: false },
};

export default async function PreviewPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await verifySession();
  if (!session || session.role !== "ADMIN") redirect("/login");

  const { id } = await params;
  const [post, settings] = await Promise.all([getAdminPostById(id), getSiteSettings()]);
  if (!post) notFound();

  return <PostArticle post={post} siteName={settings.siteName} preview />;
}
