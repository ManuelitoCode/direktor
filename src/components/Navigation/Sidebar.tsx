import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  Trophy, 
  HelpCircle, 
  ChevronLeft, 
  ChevronRight,
  LogOut,
  Users,
  BarChart3,
  Home
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { get, set } from 'idb-keyval';

interface SidebarProps {
  onSignOut?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onSignOut }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Check if sidebar state is stored
    get('sidebar-collapsed').then((value) => {
      if (value !== undefined) {
        setCollapsed(value);
      }
    });

    // Check if mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setCollapsed(true);
        setIsOpen(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const toggleCollapse = () => {
    const newState = !collapsed;
    setCollapsed(newState);
    set('sidebar-collapsed', newState);
  };

  const toggleMobileSidebar = () => {
    setIsOpen(!isOpen);
  };

  const handleSignOut = async () => {
    setIsLoading(prev => ({ ...prev, signOut: true }));
    try {
      await supabase.auth.signOut();
      if (onSignOut) {
        onSignOut();
      }
      navigate('/');
    } catch (err) {
      console.error('Error signing out:', err);
      navigate('/');
    } finally {
      setIsLoading(prev => ({ ...prev, signOut: false }));
    }
  };

  const handleNavigation = (path: string) => {
    setIsLoading(prev => ({ ...prev, [path]: true }));
    
    // Close mobile sidebar if open
    if (isMobile && isOpen) {
      setIsOpen(false);
    }
    
    // Navigate to the path
    navigate(path);
    
    // Reset loading state after navigation
    setTimeout(() => {
      setIsLoading(prev => ({ ...prev, [path]: false }));
    }, 300);
  };

  const handleHelp = () => {
    setIsLoading(prev => ({ ...prev, '/help': true }));
    
    // Close mobile sidebar if open
    if (isMobile && isOpen) {
      setIsOpen(false);
    }
    
    // Navigate to help page
    navigate('/help');
    
    // Reset loading state after navigation
    setTimeout(() => {
      setIsLoading(prev => ({ ...prev, '/help': false }));
    }, 300);
  };

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: Home },
    { path: '/leaderboard/players', label: 'Player Rankings', icon: Users },
    { path: '/help', label: 'Help', icon: HelpCircle, onClick: handleHelp },
  ];

  // Mobile sidebar
  if (isMobile) {
    return (
      <>
        {/* Mobile Toggle Button */}
        <button
          onClick={toggleMobileSidebar}
          className="fixed top-4 left-4 z-40 p-2 bg-gray-800/80 backdrop-blur-sm rounded-lg text-gray-300 hover:text-white border border-gray-700/50 transition-all duration-300 active:scale-95"
          aria-label={isOpen ? "Close navigation menu" : "Open navigation menu"}
        >
          {isOpen ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
        </button>

        {/* Mobile Sidebar */}
        <div
          className={`fixed inset-0 z-30 transition-all duration-300 ${
            isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          }`}
        >
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />

          {/* Sidebar Content */}
          <div className={`absolute top-0 left-0 h-full w-64 bg-gray-900/95 backdrop-blur-lg border-r border-gray-800/50 transform transition-transform duration-300 ${
            isOpen ? 'translate-x-0' : '-translate-x-full'
          }`}>
            <div className="p-4 border-b border-gray-800/50">
              <h2 className="text-xl font-bold text-white font-orbitron">DIREKTOR</h2>
              <p className="text-sm text-gray-400 font-jetbrains">Tournament Manager</p>
            </div>

            <nav className="p-4 space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <button
                    key={item.path}
                    onClick={() => item.onClick ? item.onClick() : handleNavigation(item.path)}
                    disabled={isLoading[item.path]}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${
                      active
                        ? 'bg-[#2A2D3E] text-white border-l-3 border-[#6366F1]'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                    } active:scale-98 touch-manipulation`}
                    style={{ 
                      minHeight: '44px',
                      borderLeftWidth: active ? '3px' : '0px'
                    }}
                  >
                    {isLoading[item.path] ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Icon size={20} />
                    )}
                    <span className="font-jetbrains">{item.label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-800/50">
              <button
                onClick={handleSignOut}
                disabled={isLoading.signOut}
                className="w-full flex items-center gap-3 px-4 py-3 bg-red-600/20 border border-red-500/50 text-red-400 hover:bg-red-600/30 hover:text-white rounded-lg font-jetbrains text-sm transition-all duration-200"
                style={{ minHeight: '44px' }}
              >
                {isLoading.signOut ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <LogOut size={20} />
                )}
                <span className="font-jetbrains">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  // Desktop sidebar
  return (
    <div
      className={`h-screen bg-gray-900/95 backdrop-blur-lg border-r border-gray-800/50 transition-all duration-300 ${
        collapsed ? 'w-20' : 'w-64'
      } flex flex-col`}
    >
      <div className={`p-4 border-b border-gray-800/50 ${collapsed ? 'items-center' : ''}`}>
        {collapsed ? (
          <div className="flex justify-center">
            <span className="text-2xl font-bold text-white font-orbitron">D</span>
          </div>
        ) : (
          <>
            <h2 className="text-xl font-bold text-white font-orbitron">DIREKTOR</h2>
            <p className="text-sm text-gray-400 font-jetbrains">Tournament Manager</p>
          </>
        )}
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <button
              key={item.path}
              onClick={() => item.onClick ? item.onClick() : handleNavigation(item.path)}
              disabled={isLoading[item.path]}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${
                active
                  ? 'bg-[#2A2D3E] text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
              } ${collapsed ? 'justify-center' : ''} active:scale-98 relative overflow-hidden`}
              style={{ 
                borderLeftWidth: active && !collapsed ? '3px' : '0px',
                borderLeftColor: active ? '#6366F1' : 'transparent',
                borderLeftStyle: 'solid'
              }}
              title={collapsed ? item.label : undefined}
            >
              {isLoading[item.path] ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Icon size={20} />
              )}
              {!collapsed && <span className="font-jetbrains">{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-800/50">
        <button
          onClick={toggleCollapse}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-800/50 text-gray-400 hover:text-white rounded-lg transition-all duration-200 active:scale-98"
        >
          {collapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
          {!collapsed && <span className="font-jetbrains text-sm">Collapse</span>}
        </button>

        <button
          onClick={handleSignOut}
          disabled={isLoading.signOut}
          className={`w-full mt-4 flex items-center gap-3 px-4 py-3 bg-red-600/20 border border-red-500/50 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-600/30 hover:text-white hover:border-red-400 transition-all duration-200 group/gear ${
            collapsed ? 'justify-center' : ''
          }`}
          title={collapsed ? 'Sign Out' : undefined}
        >
          {isLoading.signOut ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <LogOut size={20} />
          )}
          {!collapsed && <span className="font-jetbrains">Sign Out</span>}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;