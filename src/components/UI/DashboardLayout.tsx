import React, { ReactNode, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../Navigation/Sidebar';
import FloatingActionButton from './FloatingActionButton';
import { Trophy, BarChart3, Users, Plus, Menu } from 'lucide-react';
import OnboardingWizard from '../Onboarding/OnboardingWizard';

interface DashboardLayoutProps {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  showFAB?: boolean;
  fabActions?: Array<{
    label: string;
    icon: React.ComponentType<{ size?: number }>;
    onClick: () => void;
  }>;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  title,
  subtitle,
  showFAB = true,
  fabActions
}) => {
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Default FAB actions if none provided
  const defaultFabActions = [
    {
      label: 'New Tournament',
      icon: Trophy,
      onClick: () => navigate('/new-tournament')
    },
    {
      label: 'View Statistics',
      icon: BarChart3,
      onClick: () => navigate('/statistics')
    },
    {
      label: 'Player Management',
      icon: Users,
      onClick: () => navigate('/players')
    }
  ];

  const actions = fabActions || defaultFabActions;

  return (
    <div className="flex h-screen bg-black overflow-hidden">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main Content */}
      <div className="flex-1 overflow-auto bg-gradient-to-br from-gray-900 via-black to-gray-900">
        {/* Header */}
        {(title || subtitle) && (
          <div className="bg-gray-900/50 backdrop-blur-lg border-b border-gray-800/50 p-6">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div>
                {title && (
                  <h1 className="text-3xl font-bold text-white font-orbitron mb-2">
                    {title}
                  </h1>
                )}
                {subtitle && (
                  <p className="text-gray-400 font-jetbrains">
                    {subtitle}
                  </p>
                )}
              </div>
              
              {/* Mobile menu toggle */}
              <button
                className="md:hidden p-2 bg-gray-800/80 backdrop-blur-sm rounded-lg text-gray-300 hover:text-white border border-gray-700/50"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                <Menu size={20} />
              </button>
            </div>
          </div>
        )}
        
        {/* Content */}
        <div className="max-w-7xl mx-auto p-6">
          {children}
        </div>
      </div>
      
      {/* Onboarding Wizard */}
      <OnboardingWizard />
      
      {/* Floating Action Button */}
      {showFAB && actions.length > 0 && (
        <FloatingActionButton actions={actions} />
      )}
    </div>
  );
};

export default DashboardLayout;