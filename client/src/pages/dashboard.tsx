import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, LogOut, ChevronDown } from "lucide-react";
import { useLocation } from "wouter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Sidebar from "@/components/sidebar";
import OverviewTab from "@/components/overview-tab";
import DocumentsDashboard from "./documents-dashboard";
import ShopDrawingsDashboard from "./shop-drawings-dashboard";
import AnalyticsDashboard from "./analytics-dashboard";
import AdminUpload from "./AdminUpload";

import type { User } from "@shared/schema";

interface DashboardProps {
  user: User;
  onLogout: () => void;
}

type TabType = "jeddah-overview" | "jeddah-documents" | "jeddah-shop-drawings" | "jeddah-admin" |
                "emct-overview" | "emct-documents" | "emct-shop-drawings" | "emct-admin";

interface TabConfig {
  title: string;
  subtitle: string;
  project: string;
}

const tabConfigs: Record<TabType, TabConfig> = {
  "jeddah-overview": {
    title: "Analytics & Overview",
    subtitle: "Real-time document management analytics for South Terminal - Jeddah Project",
    project: "jeddah",
  },
  "jeddah-documents": {
    title: "Document Logs",
    subtitle: "View and manage document submissions for South Terminal - Jeddah Project",
    project: "jeddah",
  },
  "jeddah-shop-drawings": {
    title: "Shop Drawings",
    subtitle: "Track shop drawing submissions for South Terminal - Jeddah Project",
    project: "jeddah",
  },
  "jeddah-admin": {
    title: "Admin Upload",
    subtitle: "Upload updated Excel files for South Terminal - Jeddah Project",
    project: "jeddah",
  },
  "emct-overview": {
    title: "Analytics & Overview",
    subtitle: "Real-time document management analytics for EMCT Cargo-ZIA",
    project: "emct",
  },
  "emct-documents": {
    title: "Document Logs",
    subtitle: "View and manage document submissions for EMCT Cargo-ZIA",
    project: "emct",
  },
  "emct-shop-drawings": {
    title: "Shop Drawings",
    subtitle: "Track shop drawing submissions for EMCT Cargo-ZIA",
    project: "emct",
  },
  "emct-admin": {
    title: "Admin Upload",
    subtitle: "Upload updated Excel files for EMCT Cargo-ZIA",
    project: "emct",
  },
};

