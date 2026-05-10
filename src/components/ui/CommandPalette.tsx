"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "cmdk";

import {
  Home,
  Brain,
  CheckSquare,
  Timer,
  LayoutDashboard,
  BookOpen,
  Search,
  LucideIcon,
} from "lucide-react";

type CommandItemType = {
  name: string;
  href?: string;
  icon: LucideIcon;
  description?: string;
  action?: () => void;
};

export default function CommandPalette() {
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // detect mobile safely
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Ctrl + K + ESC
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }

      if (e.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const commands: CommandItemType[] = [
    {
      name: "Home",
      href: "/",
      icon: Home,
      description: "Go to dashboard",
    },
    {
      name: "Start Focus Session",
      icon: Timer,
      description: "Enter distraction-free study mode",
      action: () => router.push("/focus?autoStart=true"),
    },
    {
      name: "Create Task",
      icon: CheckSquare,
      description: "Quick add a new study task",
      action: () => router.push("/tasks?create=true"),
    },
    {
      name: "Open Learn Hub",
      href: "/learn",
      icon: Brain,
      description: "AI learning assistant",
    },
    {
      name: "Generate Revision Plan",
      icon: BookOpen,
      description: "AI builds your study schedule",
      action: () => router.push("/learn?mode=revision"),
    },
    {
      name: "Open Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      description: "Your study overview",
    },
  ];

  const run = (cmd: CommandItemType) => {
    setOpen(false);

    if (cmd.action) {
      cmd.action();
      return;
    }

    if (cmd.href) {
      router.push(cmd.href);
    }
  };

  return (
    <>
      {/* MOBILE FLOATING BUTTON */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          style={{
            position: "fixed",
            right: 18,
            bottom: 90,
            width: 58,
            height: 58,
            borderRadius: "999px",
            border: "1px solid rgba(99,102,241,0.25)",
            background: "rgba(99,102,241,0.18)",
            backdropFilter: "blur(18px)",
            display: isMobile ? "flex" : "none",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            zIndex: 1500,
            boxShadow: "0 10px 30px rgba(99,102,241,0.3)",
          }}
        >
          <Search size={22} />
        </button>
      )}

      {/* OVERLAY */}
      {open && (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.55)",
              backdropFilter: "blur(10px)",
              zIndex: 2000,
            }}
          />

          {/* MODAL */}
          <div
            style={{
              position: "fixed",
              top: isMobile ? "10%" : "14%",
              left: "50%",
              transform: "translateX(-50%)",
              width: "min(680px, 92vw)",
              zIndex: 2001,
              borderRadius: 24,
              overflow: "hidden",
              border: "1px solid rgba(99,102,241,0.15)",
              background: "rgba(10,10,16,0.96)",
              backdropFilter: "blur(30px)",
              boxShadow: "0 30px 80px rgba(0,0,0,0.5)",
            }}
          >
            <Command>
              <CommandInput
                placeholder="Search actions, pages, study tools..."
                style={{
                  width: "100%",
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  color: "white",
                  padding: "18px",
                  fontSize: 15,
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                }}
              />

              <CommandList
                style={{
                  maxHeight: 420,
                  overflowY: "auto",
                  padding: 10,
                }}
              >
                <CommandEmpty
                  style={{
                    padding: 20,
                    textAlign: "center",
                    color: "rgba(255,255,255,0.5)",
                  }}
                >
                  No results found.
                </CommandEmpty>

                <CommandGroup heading="Study Commands">
                  {commands.map((cmd) => {
                    const Icon = cmd.icon;

                    return (
                      <CommandItem
                        key={cmd.name}
                        value={cmd.name}
                        onSelect={() => run(cmd)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          padding: 14,
                          borderRadius: 14,
                          cursor: "pointer",
                          color: "white",
                          marginBottom: 6,
                        }}
                      >
                        <div
                          style={{
                            width: 38,
                            height: 38,
                            borderRadius: 12,
                            background: "rgba(99,102,241,0.12)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <Icon size={18} />
                        </div>

                        <div>
                          <div style={{ fontWeight: 700 }}>
                            {cmd.name}
                          </div>
                          <div style={{ fontSize: 12, opacity: 0.6 }}>
                            {cmd.description}
                          </div>
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </div>
        </>
      )}
    </>
  );
}
