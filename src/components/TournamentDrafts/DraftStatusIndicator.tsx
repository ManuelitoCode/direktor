import React, { useState, useEffect } from 'react';
import { Save, Check, AlertTriangle, Wifi, WifiOff } from 'lucide-react';

interface DraftStatusIndicatorProps {
  isSaving: boolean;
  lastSaved: Date | null;
  isOnline: boolean;
  error: string | null;
  className?: string;
}

const DraftStatusIndicator: React.FC<DraftStatusIndicatorProps> = ({
  isSaving,
  lastSaved,
  isOnline,
  error,
  className = ''
}) => {
  const [timeSinceLastSave, setTimeSinceLastSave] = useState<string>('');
  
  useEffect(() => {
    // Update time since last save every second
    const interval = setInterval(() => {
      if (lastSaved) {
        setTimeSinceLastSave(formatTimeSince(lastSaved));
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [lastSaved]);
  
  const formatTimeSince = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    
    if (diffSec < 60) return `${diffSec}s ago`;
    
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `${diffHour}h ago`;
    
    const diffDay = Math.floor(diffHour / 24);
    return `${diffDay}d ago`;
  };
  
  // Determine status and appearance
  let statusIcon;
  let statusText;
  let statusClass;
  
  if (error) {
    statusIcon = <AlertTriangle size={16} className="text-red-400" />;
    statusText = error;
    statusClass = 'text-red-400';
  } else if (isSaving) {
    statusIcon = <Save size={16} className="text-blue-400 animate-pulse" />;
    statusText = 'Saving...';
    statusClass = 'text-blue-400';
  } else if (!isOnline) {
    statusIcon = <WifiOff size={16} className="text-yellow-400" />;
    statusText = 'Offline - Changes will sync when online';
    statusClass = 'text-yellow-400';
  } else if (lastSaved) {
    statusIcon = <Check size={16} className="text-green-400" />;
    statusText = `Saved ${timeSinceLastSave}`;
    statusClass = 'text-green-400';
  } else {
    statusIcon = <Wifi size={16} className="text-gray-400" />;
    statusText = 'Ready';
    statusClass = 'text-gray-400';
  }
  
  return (
    <div className={`flex items-center gap-2 ${statusClass} ${className}`}>
      {statusIcon}
      <span className="text-sm font-jetbrains">{statusText}</span>
    </div>
  );
};

export default DraftStatusIndicator;