export default function Dashboard({ user, onLogout }: DashboardProps) {
  const [location] = useLocation();
  
  // Determine active tab based on URL
  const getTabFromUrl = (path: string): TabType => {
    if (path.startsWith('/emct/documents')) return "emct-documents";
    if (path.startsWith('/emct/shop-drawings')) return "emct-shop-drawings";
    if (path.startsWith('/emct/admin')) return "emct-admin";
    if (path.startsWith('/emct')) return "emct-overview";
    if (path.startsWith('/jeddah/documents')) return "jeddah-documents";
    if (path.startsWith('/jeddah/shop-drawings')) return "jeddah-shop-drawings";
    if (path.startsWith('/jeddah/admin')) return "jeddah-admin";
    if (path.startsWith('/jeddah')) return "jeddah-overview";
    
    // Default fallback
    try {
      const savedTab = localStorage.getItem('atlas_active_tab');
      return (savedTab as TabType) || "jeddah-overview";
    } catch (error) {
      console.error('Error reading localStorage:', error);
      return "jeddah-overview";
    }
  };

  const [activeTab, setActiveTab] = useState<TabType>(() => getTabFromUrl(location));
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Update tab when URL changes
  useEffect(() => {
    const urlTab = getTabFromUrl(location);
    if (urlTab !== activeTab) {
      setActiveTab(urlTab);
    }
  }, [location]);

  // Save active tab to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem('atlas_active_tab', activeTab);
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  }, [activeTab]);

  const currentConfig = tabConfigs[activeTab] || tabConfigs["jeddah-overview"];

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const currentProject = currentConfig?.project || 'jeddah';
      let endpoint = '/api/refresh-excel';
      
      if (currentProject === 'emct') {
        endpoint = '/api/emct/refresh';
      }
      
      const response = await fetch(endpoint, { method: 'POST' });
      if (response.ok) {
        console.log('✅ Excel data refreshed successfully for', currentProject);
        // The individual components will auto-refresh due to their query intervals
      } else {
        console.error('❌ Failed to refresh Excel data for', currentProject);
      }
    } catch (error) {
      console.error('❌ Error refreshing Excel data:', error);
    }
    setIsRefreshing(false);
  };

  const renderActiveTab = useMemo(() => {
    try {
      const project = currentConfig?.project || "jeddah";
      
      if (activeTab.endsWith('-overview')) {
        return <AnalyticsDashboard project={project} />;
      } else if (activeTab.endsWith('-documents')) {
        return <DocumentsDashboard project={project} />;
      } else if (activeTab.endsWith('-shop-drawings')) {
        return <ShopDrawingsDashboard project={project} />;
      } else if (activeTab.endsWith('-admin')) {
        return (user?.role === "admin" || user?.role === "project manager") ? 
          <AdminUpload project={project} /> : 
          <AnalyticsDashboard project={project} />;
      }
      
      // Default fallback
      return <AnalyticsDashboard project="jeddah" />;
    } catch (error) {
      console.error('Error rendering tab:', error);
      return <AnalyticsDashboard project="jeddah" />;
    }
  }, [activeTab, user?.role, currentConfig]);

  return (
    <div className="min-h-screen app-background">
      <div className="flex">
        {/* Mobile overlay */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="fixed top-4 left-4 z-30 lg:hidden bg-indigo-600 text-white p-2 rounded-lg shadow-lg hover:bg-indigo-700 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Sidebar */}
        {!isSidebarCollapsed && (
          <div className={`fixed lg:static inset-y-0 left-0 z-50 transform transition-all duration-300 ease-in-out ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}>
            <Sidebar
              user={user}
              activeTab={activeTab}
              onTabChange={(tab: string) => setActiveTab(tab as TabType)}
              onClose={() => setIsSidebarOpen(false)}
              isCollapsed={isSidebarCollapsed}
              onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            />
          </div>
        )}

        {/* Toggle button when sidebar is collapsed */}
        {isSidebarCollapsed && (
          <button
            onClick={() => setIsSidebarCollapsed(false)}
            className="fixed top-4 left-4 z-50 bg-indigo-600 text-white p-3 rounded-lg shadow-lg hover:bg-indigo-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}

        {/* Main Content */}
        <div className={`flex-1 min-w-0 transition-all duration-300 ease-in-out ${isSidebarCollapsed ? 'lg:ml-0' : 'lg:ml-64'}`}>
          {/* Header */}
          <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {/* Mobile menu button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="lg:hidden"
                  onClick={() => setIsSidebarOpen(true)}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </Button>
                
                <div>
                  <h1 className="text-xl lg:text-2xl font-bold text-gray-900">{currentConfig?.title || 'Atlas Dashboard'}</h1>
                  <p className="text-sm lg:text-base text-gray-600">{currentConfig?.subtitle || 'Document Management System'}</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <Button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="bg-primary text-white px-4 py-2 rounded-lg hover:opacity-90 transition-opacity"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                  {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
                </Button>
                
                <div className="hidden sm:flex items-center space-x-2 text-sm text-gray-600">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span>Live</span>
                </div>

                {/* Gmail-style Profile Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      className="relative h-10 w-10 rounded-full bg-indigo-600 hover:bg-indigo-700 transition-colors"
                    >
                      <div className="flex items-center justify-center w-full h-full">
                        <span className="text-white font-semibold text-sm">
                          {(() => {
                            // If username is an email, extract name part before @
                            let name = user.username;
                            if (name.includes('@')) {
                              name = name.split('@')[0];
                            }
                            
                            // For names like "shahinaf93" - try to extract first name and last name initial
                            // Remove numbers from the end
                            name = name.replace(/\d+$/, '');
                            
                            // Split by common separators
                            const parts = name.split(/[\s._-]+/).filter(part => part.length > 0);
                            
                            if (parts.length >= 2) {
                              // Multiple parts: take first letter of first two parts
                              return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
                            } else if (parts.length === 1 && parts[0].length > 1) {
                              // Single part: try to identify first name and last name pattern
                              const singleName = parts[0].toLowerCase();
                              
                              // For "shahinaf" - assume last letter might be last name initial
                              if (singleName.length >= 6) {
                                // Take first letter + last letter as potential first name + last name
                                return (singleName.charAt(0) + singleName.charAt(singleName.length - 1)).toUpperCase();
                              } else {
                                // Short name: take first 2 characters
                                return singleName.slice(0, 2).toUpperCase();
                              }
                            }
                            return 'U'; // Fallback
                          })()}
                        </span>
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{user.username}</p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50"
                      onClick={onLogout}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Sign out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          {/* Tab Content */}
          <div className="flex-1 overflow-auto custom-scrollbar">
            {renderActiveTab}
          </div>
        </div>
      </div>
    </div>
  );
}
