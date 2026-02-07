import React from "react";

import { useNavigate, useLocation } from "react-router";
import { Menu } from "lucide-react";

const navItems = [
  { id: "events", label: "Events", emoji: "", route: "/events" },
  { id: "decipher", label: "Decipher Code", emoji: "", route: "/decipher" },
];

export const Header: React.FC<{
  currentView: string;
  setCurrentView: (view: string) => void;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
}> = ({
  currentView,
  setCurrentView,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const currentPath = location.pathname || currentView;

  // Check if current path starts with the nav route (for nested routes like /events/edit/:id)
  const isActive = (route: string) => {
    if (route === "/home")
      return currentPath === "/home" || currentPath === "/";
    if (route === "/events") return currentPath.startsWith("/events");
    return currentPath === route;
  };

  const handleNavClick = (view: string) => {
    navigate(view);
    setCurrentView(view);
    setIsMobileMenuOpen(false);
  };

  return (
    <header className="bg-white dark:bg-background-dark border-b border-slate-100 dark:border-slate-800 mb-8 sticky top-0 z-40 backdrop-blur-md bg-white/80 dark:bg-background-dark/80">
      <div className="max-w-6xl mx-auto px-6 py-4">
        <div className="flex justify-between items-center">
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => navigate("/home")}
          >
            <span className="material-symbols-outlined text-primary font-bold text-3xl">
              card_giftcard
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white leading-none">
                Gatherly
              </h1>
              <p className="text-slate-500 text-[10px] font-medium uppercase tracking-wider opacity-70">
                Organize and manage your events
              </p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex gap-2 items-center">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.route)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                  isActive(item.route)
                    ? "bg-primary text-black shadow-lg shadow-primary/20"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden size-10 flex items-center justify-center bg-slate-50 dark:bg-slate-800 rounded-full text-slate-600 dark:text-slate-400"
          >
            <span className="material-symbols-outlined">
              {isMobileMenuOpen ? "close" : "menu"}
            </span>
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <nav className="md:hidden mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.route)}
                className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                  isActive(item.route)
                    ? "bg-primary text-black"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
};
