export default function SsoLoginForm({ failed, approvedAdminEnabled = false }: { failed: boolean; approvedAdminEnabled?: boolean }) {
  return (
    <section className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="border-2 border-iron p-8 md:p-12">
          <div className="flex items-center gap-2 mb-8">
            <span className="text-[10px] tracking-[0.3em] text-steel">$ sudo auth --sso</span>
            <span className="cursor-blink text-ember text-xs" aria-hidden="true">&#9608;</span>
          </div>
          <h1 className="font-display text-4xl md:text-5xl mb-6">ACCESS</h1>
          <p className="text-ash text-sm leading-relaxed mb-8">
            Sign in with your auth.edge account to manage this portfolio.
          </p>
          {failed ? (
            <p role="alert" className="border border-ember/40 text-bone text-xs leading-relaxed px-4 py-3 mb-6">
              Sign-in could not be completed. Use an approved administrator account with current MFA verification and try again.
            </p>
          ) : null}
          <a href="/v1/api/auth/oidc/start" className="block text-center border-2 border-bone hover:border-ember hover:bg-ember text-bone hover:text-void px-6 py-4 text-xs tracking-[0.15em] transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ember">
            CONTINUE WITH AUTH.EDGE &rarr;
          </a>
          {approvedAdminEnabled ? <a href="/v1/test-access" className="block mt-6 text-center text-bone text-xs underline">REQUEST OWNER-APPROVED ADMIN TEST ACCESS</a> : null}
          <a href="/v1" className="block mt-6 text-center text-steel text-xs hover:text-bone">&larr; BACK TO PORTFOLIO</a>
        </div>
        <p className="text-steel text-[10px] tracking-[0.2em] mt-6 text-center">AUTHORIZED ADMINISTRATORS ONLY</p>
      </div>
    </section>
  );
}
