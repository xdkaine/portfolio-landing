import { notFound, redirect } from "next/navigation";
import { PostEditorStudio } from "@/components/PostEditorStudio";
import { verifySession } from "@/lib/auth";
import { getAdminPostById } from "@/lib/postEditorial";

export default async function EditPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await verifySession();
  if (!session || session.role !== "ADMIN") redirect("/login");

  const { id } = await params;
  const post = await getAdminPostById(id);
  if (!post) notFound();

  return <PostEditorStudio initialPost={post} />;
}
