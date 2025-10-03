import React, { useState, useRef, useEffect } from 'react';
import { Button } from './Button';

export type FilterOptions = {
  objectTypes: Set<string>;
  edgeTypes: Set<string>;
  direction?: 'upstream' | 'downstream' | null; // Only when single node selected
};

interface FilterPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyFilters: (filters: FilterOptions) => void;
  currentFilters: FilterOptions;
  showDirectionOptions?: boolean; // Show direction options when single node selected
  anchorRef: React.RefObject<HTMLElement>;
}

interface MultiSelectDropdownProps {
  label: string;
  options: { value: string; label: string }[];
  selectedValues: Set<string>;
  onSelectionChange: (newSelection: Set<string>) => void;
}

function MultiSelectDropdown({ label, options, selectedValues, onSelectionChange }: MultiSelectDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const allSelected = selectedValues.size === options.length;
  const noneSelected = selectedValues.size === 0;

  const getDisplayText = () => {
    if (allSelected) return 'Show all';
    if (noneSelected) return 'None selected';
    if (selectedValues.size === 1) {
      const selectedOption = options.find(opt => selectedValues.has(opt.value));
      return selectedOption?.label || 'Unknown';
    }
    return `${selectedValues.size} selected`;
  };

  const handleShowAllClick = () => {
    // "Show all" is not a toggle - it only selects all, never deselects
    onSelectionChange(new Set(options.map(opt => opt.value)));
  };

  const handleOptionClick = (optionValue: string) => {
    if (allSelected) {
      // If everything is selected and user clicks a specific item, clear all and select only that item
      onSelectionChange(new Set([optionValue]));
    } else {
      // Normal toggle behavior
      const newSelection = new Set(selectedValues);
      if (newSelection.has(optionValue)) {
        newSelection.delete(optionValue);
      } else {
        newSelection.add(optionValue);
      }
      onSelectionChange(newSelection);
    }
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative', marginBottom: 16 }}>
      <div style={{ fontWeight: 600, marginBottom: 8, color: '#1e252f' }}>
        {label}:
      </div>
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          border: '1px solid #d1d5db',
          borderRadius: 6,
          padding: '8px 12px',
          cursor: 'pointer',
          backgroundColor: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: 14,
        }}
      >
        <span style={{ color: noneSelected ? '#9ca3af' : '#1e252f' }}>
          {getDisplayText()}
        </span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="currentColor"
          style={{
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
            color: '#6b7280',
          }}
        >
          <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: 4,
            backgroundColor: 'white',
            border: '1px solid #d1d5db',
            borderRadius: 6,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            zIndex: 1001,
            maxHeight: 200,
            overflowY: 'auto',
          }}
        >
          {/* Show all option */}
          <div
            onClick={handleShowAllClick}
            style={{
              padding: '8px 12px',
              cursor: 'pointer',
              backgroundColor: 'white', // Always white background since it's not a toggle
              borderBottom: '1px solid #e5e7eb',
              fontSize: 14,
              fontWeight: 500,
              color: '#1e252f',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f9fafb';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'white';
            }}
          >
            ✓ Show all
          </div>

          {/* Individual options */}
          {options.map(option => (
            <div
              key={option.value}
              onClick={() => handleOptionClick(option.value)}
              style={{
                padding: '8px 12px',
                cursor: 'pointer',
                backgroundColor: selectedValues.has(option.value) ? '#f3f4f6' : 'white',
                fontSize: 14,
                color: '#1e252f',
                display: 'flex',
                alignItems: 'center',
              }}
              onMouseEnter={(e) => {
                if (!selectedValues.has(option.value)) e.currentTarget.style.backgroundColor = '#f9fafb';
              }}
              onMouseLeave={(e) => {
                if (!selectedValues.has(option.value)) e.currentTarget.style.backgroundColor = 'white';
              }}
            >
              <span style={{ marginRight: 8, opacity: selectedValues.has(option.value) ? 1 : 0 }}>
                ✓
              </span>
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const OBJECT_TYPES = [
  { value: 'TABLE', label: 'Table' },
  { value: 'VIEW', label: 'View' },
  { value: 'STAGE', label: 'Stage' },
  { value: 'DATASET', label: 'Dataset' },
  { value: 'MODEL', label: 'Model' },
  { value: 'EXTERNAL', label: 'External' },
];

const EDGE_TYPES = [
  { value: 'DBT_MODEL', label: 'dbt Model' },
  { value: 'DBT_SNAPSHOT', label: 'dbt Snapshot' },
  { value: 'DBT_SEED', label: 'dbt Seed' },
  { value: 'AIRFLOW_PIPELINE', label: 'Airflow Pipeline' },
  { value: 'SPARK_JOB', label: 'Spark Job' },
  { value: 'FIVETRAN_SYNC', label: 'Fivetran Sync' },
  { value: 'CTAS', label: 'CTAS' },
  { value: 'MERGE', label: 'Merge' },
  { value: 'VIEW DEP', label: 'View Dependency' },
];

export function FilterPopover({
  isOpen,
  onClose,
  onApplyFilters,
  currentFilters,
  showDirectionOptions = false,
  anchorRef
}: FilterPopoverProps) {
  const [localFilters, setLocalFilters] = useState<FilterOptions>(currentFilters);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top?: number; bottom?: number; left?: number; right?: number }>({});

  // Update local filters when current filters change
  useEffect(() => {
    setLocalFilters(currentFilters);
  }, [currentFilters]);

  // Calculate position based on anchor and available space
  useEffect(() => {
    if (!isOpen || !anchorRef.current) return;

    const updatePosition = () => {
      const anchor = anchorRef.current;
      if (!anchor) return;

      const anchorRect = anchor.getBoundingClientRect();
      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      
      // Popover dimensions (approximate)
      const popoverWidth = 320;
      const popoverHeight = showDirectionOptions ? 400 : 300;
      
      // Calculate available space
      const spaceBelow = viewportHeight - anchorRect.bottom;
      const spaceAbove = anchorRect.top;
      const spaceRight = viewportWidth - anchorRect.right;

      let newPosition: { top?: number; bottom?: number; left?: number; right?: number } = {};

      // Vertical positioning - prefer below, but go above if not enough space
      if (spaceBelow >= popoverHeight || spaceBelow >= spaceAbove) {
        // Position below
        newPosition.top = anchorRect.bottom + 8;
      } else {
        // Position above
        newPosition.bottom = viewportHeight - anchorRect.top + 8;
      }

      // Horizontal positioning - prefer right-aligned, but adjust if needed
      if (spaceRight >= popoverWidth) {
        // Right-align with anchor (normal case)
        newPosition.right = viewportWidth - anchorRect.right;
      } else {
        // Left-align with anchor if not enough space on right
        newPosition.left = anchorRect.left;
      }

      setPosition(newPosition);
    };

    updatePosition();
    
    // Update position on window resize or scroll
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);
    
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [isOpen, anchorRef, showDirectionOptions]);

  // Close popover when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        anchorRef.current &&
        !anchorRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose, anchorRef]);

  const handleObjectTypesChange = (newObjectTypes: Set<string>) => {
    setLocalFilters(prev => ({ ...prev, objectTypes: newObjectTypes }));
  };

  const handleEdgeTypesChange = (newEdgeTypes: Set<string>) => {
    setLocalFilters(prev => ({ ...prev, edgeTypes: newEdgeTypes }));
  };

  const handleDirectionChange = (direction: 'upstream' | 'downstream' | null) => {
    setLocalFilters(prev => ({ ...prev, direction }));
  };

  const handleApply = () => {
    onApplyFilters(localFilters);
    // Don't close the popover - let user see the changes and continue filtering
  };

  const handleReset = () => {
    const resetFilters: FilterOptions = {
      objectTypes: new Set(OBJECT_TYPES.map(t => t.value)),
      edgeTypes: new Set(EDGE_TYPES.map(t => t.value)),
      direction: null,
    };
    setLocalFilters(resetFilters);
  };

  if (!isOpen) return null;

  return (
    <div
      ref={popoverRef}
      style={{
        position: 'fixed', // Changed from absolute to fixed for viewport positioning
        ...position, // Use calculated position
        background: 'white',
        border: '1px solid #e2e8f0',
        borderRadius: 8,
        padding: 16,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        zIndex: 1000,
        minWidth: 280,
        maxWidth: 320,
        fontSize: 14,
      }}
    >
      {/* Header with Close Button */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: 16,
        paddingBottom: 12,
        borderBottom: '1px solid #e5e7eb'
      }}>
        <div style={{ fontWeight: 600, color: '#1e252f', fontSize: 16 }}>
          Filters
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 4,
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#6b7280',
            fontSize: 16,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f3f4f6';
            e.currentTarget.style.color = '#374151';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = '#6b7280';
          }}
          title="Close filters"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path fillRule="evenodd" clipRule="evenodd" d="M4.28033 4.28033C4.48816 4.0725 4.82475 4.0725 5.03258 4.28033L8 7.24775L10.9674 4.28033C11.1753 4.0725 11.5118 4.0725 11.7197 4.28033C11.9275 4.48816 11.9275 4.82475 11.7197 5.03258L8.75225 8L11.7197 10.9674C11.9275 11.1753 11.9275 11.5118 11.7197 11.7197C11.5118 11.9275 11.1753 11.9275 10.9674 11.7197L8 8.75225L5.03258 11.7197C4.82475 11.9275 4.48816 11.9275 4.28033 11.7197C4.0725 11.5118 4.0725 11.1753 4.28033 10.9674L7.24775 8L4.28033 5.03258C4.0725 4.82475 4.0725 4.48816 4.28033 4.28033Z"/>
          </svg>
        </button>
      </div>
      {/* Direction Options (only for single node selection) */}
      {showDirectionOptions && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 600, marginBottom: 8, color: '#1e252f' }}>
            Apply Filter To:
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="radio"
                name="direction"
                value="upstream"
                checked={localFilters.direction === 'upstream'}
                onChange={() => handleDirectionChange('upstream')}
                style={{ marginRight: 8 }}
              />
              Upstream nodes
            </label>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="radio"
                name="direction"
                value="downstream"
                checked={localFilters.direction === 'downstream'}
                onChange={() => handleDirectionChange('downstream')}
                style={{ marginRight: 8 }}
              />
              Downstream nodes
            </label>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="radio"
                name="direction"
                value=""
                checked={localFilters.direction === null}
                onChange={() => handleDirectionChange(null)}
                style={{ marginRight: 8 }}
              />
              All nodes
            </label>
          </div>
        </div>
      )}

      {/* Object Types Dropdown */}
      <MultiSelectDropdown
        label="Object Types"
        options={OBJECT_TYPES}
        selectedValues={localFilters.objectTypes}
        onSelectionChange={handleObjectTypesChange}
      />

      {/* Edge Types Dropdown */}
      <MultiSelectDropdown
        label="Edge Types"
        options={EDGE_TYPES}
        selectedValues={localFilters.edgeTypes}
        onSelectionChange={handleEdgeTypesChange}
      />

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button
            onClick={handleReset}
            variant="secondary"
            size="sm"
            level="reactflow"
          >
            Reset
          </Button>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button
            onClick={onClose}
            variant="secondary"
            size="sm"
            level="reactflow"
          >
            Close
          </Button>
          <Button
            onClick={handleApply}
            variant="primary"
            size="sm"
            level="reactflow"
          >
            Apply
          </Button>
        </div>
      </div>
    </div>
  );
}
