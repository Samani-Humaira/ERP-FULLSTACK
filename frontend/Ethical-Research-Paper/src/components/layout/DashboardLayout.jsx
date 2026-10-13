import { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import TopNavbar from "./TopNavbar";

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[linear-gradient(145deg,#f8fafc_0%,#f5f7ff_48%,#f8fafc_100%)] transition-colors duration-200">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        <TopNavbar onMenuClick={() => setSidebarOpen(true)} />

        <main className="flex-1 overflow-auto px-4 py-5 sm:px-6 sm:py-7 xl:px-8 xl:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
