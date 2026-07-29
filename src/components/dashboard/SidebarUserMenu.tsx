"use client";

import Link from "next/link";
import { useId } from "react";
import { ChevronsUpDown, LogOut, User } from "lucide-react";

import { signOutAction } from "@/actions/auth";
import { UserAvatar } from "@/components/user/UserAvatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import type { CurrentUser } from "@/types/users";

interface SidebarUserMenuProps {
  user: CurrentUser;
}

export function SidebarUserMenu({ user }: SidebarUserMenuProps) {
  // `||` not `??` — an empty GitHub display name should fall through to email
  const displayName = user.name || user.email;
  const signOutFormId = useId();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        {/* Lives outside the menu so closing the dropdown can't unmount the
            form mid-submit; the button below associates via form= */}
        <form id={signOutFormId} action={signOutAction} className="hidden" />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg" tooltip={displayName}>
              <UserAvatar user={user} />
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{displayName}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {user.email}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          {/* Opens upward — the trigger sits at the bottom of the sidebar */}
          <DropdownMenuContent
            side="top"
            align="start"
            sideOffset={8}
            className="w-56"
          >
            <DropdownMenuLabel className="flex items-center gap-2 font-normal">
              <UserAvatar user={user} />
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{displayName}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {user.email}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profile">
                <User />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {/* Server action: signOut clears the JWT cookie, then redirects */}
            <DropdownMenuItem asChild>
              <button type="submit" form={signOutFormId} className="w-full">
                <LogOut />
                Sign out
              </button>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
