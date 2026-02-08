import { Link, useMatchRoute } from "@tanstack/react-router";
import { Brain, Home, Settings, Zap } from "lucide-react";
import { cn } from "@/lib/cn";

const navItems = [
  { to: "/" as const, label: "Dashboard", icon: Home },
  { to: "/memories" as const, label: "Memories", icon: Brain },
  { to: "/autofill" as const, label: "Autofill", icon: Zap },
  { to: "/settings" as const, label: "Settings", icon: Settings },
];

export default function NavigationMenu() {
  const matchRoute = useMatchRoute();

  return (
    <nav className="flex h-full flex-col gap-4 p-4 text-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Superfill.ai
      </div>
      <div className="space-y-1">
        {navItems.map(({ to, label, icon: Icon }) => {
          const isActive = Boolean(matchRoute({ to, fuzzy: to !== "/" }));
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition hover:bg-accent hover:text-accent-foreground",
                isActive && "bg-accent text-accent-foreground",
              )}
            >
              <Icon className="h-4 w-4" aria-hidden />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
