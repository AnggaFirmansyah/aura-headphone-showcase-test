"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  ["/", "overview"],
  ["/specs", "specs"],
  ["/story", "story"],
];

export default function Nav() {
  const path = usePathname();
  return (
    <header className="rv fixed inset-x-0 top-0 z-30 flex items-center justify-between px-6 py-5 sm:px-10">
      <Link href="/" className="text-lg font-extrabold tracking-tight">
        AURA<span className="text-gold">.</span>
      </Link>
      <nav className="flex items-center gap-5 font-mono text-[11px]" aria-label="Pages">
        {LINKS.map(([href, label]) => (
          <Link
            key={href}
            href={href}
            aria-current={path === href ? "page" : undefined}
            className={`transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ${
              path === href ? "text-ink" : "text-dim hover:text-ink"
            }`}
          >
            {label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
