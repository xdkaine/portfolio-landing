import { redirect } from "next/navigation";
export default async function LegacyArticle({ params }: { params: Promise<{ slug: string }> }) { const { slug } = await params; redirect(`/v2/blog/${encodeURIComponent(slug)}`); }
