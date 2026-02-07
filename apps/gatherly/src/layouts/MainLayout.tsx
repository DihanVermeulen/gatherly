import { Outlet } from "react-router";
import { Header } from "components";
import { useState } from "react";

export const MainLayout = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="bg-background-light dark:bg-background-dark transition-colors duration-300">
      <div className="min-h-screen max-w-7xl mx-auto">
        <Header
          currentView={""}
          setCurrentView={() => {}}
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
        />
        <main className="p-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
