"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ModeToggle() {
  const { theme, setTheme } = useTheme();

  const isDark = theme === "dark";

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className="ml-auto"
      aria-label="Toggle light/dark mode"
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      <Sun
        className={cn(
          "h-4 w-4 transition-transform duration-150",
          isDark ? "scale-0" : "scale-100"
        )}
      />
      <Moon
        className={cn(
          "absolute h-4 w-4 transition-transform duration-150",
          isDark ? "scale-100" : "scale-0"
        )}
      />
    </Button>
  );
}

