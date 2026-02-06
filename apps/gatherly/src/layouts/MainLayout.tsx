import { Outlet } from "react-router";
import { Header } from "components";
import { useState } from "react";

export const MainLayout = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="bg-gradient-to-br from-red-50 via-white to-green-50">
      <div className="min-h-screen max-w-6xl mx-auto p-6 pt-20">
        <div className="pt-20"></div>
        <div className="absolute top-0 left-0 right-0">
          <Header
            currentView={""}
            setCurrentView={() => {}}
            isMobileMenuOpen={isMobileMenuOpen}
            setIsMobileMenuOpen={setIsMobileMenuOpen}
          />
        </div>
        <main>
          <Outlet />
        </main>
      </div>
    </div>
  );
};
