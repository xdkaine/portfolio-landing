import { notFound, redirect } from "next/navigation";
import {
  approvedVerificationSession,
  testAccessEnabled,
} from "@/lib/testAccess";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";
export default async function Page() {
  if (!testAccessEnabled()) notFound();
  const session = await approvedVerificationSession();
  if (!session) redirect("/v1/test-access");
  const [projects, posts] = await Promise.all([
    prisma.project.count(),
    prisma.post.count({ where: { published: true, status: "PUBLISHED" } }),
  ]);
  return (
    <section className="mx-auto max-w-2xl px-6 py-24 text-bone">
      <p className="text-xs tracking-widest text-ember">APPROVED · READ ONLY</p>
      <h1 className="mt-4 text-4xl">Portfolio verification</h1>
      <p className="mt-6 text-ash">
        Owner approval and the live auth.edge MFA session are valid.
      </p>
      <dl className="mt-8 grid grid-cols-2 gap-4">
        <dt>Projects</dt>
        <dd>{projects}</dd>
        <dt>Published posts</dt>
        <dd>{posts}</dd>
        <dt>Session expires</dt>
        <dd>{session.expiresAt.toISOString()}</dd>
        <dt>Release</dt>
        <dd className="break-all">
          {process.env.APP_REVISION || "development"}
        </dd>
      </dl>
      <p className="mt-6 text-ash">
        CMS access, content edits, and contact messages remain unavailable to
        this session. Provider revocation or owner revocation ends access.
      </p>
      <form
        method="post"
        action="/v1/api/auth/test-access/logout"
        className="mt-8"
      >
        <button className="border border-steel px-5 py-3">
          End this test session
        </button>
      </form>
      <a className="mt-8 inline-block text-ember underline" href="/v1">
        Open public portfolio
      </a>
    </section>
  );
}
