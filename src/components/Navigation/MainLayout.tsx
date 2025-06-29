import React, { ReactNode } from 'react';
import Sidebar from './Sidebar';
import OnboardingWizard from '../Onboarding/OnboardingWizard';
import FloatingActionButton from '../UI/FloatingActionButton';

interface MainLayoutProps {
  children: ReactNode;
  showFAB?: boolean;
  fabActions?: Array<{
    label: string;
    icon: React.ComponentType<{ size?: number }>;
    onClick: () => void;
  }>;
}

const MainLayout: React.FC<MainLayoutProps> = ({ 
  children, 
  showFAB = false,
  fabActions = []
}) => {
  return (
    <div className="flex h-screen bg-black overflow-hidden">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
      
      {/* Onboarding Wizard */}
      <OnboardingWizard />
      
      {/* Floating Action Button */}
      {showFAB && fabActions.length > 0 && (
        <FloatingActionButton actions={fabActions} />
      )}
    </div>
  );
};

export default MainLayout;