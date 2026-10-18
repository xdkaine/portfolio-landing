"use client";
import { useState } from "react";
interface ApprovalRequest {
  id: string;
  displayCode: string;
  expiresAt: string;
  approvalUrl: string;
}
export default function TestAccessRequest() {
  const [request, setRequest] = useState<ApprovalRequest | null>(null),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  async function act(action: "create" | "check") {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(
        action === "create"
          ? "/v1/api/auth/test-access/request"
          : `/v1/api/auth/test-access/${request!.id}/complete`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        },
      );
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 410) setRequest(null);
        throw Error(data.error || "Request unavailable");
      }
      if (action === "create") setRequest(data);
      else if (response.status === 202)
        setMessage("Waiting for your approval.");
      else window.location.replace("/v1/admin");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Request unavailable",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="mx-auto max-w-2xl px-6 py-24 text-bone">
      <p className="text-xs tracking-widest text-ember">
        OWNER-APPROVED ADMIN ACCESS
      </p>
      <h1 className="mt-4 text-4xl">Open the actual admin</h1>
      <p className="mt-6 text-ash">
        Request a session in the real admin dashboard for up to ten minutes.
        The owner signs in through auth.edge on their own device, compares the
        code, and explicitly approves this browser.
      </p>
      <p className="mt-4 text-ash">
        This grants full CMS permissions, including private settings, messages,
        and content edits. It expires automatically and the owner can revoke it.
        Passwords, passkeys and authenticator codes stay on the owner&apos;s device.
      </p>
      {!request ? (
        <button
          disabled={busy}
          className="mt-8 border border-ember bg-ember px-5 py-3 text-void disabled:opacity-50"
          onClick={() => act("create")}
        >
          Create approval request
        </button>
      ) : (
        <div className="mt-8 border border-steel p-6">
          <p className="text-ash">
            Compare this code on the owner&apos;s approval screen:
          </p>
          <p className="my-4 font-mono text-3xl tracking-widest">
            {request.displayCode}
          </p>
          <p className="break-all">
            <a
              className="text-ember underline"
              href={request.approvalUrl}
              target="_blank"
              rel="noreferrer"
            >
              {request.approvalUrl}
            </a>
          </p>
          <p className="mt-3 text-ash">
            Open the link on your own device. The request expires at{" "}
            {new Date(request.expiresAt).toLocaleTimeString()}.
          </p>
          <button
            disabled={busy}
            className="mt-6 border border-steel px-5 py-3 disabled:opacity-50"
            onClick={() => act("check")}
          >
            Check approval
          </button>
        </div>
      )}
      <p className="mt-6 text-ash" role="status">
        {busy ? "Checking…" : message}
      </p>
    </section>
  );
}
