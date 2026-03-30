"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const HIDDEN_PATHS = ["/login", "/signup", "/onboarding"];

const navItems = [
  {
    href: "/",
    label: "홈",
    icon: (active: boolean) => (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 3l9 7v11a1 1 0 01-1 1H4a1 1 0 01-1-1V10l9-7z" />
        <path d="M9 21v-8h6v8" />
      </svg>
    ),
  },
  {
    href: "/timetable",
    label: "시간표",
    icon: (active: boolean) => (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="4" width="18" height="18" rx="1" />
        <path d="M16 2v4M8 2v4M3 10h18" />
      </svg>
    ),
  },
  {
    href: "/chat",
    label: "채팅",
    icon: (active: boolean) => (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 21c5.523 0 10-3.582 10-8s-4.477-8-10-8S2 8.582 2 13c0 1.6.406 3.109 1.121 4.495L2 21l4.574-1.348A9.96 9.96 0 0012 21z" />
      </svg>
    ),
  },
  {
    href: "/schedule",
    label: "일정",
    icon: (active: boolean) => (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <rect x="3" y="4" width="18" height="18" rx="1" />
        <path d="M16 2v4M8 2v4M3 10h18" />
        <circle cx="9" cy="17" r="1" fill="currentColor" />
      </svg>
    ),
  },
  {
    href: "/map",
    label: "길찾기",
    icon: (active: boolean) => (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M12 2a7 7 0 110 14 7 7 0 010-14z" />
        <circle cx="12" cy="9" r="2" fill="currentColor" />
      </svg>
    ),
  },
];

export default function BottomNav() {
  const pathname = usePathname();
  if (HIDDEN_PATHS.includes(pathname)) return null;
  if (pathname.startsWith("/chat/")) return null; // 채팅방 내부는 네비 숨김

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-white border-t border-gray-200 z-50 ">
      <div className="flex">
        {navItems.map((item) => {
          const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center py-4 gap-2 text-xs font-semibold transition-colors ${
                active ? "text-primary-500" : "text-gray-400 hover:text-gray-600"
              }`}
            >
              {item.icon(active)}
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
