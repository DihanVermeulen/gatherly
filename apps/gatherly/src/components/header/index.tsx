import React from "react";

import { useNavigate, useLocation } from "react-router";
import { Menu } from "lucide-react";

const navItems = [
  { id: "home", label: "Home", emoji: "🏠", route: "/home" },
  { id: "events", label: "Events", emoji: "🎄", route: "/events" },
  { id: "decipher", label: "Decipher Code", emoji: "🔐", route: "/decipher" },
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
    <header className="bg-white border-b border-red-100 mb-8">
      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold text-red-800 mb-1">Gatherly</h1>
            <p className="text-gray-500 text-sm">
              Organize and manage your events
            </p>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex gap-4 items-center">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.route)}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  isActive(item.route)
                    ? "bg-red-600 text-white"
                    : "text-gray-600 hover:bg-red-50"
                }`}
              >
                {item.emoji} {item.label}
              </button>
            ))}
          </nav>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden text-gray-600 hover:text-gray-800"
          >
            <Menu size={24} />
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <nav className="md:hidden mt-4 pt-4 border-t border-red-100 space-y-2">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.route)}
                className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                  isActive(item.route)
                    ? "bg-red-600 text-white"
                    : "text-gray-600 hover:bg-red-50"
                }`}
              >
                {item.emoji} {item.label}
              </button>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
};
