"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ListTodo, PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const nav = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Migrations", href: "/migrations", icon: ListTodo },
  { label: "New migration", href: "/migrations/new", icon: PlusCircle },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-56 flex-col border-r border-border bg-card">
      <div className="flex h-14 items-center border-b border-border px-4">
        <span className="font-semibold tracking-tight text-foreground">
          S6 → Catalyst
        </span>
      </div>
      <nav className="flex flex-1 flex-col gap-0.5 p-2">
        {nav.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href === "/migrations" && pathname.startsWith("/migrations/") && pathname !== "/migrations/new");
          return (
            <Button
              key={item.href}
              variant={isActive ? "secondary" : "ghost"}
              className={cn(
                "justify-start font-normal",
                isActive && "bg-muted text-foreground"
              )}
              asChild
            >
              <Link href={item.href}>
                <item.icon className="mr-2 h-4 w-4" />
                {item.label}
              </Link>
            </Button>
          );
        })}
      </nav>
      <Separator />
      <div className="p-2 text-xs text-muted-foreground">
        Migration console (mock)
      </div>
    </aside>
  );
}
