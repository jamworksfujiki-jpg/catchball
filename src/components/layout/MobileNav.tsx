"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  Menu,
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

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="lg:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon">
            <Menu className="w-6 h-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <span className="text-3xl">⚾</span>
              <span className="text-xl font-bold text-gray-800">キャッチボール</span>
            </div>
          </div>
          <nav className="p-4 space-y-1">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl text-base font-medium transition-all",
                    isActive
                      ? "bg-blue-50 text-blue-600"
                      : "text-gray-600 hover:bg-gray-50"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </SheetContent>
      </Sheet>
    </div>
  );
}
