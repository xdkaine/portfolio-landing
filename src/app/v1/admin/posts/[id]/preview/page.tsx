import "@/app/v2/v2.css";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PostArticle } from "@/components/v2/blog/PostArticle";
import { verifySession } from "@/lib/auth";
import { getAdminPostById } from "@/lib/postEditorial";
import { PRIVATE_ROUTE_ROBOTS } from "@/lib/siteMetadata";
import { getSiteSettings } from "@/lib/siteSettings";

export const metadata: Metadata = {
  title: "Private Blog Post Preview",
  robots: PRIVATE_ROUTE_ROBOTS,
};

export default async function PreviewPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await verifySession();
  if (!session || session.role !== "ADMIN") redirect("/v1/login");

  const { id } = await params;
  const [post, settings] = await Promise.all([getAdminPostById(id), getSiteSettings()]);
  if (!post) notFound();

  return <div data-portfolio-v2><PostArticle post={post} siteName={settings.siteName} preview /></div>;
}
