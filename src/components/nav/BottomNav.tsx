// components/BottomNav.js
import Link from "next/link";
import { useRouter } from "next/router";

const navItems = [
  { label: "Home", href: "/dashboard" },
  { label: "Tasks", href: "/tasks" },
  { label: "Exams", href: "/exams" },
  { label: "Math", href: "/math" },
  { label: "Settings", href: "/settings" },
];

export default function BottomNav() {
  const router = useRouter();

  return (
    <nav className="navbar">
      {navItems.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          className={`nav-link ${
            router.pathname === item.href ? "active" : ""
          }`}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
