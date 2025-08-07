import { FileText, FileImage, BarChart3, Building, Upload, ChevronLeft, ChevronRight } from "lucide-react";
import type { User } from "@shared/schema";

interface SidebarProps {
  user: User;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onClose: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const menuItems = [
  { id: "overview", label: "Analytics & Overview", icon: BarChart3 },
  { id: "documents", label: "Document Logs", icon: FileText },
  { id: "shop-drawings", label: "Shop Drawings", icon: FileImage },
  { id: "admin", label: "Admin Upload", icon: Upload, adminOnly: true },
];

export default function Sidebar({ user, activeTab, onTabChange, onClose, isCollapsed = false, onToggleCollapse }: SidebarProps) {

  if (isCollapsed) {
    return null; // Completely hide sidebar when collapsed
  }

  return (
    <div className="dashboard-sidebar w-64 min-h-screen h-full text-white flex flex-col transition-all duration-300 ease-in-out">
      <div className="p-4 sm:p-6 flex-1">
        {/* Header with close/collapse buttons */}
        <div className="flex items-center justify-between mb-6 lg:mb-8">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
              <Building className="text-white w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold">Atlas Document</h1>
              <p className="text-xs text-gray-300 hidden sm:block">Management System</p>
            </div>
          </div>
          
          {/* Mobile close button */}
          <button
            onClick={onClose}
            className="lg:hidden text-white hover:text-gray-300 p-1"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          {/* Desktop collapse button */}
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="hidden lg:block text-white hover:text-gray-300 p-1 hover:bg-white hover:bg-opacity-10 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="space-y-2">
          {menuItems.map((item) => {
            // Hide admin-only items for unauthorized users
            if (item.adminOnly && user.role !== "admin" && user.role !== "project manager") {
              return null;
            }
            
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => {
                  onTabChange(item.id);
                  onClose(); // Close mobile sidebar
                }}
                className={`w-full flex items-center space-x-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl transition-colors ${
                  isActive
                    ? 'bg-white bg-opacity-10 text-white'
                    : 'text-gray-300 hover:bg-white hover:bg-opacity-10 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                <span className="text-sm sm:text-base truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>


    </div>
  );
}
