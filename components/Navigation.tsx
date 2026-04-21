"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "SOW Form", icon: "📄" },
  { href: "/chat", label: "AI Chat", icon: "💬" },
  { href: "/upload", label: "Knowledge Base", icon: "📚" },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="bg-gray-900 text-white px-4 py-3 flex items-center justify-between shadow-lg">
      <div className="flex items-center gap-3">
        <span className="bg-red-600 text-white font-bold text-sm tracking-widest px-3 py-1 rounded-md">
          AIRTEL
        </span>
        <span className="text-gray-400 text-sm hidden sm:block">Icertis CLM Platform</span>
      </div>

      <div className="flex items-center gap-1">
        {links.map(({ href, label, icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              pathname === href
                ? "bg-red-600 text-white"
                : "text-gray-400 hover:text-white hover:bg-gray-800"
            }`}
          >
            <span>{icon}</span>
            <span className="hidden sm:inline">{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
