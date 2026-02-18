"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Home,
  CircleDot,
  FolderKanban,
  GitBranch,
  Users,
  Settings,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "ホーム", icon: Home },
  { href: "/balls", label: "マイボール", icon: CircleDot },
  { href: "/projects", label: "案件一覧", icon: FolderKanban },
  { href: "/pipelines", label: "パイプライン", icon: GitBranch },
  { href: "/team", label: "チーム", icon: Users },
  { href: "/settings", label: "設定", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-gray-200 h-screen sticky top-0">
      {/* Logo */}
      <div className="p-6 border-b border-gray-100">
        <Link href="/dashboard" className="flex items-center gap-3">
          <span className="text-3xl">⚾</span>
          <span className="text-xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
            キャッチボール
          </span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                isActive
                  ? "bg-gradient-to-r from-teal-50 to-cyan-50 text-teal-700 border border-teal-100"
                  : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
              )}
            >
              <Icon className={cn("w-5 h-5", isActive && "text-teal-500")} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
