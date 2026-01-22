import { useRef, useState } from 'react';
import { Button } from './Button';
import { FilterPopover, type FilterOptions } from './FilterPopover';

interface ContextualActionBarProps {
  selectedCount: number;
  onShowAllColumns: () => void;
  onHideAllColumns: () => void;
  onGroupNodes: () => void;
  onDropNodes: () => void;
  showAllColumns: boolean;
  onApplyFilters: (filters: FilterOptions) => void;
  currentFilters: FilterOptions;
}

export function ContextualActionBar({
  selectedCount,
  onShowAllColumns,
  onHideAllColumns,
  onGroupNodes,
  onDropNodes,
  showAllColumns,
  onApplyFilters,
  currentFilters,
}: ContextualActionBarProps) {
  const [showFilterPopover, setShowFilterPopover] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement>(null);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '8px 12px',
      background: 'rgba(59, 130, 246, 0.1)',
      borderRadius: 8,
      fontSize: 12,
      fontWeight: 500,
      position: 'relative',
    }}>
      {/* Selection Count */}
      <div style={{
        color: '#1e40af',
        marginRight: 8,
        display: 'flex',
        alignItems: 'center',
        gap: 4,
      }}>
        {selectedCount} selected
      </div>

      {/* Actions */}
      <Button
        variant="secondary"
        size="sm"
        level="reactflow"
        onClick={showAllColumns ? onHideAllColumns : onShowAllColumns}
      >
        {showAllColumns ? 'Hide Columns' : 'Show Columns'}
      </Button>

      <Button
        ref={filterButtonRef}
        variant="secondary"
        size="sm"
        level="reactflow"
        onClick={() => setShowFilterPopover(!showFilterPopover)}
      >
        Filter
      </Button>

      <Button
        variant="secondary"
        size="sm"
        level="reactflow"
        onClick={onGroupNodes}
        disabled={selectedCount < 2}
        title={selectedCount < 2 ? 'Select at least 2 nodes to group' : 'Group selected nodes'}
        style={{
          opacity: selectedCount < 2 ? 0.5 : 1,
          cursor: selectedCount < 2 ? 'not-allowed' : 'pointer',
        }}
      >
        Group
      </Button>

      <Button
        variant="secondary"
        size="sm"
        level="reactflow"
        onClick={onDropNodes}
        style={{
          color: '#dc2626',
          borderColor: '#fecaca',
        }}
      >
        Drop
      </Button>

      {/* Filter Popover */}
      <FilterPopover
        isOpen={showFilterPopover}
        onClose={() => setShowFilterPopover(false)}
        onApplyFilters={onApplyFilters}
        currentFilters={currentFilters}
        showDirectionOptions={selectedCount === 1} // Show direction options only for single selection
        anchorRef={filterButtonRef}
      />
    </div>
  );
}
