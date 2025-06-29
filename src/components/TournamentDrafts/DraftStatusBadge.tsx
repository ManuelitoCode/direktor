import React from 'react';
import { Save, AlertTriangle, CheckCircle } from 'lucide-react';

interface DraftStatusBadgeProps {
  status: 'idle' | 'saving' | 'saved' | 'error';
  className?: string;
}

const DraftStatusBadge: React.FC<DraftStatusBadgeProps> = ({ status, className = '' }) => {
  if (status === 'idle') return null;

  const getStatusConfig = () => {
    switch (status) {
      case 'saving':
        return {
          icon: Save,
          text: 'Saving...',
          bgColor: 'bg-yellow-500/20',
          borderColor: 'border-yellow-500/50',
          textColor: 'text-yellow-400'
        };
      case 'saved':
        return {
          icon: CheckCircle,
          text: 'Saved',
          bgColor: 'bg-green-500/20',
          borderColor: 'border-green-500/50',
          textColor: 'text-green-400'
        };
      case 'error':
        return {
          icon: AlertTriangle,
          text: 'Save failed',
          bgColor: 'bg-red-500/20',
          borderColor: 'border-red-500/50',
          textColor: 'text-red-400'
        };
      default:
        return {
          icon: Save,
          text: '',
          bgColor: 'bg-gray-500/20',
          borderColor: 'border-gray-500/50',
          textColor: 'text-gray-400'
        };
    }
  };

  const { icon: Icon, text, bgColor, borderColor, textColor } = getStatusConfig();

  return (
    <div className={`flex items-center gap-1 px-2 py-1 ${bgColor} ${borderColor} border rounded-md ${textColor} text-xs font-jetbrains ${className}`}>
      <Icon size={12} className={status === 'saving' ? 'animate-spin' : ''} />
      <span>{text}</span>
    </div>
  );
};

export default DraftStatusBadge;