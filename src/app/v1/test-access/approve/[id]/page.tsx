import { notFound, redirect } from "next/navigation";
import { adminOidcConfig } from "@/lib/oidcConfig";
import { prisma } from "@/lib/prisma";
import { TEST_ACCESS_SCOPE, isGrantId } from "@/lib/testAccessPolicy";
import { isRequestingBrowser, testAccessEnabled, verifiedApprovalOwner } from "@/lib/testAccess";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!testAccessEnabled()) notFound();
  const { id } = await params;
  if (!isGrantId(id)) notFound();
  if (await isRequestingBrowser(id)) return (
    <section className="mx-auto max-w-2xl px-6 py-24 text-bone">
      <h1 className="text-4xl">Approve on another device or browser</h1>
      <p className="mt-6 text-ash">This is the browser requesting admin access. Open the approval link on your phone or in a different browser, sign in through auth.edge there, and compare the request code before approving.</p>
      <a href="/v1/test-access" className="mt-6 inline-block text-bone underline">Return to the requesting browser</a>
    </section>
  );
  const owner = await verifiedApprovalOwner(id);
  if (!owner) redirect(`/v1/api/auth/oidc/start?approval=${id}`);
  const grant = await prisma.testAccessGrant.findUnique({ where: { id } });
  if (!grant || grant.scope !== TEST_ACCESS_SCOPE) notFound();
  const pending = grant.state === "PENDING" && grant.expiresAt > new Date();
  const active =
    grant.state === "APPROVED" &&
    grant.sessionExpiresAt &&
    grant.sessionExpiresAt > new Date();
  return (
    <section className="mx-auto max-w-2xl px-6 py-24 text-bone">
      <p className="text-xs tracking-widest text-ember">
        {new URL(adminOidcConfig().origin).hostname}
      </p>
      <h1 className="mt-4 text-4xl">Approve actual admin access</h1>
      <p className="mt-6 text-ash">
        Only approve if you requested this test and the code matches the
        agent&apos;s request:
      </p>
      <p className="my-6 font-mono text-3xl tracking-widest">
        {grant.displayCode}
      </p>
      <p className="text-ash">
        Permission: full access to this portfolio&apos;s real admin dashboard for up
        to ten minutes. The requesting browser can view private settings and
        messages, and create, edit or delete portfolio content with your admin
        permissions. Only approve a test you requested. You can revoke it here
        at any time; expiry also ends access.
      </p>
      <p className="mt-4 text-ash">
        Status:{" "}
        {pending
          ? "Waiting for your decision"
          : active
            ? "Approved"
            : grant.state.toLowerCase()}
        .
      </p>
      {active ? (
        <a className="mt-6 inline-block text-ember underline" href="/v1/admin">
          Open your owner admin dashboard
        </a>
      ) : null}
      <form
        method="post"
        action={`/v1/api/auth/test-access/${id}/decision`}
        className="mt-8 flex flex-wrap gap-4"
      >
        {pending ? (
          <>
            <button
              className="border border-ember bg-ember px-5 py-3 text-void"
              name="decision"
              value="approve"
            >
              Approve this short session
            </button>
            <button
              className="border border-steel px-5 py-3"
              name="decision"
              value="deny"
            >
              Deny
            </button>
          </>
        ) : null}
        {active ? (
          <button
            className="border border-steel px-5 py-3"
            name="decision"
            value="revoke"
          >
            Revoke session
          </button>
        ) : null}
      </form>
    </section>
  );
}
