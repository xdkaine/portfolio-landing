import Link from "next/link";
import { AliasTypewriter } from "@/components/AliasTypewriter";
import { TypewriterText } from "@/components/TypewriterText";

const DEFAULT_SOCIALS = [
  { label: "GITHUB", href: "https://github.com/xtomm" },
  { label: "TWITTER", href: "https://x.com/xtomm" },
  { label: "LINKEDIN", href: "https://linkedin.com/in/xtomm" },
];

interface FooterProps {
  brandName?: string;
  brandAliases?: string[];
  socials?: { label: string; href: string }[];
  legalEffectiveDate?: string;
}

export function Footer({
  brandName = "Kaine",
  brandAliases = [],
  socials = DEFAULT_SOCIALS,
  legalEffectiveDate,
}: FooterProps) {
  const legalDateText = legalEffectiveDate ? ` - UPDATED ${legalEffectiveDate}` : "";
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t-2 border-iron px-6 md:px-12 lg:px-24 py-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
        <div>
          <Link
            href="/"
            className="font-display text-xl tracking-widest text-bone hover:text-ember transition-colors"
          >
            {brandAliases.length > 1 ? (
              <AliasTypewriter
                aliases={brandAliases}
                typingSpeed={68}
                deletingSpeed={44}
                pauseMs={1000}
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
          </Link>
          <p className="text-ash text-[10px] mt-2 tracking-[0.2em] uppercase">
            &copy; {currentYear} &mdash; ALL RIGHTS RESERVED{legalDateText}
          </p>
          <div className="mt-4 flex items-center gap-4 text-[10px] tracking-[0.2em]">
            <Link
              href="/privacy"
              className="text-ash hover:text-ember transition-colors"
            >
              PRIVACY
            </Link>
            <Link
              href="/terms"
              className="text-ash hover:text-ember transition-colors"
            >
              TERMS
            </Link>
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
        <p className="text-[10px] text-steel tracking-[0.3em] uppercase">
          BUILT WITH OBSESSIVE ATTENTION TO DETAIL
        </p>
      </div>
    </footer>
  );
}
