import { getPublishedPostBySlug } from "@/lib/postEditorial";
import { renderSocialCard } from "@/lib/v2/socialCard";
import { postSocialPreview } from "@/lib/v2/socialPreview";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPublishedPostBySlug(slug);
  if (!post) return new Response(null, { status: 404 });
  return renderSocialCard(postSocialPreview(post));
}
