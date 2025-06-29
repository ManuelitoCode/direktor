import React, { useState, useRef, useEffect } from 'react';
import { Edit3, Save, X } from 'lucide-react';

interface InlineEditableFieldProps {
  value: string | number;
  onSave: (newValue: string | number) => Promise<boolean>;
  type?: 'text' | 'number';
  label?: string;
  className?: string;
}

const InlineEditableField: React.FC<InlineEditableFieldProps> = ({
  value,
  onSave,
  type = 'text',
  label,
  className = ''
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const handleEdit = () => {
    setIsEditing(true);
    setError(null);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue(value);
    setError(null);
  };

  const handleSave = async () => {
    if (editValue === value) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const success = await onSave(editValue);
      if (success) {
        setIsEditing(false);
      } else {
        setError('Failed to save changes');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  return (
    <div className={`relative ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-gray-400 mb-1 font-jetbrains">
          {label}
        </label>
      )}
      
      {isEditing ? (
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type={type}
            value={editValue}
            onChange={(e) => setEditValue(type === 'number' ? Number(e.target.value) : e.target.value)}
            onKeyDown={handleKeyDown}
            className="w-full px-3 py-2 bg-gray-800/50 border border-blue-500/50 rounded-lg text-white font-jetbrains focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            disabled={isSaving}
          />
          
          <div className="flex items-center gap-1">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="p-2 bg-green-600/20 border border-green-500/50 text-green-400 hover:bg-green-600/30 hover:text-white rounded-lg transition-all duration-200"
              aria-label="Save changes"
            >
              {isSaving ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save size={16} />
              )}
            </button>
            
            <button
              onClick={handleCancel}
              disabled={isSaving}
              className="p-2 bg-red-600/20 border border-red-500/50 text-red-400 hover:bg-red-600/30 hover:text-white rounded-lg transition-all duration-200"
              aria-label="Cancel editing"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between group py-2 px-3 border border-transparent hover:border-gray-700 rounded-lg">
          <div className="text-white font-jetbrains">
            {value}
          </div>
          
          <button
            onClick={handleEdit}
            className="p-1 text-gray-500 opacity-0 group-hover:opacity-100 hover:text-blue-400 transition-all duration-200"
            aria-label="Edit value"
          >
            <Edit3 size={14} />
          </button>
        </div>
      )}
      
      {error && (
        <div className="text-red-400 text-xs mt-1 font-jetbrains">
          {error}
        </div>
      )}
    </div>
  );
};

export default InlineEditableField;