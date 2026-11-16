import { AliasTypewriter } from "@/components/AliasTypewriter";
import { FooterChuckles } from "@/components/FooterChuckles";
import { PublicLink } from "@/components/PublicTransition";
import { TypewriterText } from "@/components/TypewriterText";

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
            href="/v1"
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
          {deployedRevision ? <a href={`https://github.com/xdkaine/portfolio-landing/commit/${deployedRevision}`} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-xs text-ash underline decoration-iron underline-offset-4 hover:text-ember">Commit {deployedRevision.slice(0, 8)}</a> : null}
          <div className="mt-4 flex items-center gap-4 text-[10px] tracking-[0.2em]">
            <PublicLink
              href="/v1/privacy"
              intent="utility"
              className="text-ash hover:text-ember transition-colors"
            >
              PRIVACY
            </PublicLink>
            <PublicLink
              href="/v1/terms"
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

      <div className="mt-12 pt-8 border-t border-iron">
        <FooterChuckles gifUrl={chucklesGifUrl} />
      </div>
    </footer>
  );
}
