"use client";

import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User, Building2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { MobileNav } from "./MobileNav";

export function Header() {
  const { user, member, company, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  const initials = member?.displayName
    ? member.displayName.slice(0, 2)
    : user?.displayName?.slice(0, 2) || "?";

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200">
      <div className="flex items-center justify-between h-16 px-4 lg:px-8">
        {/* Mobile nav */}
        <MobileNav />

        {/* Company name */}
        <div className="hidden lg:flex items-center gap-2 text-gray-600">
          <Building2 className="w-4 h-4" />
          <span className="text-sm font-medium">{company?.name || "未設定"}</span>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-blue-100 text-blue-600 font-bold text-sm">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end">
              <div className="px-3 py-2">
                <p className="font-medium">{member?.displayName || user?.displayName}</p>
                <p className="text-xs text-gray-500">{member?.jobTitle || ""}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push("/settings")}>
                <User className="w-4 h-4 mr-2" />
                設定
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-red-500">
                <LogOut className="w-4 h-4 mr-2" />
                ログアウト
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
