import { AliasTypewriter } from "@/components/v2/AliasTypewriter";
import { FooterChuckles } from "@/components/v2/FooterChuckles";
import { PublicLink } from "@/components/v2/PublicTransition";
import { TypewriterText } from "@/components/v2/TypewriterText";

const DEFAULT_SOCIALS = [
  { label: "GITHUB", href: "https://github.com/xdkaine" },
  { label: "TWITTER", href: "https://x.com/xdkaine" },
  { label: "LINKEDIN", href: "https://linkedin.com/in/thomasphao" },
];

interface FooterProps {
  brandName?: string;
  brandAliases?: string[];
  socials?: { label: string; href: string }[];
  chucklesGifUrl?: string;
}

export function Footer({
  brandName = "Kaine",
  brandAliases = [],
  socials = DEFAULT_SOCIALS,
  chucklesGifUrl,
}: FooterProps) {
  const revision = process.env.APP_REVISION?.trim();
  const deployedRevision = revision && /^[0-9a-f]{40}$/i.test(revision) ? revision : null;

  return (
    <footer className="border-t-2 border-iron px-6 md:px-12 lg:px-24 py-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
        <div>
          <PublicLink
            href="/v2"
            intent="section"
            className="font-display text-xl tracking-widest text-bone hover:text-ember transition-colors"
          >
            {brandAliases.length > 1 ? (
              <AliasTypewriter
                aliases={brandAliases}
                cursorClassName="text-xs"
              />
            ) : (
              <TypewriterText
                text={brandName}
                typingSpeed={60}
                startDelay={180}
                cursorClassName="text-xs"
              />
            )}
          </PublicLink>
          <div className="mt-4 flex items-center gap-4 text-[10px] tracking-[0.2em]">
            <PublicLink
              href="/v2/privacy"
              intent="utility"
              className="text-ash hover:text-ember transition-colors"
            >
              PRIVACY
            </PublicLink>
            <PublicLink
              href="/v2/terms"
              intent="utility"
              className="text-ash hover:text-ember transition-colors"
            >
              TERMS
            </PublicLink>
          </div>
        </div>

        <div className="flex gap-6">
          {socials.map((social) => (
            <a
              key={social.label}
              href={social.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[10px] tracking-[0.2em] text-ash hover:text-ember transition-colors duration-300"
            >
              {social.label}
            </a>
          ))}
        </div>
      </div>

      <div className="mt-12 flex flex-wrap items-center gap-x-5 gap-y-4 border-t border-iron pt-8">
        <FooterChuckles gifUrl={chucklesGifUrl} />
        {deployedRevision ? (
          <a href={`https://github.com/xdkaine/portfolio-landing/commit/${deployedRevision}`} target="_blank" rel="noopener noreferrer" aria-label={`View build ${deployedRevision.slice(0, 8)} on GitHub`} className="group inline-flex min-h-8 items-center gap-2 text-xs text-ash transition-colors hover:text-bone" data-build-link>
            <span aria-hidden="true" className="text-xs leading-none text-ember">●</span>
            <strong className="font-semibold">Build <span className="underline decoration-iron underline-offset-4 group-hover:decoration-ember">{deployedRevision.slice(0, 8)}</span></strong>
          </a>
        ) : null}
      </div>
    </footer>
  );
}
