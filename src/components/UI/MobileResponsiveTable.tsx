import React, { ReactNode } from 'react';

interface Column<T> {
  key: string;
  header: string;
  render: (item: T) => ReactNode;
  className?: string;
}

interface MobileResponsiveTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  emptyMessage?: string;
  onRowClick?: (item: T) => void;
  isLoading?: boolean;
}

function MobileResponsiveTable<T>({
  data,
  columns,
  keyExtractor,
  emptyMessage = 'No data available',
  onRowClick,
  isLoading = false
}: MobileResponsiveTableProps<T>) {
  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400 font-jetbrains">
        {emptyMessage}
      </div>
    );
  }

  // Desktop view (table)
  const desktopView = (
    <div className="hidden md:block overflow-x-auto">
      <table className="w-full">
        <thead className="bg-gray-800/50">
          <tr>
            {columns.map((column) => (
              <th 
                key={column.key} 
                className={`px-4 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider font-jetbrains ${column.className || ''}`}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-700">
          {data.map((item) => (
            <tr 
              key={keyExtractor(item)} 
              className={`bg-gray-900/30 hover:bg-gray-800/30 transition-colors duration-200 ${onRowClick ? 'cursor-pointer' : ''}`}
              onClick={() => onRowClick && onRowClick(item)}
            >
              {columns.map((column) => (
                <td key={`${keyExtractor(item)}-${column.key}`} className={`px-4 py-4 ${column.className || ''}`}>
                  {column.render(item)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // Mobile view (cards)
  const mobileView = (
    <div className="md:hidden space-y-4">
      {data.map((item) => (
        <div 
          key={keyExtractor(item)} 
          className={`bg-gray-900/50 border border-gray-700 rounded-lg p-4 ${onRowClick ? 'cursor-pointer' : ''}`}
          onClick={() => onRowClick && onRowClick(item)}
        >
          {columns.map((column) => (
            <div key={`${keyExtractor(item)}-${column.key}`} className="mb-3 last:mb-0">
              <div className="text-xs text-gray-400 font-jetbrains mb-1">{column.header}</div>
              <div>{column.render(item)}</div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );

  return (
    <div className="bg-gray-900/50 border border-gray-700 rounded-xl overflow-hidden backdrop-blur-sm">
      {desktopView}
      {mobileView}
    </div>
  );
}

export default MobileResponsiveTable;