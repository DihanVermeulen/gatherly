import React from "react";

import { useNavigate, useLocation } from "react-router";
import { LogOut, Menu, User as UserIcon, X } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

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
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

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
      <div className="mx-auto px-6 py-4">
        <div className="flex justify-between items-center">
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => navigate("/home")}
          >
            <img src="/Logo.png" alt="" style={{ height: "40px" }} />
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex gap-2 items-center">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.route)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                  isActive(item.route)
                    ? "bg-primary-0 text-on-primary-0 shadow-lg shadow-primary/20"
                    : "text-typography-0 dark:text-typography-dark hover:bg-slate-50 dark:hover:bg-slate-800"
                }`}
              >
                {item.label}
              </button>
            ))}

            {/* Auth Section */}
            {user ? (
              <div className="flex items-center gap-2 ml-2 pl-2 border-l border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-xl">
                  <UserIcon className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {user.name}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="px-3 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center gap-2"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => navigate("/login")}
                className="ml-2 pl-2 border-l border-slate-200 dark:border-slate-700 px-4 py-2 rounded-xl text-sm font-bold text-primary hover:bg-primary/10 transition-all"
              >
                Login
              </button>
            )}
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden size-10 flex items-center justify-center bg-slate-50 dark:bg-slate-800 rounded-full text-slate-600 dark:text-slate-400"
          >
            <span className="">{isMobileMenuOpen ? <X /> : <Menu />}</span>
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

            {/* Mobile Auth Section */}
            {user ? (
              <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <div className="px-4 py-3 bg-slate-50 dark:bg-slate-800 rounded-xl flex items-center gap-2">
                  <UserIcon className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    {user.name}
                  </span>
                </div>
                <button
                  onClick={() => {
                    handleLogout();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  navigate("/login");
                  setIsMobileMenuOpen(false);
                }}
                className="w-full text-left px-4 py-3 rounded-xl text-sm font-bold text-primary hover:bg-primary/10 transition-all"
              >
                Login
              </button>
            )}
          </nav>
        )}
      </div>
    </header>
  );
};
