import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard, Receipt, Target, Layers, Settings, LogOut, ChevronLeft, ChevronRight, Command, Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-data";
import { CommandPalette } from "./command-palette";
import { TransactionDrawer } from "./transaction-drawer";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/transactions", label: "Transactions", icon: Receipt },
  { to: "/budgets", label: "Budgets", icon: Target },
  { to: "/manage", label: "Categories & Accounts", icon: Layers },
  { to: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [txOpen, setTxOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { data: profile } = useProfile(user?.id);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [user, loading, navigate]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCmdOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="font-mono text-xs text-muted-foreground">Initializing…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 64 : 240 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="border-r border-border bg-sidebar hidden md:flex flex-col sticky top-0 h-screen"
      >
        <div className="h-14 flex items-center px-4 border-b border-border">
          <div className="h-7 w-7 rounded-md bg-gradient-to-br from-emerald-500 to-violet-500 flex items-center justify-center">
            <span className="font-mono text-[10px] font-bold text-black">AU</span>
          </div>
          {!collapsed && (
            <div className="ml-2.5">
              <div className="text-xs font-semibold tracking-wide">AURA</div>
              <div className="text-[10px] text-muted-foreground font-mono">SOVEREIGN</div>
            </div>
          )}
          <button onClick={() => setCollapsed(c => !c)} className="ml-auto text-muted-foreground hover:text-foreground">
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        <nav className="flex-1 py-3 px-2 space-y-0.5">
          {NAV.map((n) => {
            const active = location.pathname === n.to;
            const Icon = n.icon;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs transition-colors",
                  active
                    ? "bg-sidebar-accent text-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
                )}
              >
                <Icon size={14} className={active ? "text-emerald-400" : ""} />
                {!collapsed && <span>{n.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="p-2 border-t border-border">
          <button
            onClick={async () => { await supabase.auth.signOut(); navigate({ to: "/auth" }); }}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
          >
            <LogOut size={14} />
            {!collapsed && <span>Sign out</span>}
          </button>
        </div>
      </motion.aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar onCmd={() => setCmdOpen(true)} onAdd={() => setTxOpen(true)} userName={profile?.display_name ?? user.email ?? ""} />
        <main className="flex-1 p-4 md:p-6">{children}</main>

        {/* Mobile tab bar */}
        <nav className="md:hidden border-t border-border bg-sidebar sticky bottom-0 flex">
          {NAV.slice(0, 4).map((n) => {
            const active = location.pathname === n.to;
            const Icon = n.icon;
            return (
              <Link key={n.to} to={n.to} className={cn("flex-1 flex flex-col items-center py-2 text-[10px]", active ? "text-emerald-400" : "text-muted-foreground")}>
                <Icon size={16} />
                <span className="mt-0.5">{n.label.split(" ")[0]}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <CommandPalette open={cmdOpen} onOpenChange={setCmdOpen} onAddTx={() => { setCmdOpen(false); setTxOpen(true); }} />
      <TransactionDrawer open={txOpen} onOpenChange={setTxOpen} userId={user.id} />
    </div>
  );
}

function TopBar({ onCmd, onAdd, userName }: { onCmd: () => void; onAdd: () => void; userName: string }) {
  return (
    <header className="h-14 border-b border-border bg-background/60 backdrop-blur sticky top-0 z-30 flex items-center px-4 md:px-6 gap-3">
      <button
        onClick={onCmd}
        className="flex items-center gap-2 px-3 h-8 rounded-md border border-border bg-card hover:border-white/20 text-xs text-muted-foreground transition-colors w-full max-w-md"
      >
        <Command size={12} />
        <span>Search transactions, jump anywhere…</span>
        <kbd className="ml-auto font-mono text-[10px] text-muted-foreground/70">⌘K</kbd>
      </button>

      <div className="ml-auto flex items-center gap-2">
        <Button size="sm" onClick={onAdd} className="h-8 gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-black">
          <Plus size={14} /> <span className="hidden sm:inline">Transaction</span>
        </Button>
        <div className="h-8 w-8 rounded-full bg-gradient-to-br from-violet-500 to-emerald-500 flex items-center justify-center font-mono text-[11px] text-black font-bold">
          {userName.charAt(0).toUpperCase()}
        </div>
      </div>
    </header>
  );
}
