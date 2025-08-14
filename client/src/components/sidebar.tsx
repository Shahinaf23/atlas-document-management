import { FileText, FileImage, BarChart3, Building, Upload, ChevronLeft, ChevronRight, FolderOpen, Folder, ChevronDown } from "lucide-react";
import type { User } from "@shared/schema";
import { useState } from "react";
import { useLocation } from "wouter";

interface SidebarProps {
  user: User;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onClose: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

interface ProjectFolder {
  id: string;
  name: string;
  items: MenuItem[];
}

interface MenuItem {
  id: string;
  label: string;
  icon: any;
  adminOnly?: boolean;
  project: string;
}

const projectFolders: ProjectFolder[] = [
  {
    id: "jeddah",
    name: "South Terminal-Jeddah",
    items: [
      { id: "jeddah-overview", label: "Analytics & Overview", icon: BarChart3, project: "jeddah" },
      { id: "jeddah-documents", label: "Document Logs", icon: FileText, project: "jeddah" },
      { id: "jeddah-shop-drawings", label: "Shop Drawings", icon: FileImage, project: "jeddah" },
      { id: "jeddah-admin", label: "Admin Upload", icon: Upload, adminOnly: true, project: "jeddah" },
    ]
  },
  {
    id: "emct",
    name: "EMCT Cargo-ZIA",
    items: [
      { id: "emct-overview", label: "Analytics & Overview", icon: BarChart3, project: "emct" },
      { id: "emct-documents", label: "Document Logs", icon: FileText, project: "emct" },
      { id: "emct-shop-drawings", label: "Shop Drawings", icon: FileImage, project: "emct" },
      { id: "emct-admin", label: "Admin Upload", icon: Upload, adminOnly: true, project: "emct" },
    ]
  }
];

export default function Sidebar({ user, activeTab, onTabChange, onClose, isCollapsed = false, onToggleCollapse }: SidebarProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['jeddah', 'emct'])); // Both folders expanded by default
  const [, setLocation] = useLocation();

  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

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
            data-testid="button-close-mobile"
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
              data-testid="button-collapse-desktop"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Project Folders Navigation */}
        <nav className="space-y-1">
          {projectFolders.map((folder) => (
            <div key={folder.id} className="space-y-1">
              {/* Folder Header */}
              <button
                onClick={() => toggleFolder(folder.id)}
                className="w-full flex items-center space-x-2 px-3 py-2 text-left text-gray-300 hover:text-white hover:bg-white hover:bg-opacity-5 rounded-lg transition-colors group"
                data-testid={`button-folder-${folder.id}`}
              >
                <div className="flex items-center space-x-2 flex-1">
                  {expandedFolders.has(folder.id) ? (
                    <FolderOpen className="w-4 h-4 flex-shrink-0" />
                  ) : (
                    <Folder className="w-4 h-4 flex-shrink-0" />
                  )}
                  <span className="text-xs sm:text-sm font-medium truncate">{folder.name}</span>
                </div>
                <ChevronDown 
                  className={`w-4 h-4 flex-shrink-0 transition-transform ${
                    expandedFolders.has(folder.id) ? 'rotate-180' : ''
                  }`} 
                />
              </button>

              {/* Folder Contents */}
              {expandedFolders.has(folder.id) && (
                <div className="ml-4 space-y-1">
                  {folder.items.map((item) => {
                    // Hide admin-only items for unauthorized users
                    if (item.adminOnly && user.role !== "admin" && user.role !== "project manager") {
                      return null;
                    }
                    
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    
                    const getUrlForTab = (tabId: string): string => {
                      if (tabId.startsWith('emct-')) {
                        const section = tabId.replace('emct-', '');
                        return section === 'overview' ? '/emct' : `/emct/${section}`;
                      } else if (tabId.startsWith('jeddah-')) {
                        const section = tabId.replace('jeddah-', '');
                        return section === 'overview' ? '/jeddah' : `/jeddah/${section}`;
                      }
                      return '/';
                    };

                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          const url = getUrlForTab(item.id);
                          setLocation(url);
                          onTabChange(item.id);
                          onClose(); // Close mobile sidebar
                        }}
                        className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                          isActive
                            ? 'bg-white bg-opacity-15 text-white'
                            : 'text-gray-400 hover:bg-white hover:bg-opacity-10 hover:text-white'
                        }`}
                        data-testid={`button-${item.id}`}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <span className="text-xs sm:text-sm truncate">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </nav>
      </div>
    </div>
  );
}
