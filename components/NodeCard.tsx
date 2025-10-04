import { IconButton } from './IconButton';
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Handle, Position, NodeToolbar } from 'reactflow';
import type { ObjType, ColumnMetadata } from '../lib/types';
import { colors, nodeCard } from '../styles';
import { tokens } from '../lib/tokens';

export type NodeCardData = {
  id: string;
  name: string;
  label: string;
  objType: ObjType;
  upstreamExpanded?: boolean;
  downstreamExpanded?: boolean;
  childrenExpanded?: boolean;
  selected?: boolean;
  multiSelected?: boolean; // Whether this node is part of a multi-selection (for logic only, no visual change)
  dataQualityScore?: number; // 0-5 rating
  createdTimestamp?: string;
  error?: string | string[]; // Single error message or array of error messages
  warning?: string | string[]; // Single warning message or array of warning messages
  children?: Array<{ name: string; type: string; selected?: boolean }>; // columns or child objects
  selectedChildren?: Set<string>; // Track selected column names (auto-selected by app)
  focusedChild?: string; // Track explicitly focused column (user clicked)
  columnsMetadata?: ColumnMetadata[]; // Detailed column metadata for side panel
  brandIcon?: string; // Path to brand icon for external nodes
  onToggleUpstream?: () => void;
  onToggleDownstream?: () => void;
  onToggleChildren?: () => void;
  onSelectChild?: (childName: string) => void;
  onFocusChild?: (childName: string) => void; // Explicit focus for side panel
  onClearColumnLineage?: () => void; // Clear column lineage selection
  onHoverChild?: (childName: string) => void; // Hover over column
  onUnhoverChild?: () => void; // Stop hovering over column
  onLayoutChange?: () => void; // Callback to trigger ReactFlow layout recalculation
};

function PlusIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
      <path d="M6.5 1.5H5.5V5.5H1.5V6.5H5.5V10.5H6.5V6.5H10.5V5.5H6.5V1.5Z" />
    </svg>
  );
}

function MinusIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
      <path d="M1.5 5.5V6.5H10.5V5.5H1.5Z" />
    </svg>
  );
}

function typeStyle(t: ObjType) {
  switch (t) {
    case 'TABLE':
      return colors.table;
    case 'VIEW':
      return colors.view;
    case 'STAGE':
      return colors.stage;
    case 'DATASET':
      return colors.dataset;
    case 'MODEL':
      return colors.model;
    case 'EXTERNAL':
      return colors.external;
    case 'EXT_TABLE':
      return colors.external;
    case 'EXT_STAGE':
      return colors.external;
    default:
      return colors.default;
  }
}
function TypeIcon({ type }: { type: ObjType }) {
  const iconProps = { width: 16, height: 16, style: { marginRight: 4 } };
  
  switch (type) {
    case 'TABLE':
      return (
        <svg {...iconProps} viewBox="0 0 16 16" fill="currentColor">
          <path fill-rule="evenodd" clip-rule="evenodd" d="M12.5 2C13.3284 2 14 2.67157 14 3.5V12.5C14 13.3284 13.3284 14 12.5 14H3.5C2.67157 14 2 13.3284 2 12.5V3.5C2 2.67157 2.67157 2 3.5 2H12.5ZM6 13H12.5C12.7761 13 13 12.7761 13 12.5V6H6V13ZM3 12.5C3 12.7761 3.22386 13 3.5 13H5V6H3V12.5ZM6 5H13V3.5C13 3.22386 12.7761 3 12.5 3H6V5ZM3.5 3C3.22386 3 3 3.22386 3 3.5V5H5V3H3.5Z" fill="#5D6A85"/>
        </svg>
      );
    case 'VIEW':
      return (
        <svg {...iconProps} viewBox="0 0 16 16" fill="currentColor">
          <path d="M9.70703 9.5L7.35352 11.8535L6.64648 11.1465L8.29297 9.5L6.64648 7.85352L7.35352 7.14648L9.70703 9.5Z" fill="#5D6A85"/>
          <path fill-rule="evenodd" clip-rule="evenodd" d="M12.5 2C13.3284 2 14 2.67157 14 3.5V12.5C14 13.3284 13.3284 14 12.5 14H3.5C2.67157 14 2 13.3284 2 12.5V3.5C2 2.67157 2.67157 2 3.5 2H12.5ZM3 12.5C3 12.7761 3.22386 13 3.5 13H12.5C12.7761 13 13 12.7761 13 12.5V6H3V12.5ZM3.5 3C3.22386 3 3 3.22386 3 3.5V5H13V3.5C13 3.22386 12.7761 3 12.5 3H3.5Z" fill="#5D6A85"/>
        </svg>
      );
    case 'STAGE':
      return (
        <svg {...iconProps} viewBox="0 0 16 16" fill="currentColor">
          <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/>
          <line x1="8" y1="4" x2="8" y2="20" stroke="currentColor" strokeWidth="2"/>
        </svg>
      );
    case 'DATASET':
      return (
        <svg {...iconProps} viewBox="0 0 16 16" fill="currentColor">
          <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/>
          <line x1="9" y1="9" x2="15" y2="9" stroke="currentColor" strokeWidth="2"/>
          <line x1="9" y1="12" x2="15" y2="12" stroke="currentColor" strokeWidth="2"/>
          <line x1="9" y1="15" x2="15" y2="15" stroke="currentColor" strokeWidth="2"/>
        </svg>
      );
    case 'MODEL':
      return (
        <svg {...iconProps} viewBox="0 0 16 16" fill="currentColor">
          <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/>
          <path d="M9 9h6v6H9z" stroke="currentColor" strokeWidth="2" fill="none"/>
        </svg>
      );
    case 'EXTERNAL':
      return (
        <svg {...iconProps} viewBox="0 0 16 16" fill="currentColor">
          <path d="M6 5H3.5C3.22386 5 3 5.22386 3 5.5V12.5C3 12.7761 3.22386 13 3.5 13H10.5C10.7761 13 11 12.7761 11 12.5V10H12V12.5C12 13.3284 11.3284 14 10.5 14H3.5C2.67157 14 2 13.3284 2 12.5V5.5C2 4.67157 2.67157 4 3.5 4H6V5Z" fill="#5D6A85"/>
          <path d="M13.5 2C13.7761 2 14 2.22386 14 2.5V8H13V3.70703L6.35352 10.3535L5.64648 9.64648L12.293 3H8V2H13.5Z" fill="#5D6A85"/>
        </svg>
      );
    case 'EXT_TABLE':
      return (
        <svg {...iconProps} viewBox="0 0 16 16" fill="currentColor">
          <path d="M13.5 2C13.7761 2 14 2.22386 14 2.5V7H13V3.70703L7.85352 8.85352L7.14648 8.14648L12.293 3H9V2H13.5Z" fill="#5D6A85"/>
          <path fill-rule="evenodd" clip-rule="evenodd" d="M6 13H12.5C12.7761 13 13 12.7761 13 12.5V9H14V12.5C14 13.3284 13.3284 14 12.5 14H3.5C2.67157 14 2 13.3284 2 12.5V3.5C2 2.67157 2.67157 2 3.5 2H7V3H6V5H7V6H6V13ZM5 6H3V12.5C3 12.7761 3.22386 13 3.5 13H5V6ZM3.5 3C3.22386 3 3 3.22386 3 3.5V5H5V3H3.5Z" fill="#5D6A85"/>        
        </svg>
      );
    case 'EXT_STAGE':
      return (
        <svg {...iconProps} viewBox="0 0 16 16" fill="currentColor">
          <path d="M9.5 10C9.77614 10 10 10.2239 10 10.5V14H9V11.707L4.85352 15.8535L4.14648 15.1465L8.29297 11H6V10H9.5Z" fill="#5D6A85"/>
          <path fill-rule="evenodd" clip-rule="evenodd" d="M11.5 3C12.3284 3 12.9999 3.67163 13 4.5V5H13.5C14.3284 5 14.9999 5.67163 15 6.5V11.5C14.9999 12.3284 14.3284 13 13.5 13H12V12H13.5C13.7761 12 13.9999 11.7761 14 11.5V6.5C13.9999 6.22391 13.7761 6 13.5 6H11V7.5C10.9999 7.77609 10.7761 8 10.5 8H5.5C5.2239 8 5.00007 7.77609 5 7.5V6H2.5C2.2239 6 2.00007 6.22391 2 6.5V11.5C2.00007 11.7761 2.2239 12 2.5 12H3V13H2.5C1.67161 13 1.00007 12.3284 1 11.5V6.5C1.00007 5.67163 1.67161 5 2.5 5H3V4.5C3.00007 3.67163 3.67161 3 4.5 3H11.5ZM4.5 4C4.2239 4 4.00007 4.22391 4 4.5V5H5.5C5.7761 5 5.99993 5.22391 6 5.5V7H10V5.5C10.0001 5.22391 10.2239 5 10.5 5H12V4.5C11.9999 4.22391 11.7761 4 11.5 4H4.5Z" fill="#5D6A85"/>
        </svg>
      );  
    default:
      return (
        <svg {...iconProps} viewBox="0 0 16 16" fill="currentColor">
          <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" fill="none"/>
        </svg>
      );
  }
}

function ColumnTypeIcon({ type }: { type: string }) {
  const iconProps = { width: 16, height: 16, style: { marginRight: 4 } };
  
  // Normalize type to handle variations
  const normalizedType = type.toUpperCase();
  
  if (normalizedType.includes('VARCHAR') || normalizedType.includes('TEXT') || normalizedType.includes('STRING')) {
    return (
      <svg {...iconProps} viewBox="0 0 16 16" fill="currentColor">
        <path d="M13 14H3V13H13V14Z" fill="#5D6A85"/>
        <path fill-rule="evenodd" clip-rule="evenodd" d="M8 2C8.19759 2 8.37678 2.11631 8.45703 2.29688L12.3252 11H11.2305L9.89746 8H6.10254L4.76953 11H3.6748L7.54297 2.29688L7.57812 2.23242C7.66888 2.08927 7.82716 2 8 2ZM6.54688 7H9.45312L8 3.73145L6.54688 7Z" fill="#5D6A85"/>
      </svg>
    );
  }
  
  if (normalizedType.includes('INTEGER') || normalizedType.includes('INT') || normalizedType.includes('BIGINT')) {
    return (
      <svg {...iconProps} viewBox="0 0 16 16" fill="currentColor">
        <path fill-rule="evenodd" clip-rule="evenodd" d="M6 5H10V2H11V5H14V6H11V10H14V11H11V14H10V11H6V14H5V11H2V10H5V6H2V5H5V2H6V5ZM6 6V10H10V6H6Z" fill="#5D6A85"/>
      </svg>
    );
  }
  
  if (normalizedType.includes('DECIMAL') || normalizedType.includes('FLOAT') || normalizedType.includes('DOUBLE') || normalizedType.includes('NUMERIC')) {
    return (
      <svg {...iconProps} viewBox="0 0 16 16" fill="currentColor">
        <path fill-rule="evenodd" clip-rule="evenodd" d="M6 5H10V2H11V5H14V6H11V10H14V11H11V14H10V11H6V14H5V11H2V10H5V6H2V5H5V2H6V5ZM6 6V10H10V6H6Z" fill="#5D6A85"/>
      </svg>
    );
  }
  
  if (normalizedType.includes('DATE') || normalizedType.includes('TIME') || normalizedType.includes('TIMESTAMP')) {
    return (
      <svg {...iconProps} viewBox="0 0 16 16" fill="currentColor">
        <path d="M8.5 7.5H12V8.5H8C7.72386 8.5 7.5 8.27614 7.5 8V4H8.5V7.5Z" fill="#5D6A85"/>
        <path fill-rule="evenodd" clip-rule="evenodd" d="M8 1C11.866 1 15 4.13401 15 8C15 11.866 11.866 15 8 15C4.13401 15 1 11.866 1 8C1 4.13401 4.13401 1 8 1ZM8 2C4.68629 2 2 4.68629 2 8C2 11.3137 4.68629 14 8 14C11.3137 14 14 11.3137 14 8C14 4.68629 11.3137 2 8 2Z" fill="#5D6A85"/>
      </svg>
    );
  }
  
  if (normalizedType.includes('JSON') || normalizedType.includes('OBJECT') || normalizedType.includes('ARRAY')) {
    return (
      <svg {...iconProps} viewBox="0 0 16 16" fill="currentColor">
        <path d="M6.35351 4.35352L2.70702 8L6.35351 11.6465L5.64648 12.3535L1.64648 8.35352C1.45121 8.15825 1.45121 7.84175 1.64648 7.64648L5.64648 3.64648L6.35351 4.35352Z" fill="#5D6A85"/>
        <path d="M14.3535 7.64648C14.5487 7.84174 14.5487 8.15826 14.3535 8.35352L10.3535 12.3535L9.64648 11.6465L13.293 8L9.64648 4.35352L10.3535 3.64648L14.3535 7.64648Z" fill="#5D6A85"/>
      </svg>
    );
  }
  
  if (normalizedType.includes('BOOLEAN') || normalizedType.includes('BOOL')) {
    return (
      <svg {...iconProps} viewBox="0 0 16 16" fill="currentColor">
        <path d="M9 13L9 2.5H8L8 13H9Z" fill="#5D6A85"/>
<path d="M13.5 3.75H12.5V4.45984C12.5 4.83022 12.3569 5.01344 12.2079 5.12074C12.0334 5.2464 11.8089 5.29318 11.6667 5.29318L11 5.29322L11.0001 6.29322L11.6667 6.29318C11.8939 6.29317 12.2001 6.24427 12.5 6.10349V10.5H11V11.5H15V10.5H13.5V3.75Z" fill="#5D6A85"/>
<path fill-rule="evenodd" clip-rule="evenodd" d="M1 6.25C1 4.86929 2.11929 3.75 3.5 3.75C4.88071 3.75 6 4.86929 6 6.25V9.5C6 10.8807 4.88071 12 3.5 12C2.11929 12 1 10.8807 1 9.5V6.25ZM5 6.25V9.5C5 10.3284 4.32843 11 3.5 11C2.67157 11 2 10.3284 2 9.5V6.25C2 5.42157 2.67157 4.75 3.5 4.75C4.32843 4.75 5 5.42157 5 6.25Z" fill="#5D6A85"/>
      </svg>
    );
  }
  
  // Default icon for unknown types
  return (
    <svg {...iconProps} viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 15A7 7 0 118 1a7 7 0 010 14zM8 4a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 018 4zm0 8a1 1 0 100-2 1 1 0 000 2z" fill="#6b7280"/>
    </svg>
  );
}

function typeDisplay(t: ObjType) {
  switch (t) {
    case 'TABLE':
      return 'Table';
    case 'VIEW':
      return 'View';
    case 'STAGE':
      return 'Stage';
    case 'DATASET':
      return 'Dataset';
    case 'MODEL':
      return 'Model';
    case 'EXTERNAL':
      return 'External';
    case 'EXT_TABLE':
      return 'External table';
    case 'EXT_STAGE':
      return 'External stage';
    default:
      return 'Object';
  }
}

function DataQualityRating({ score }: { score: number }) {
  const [showPopover, setShowPopover] = useState(false);
  const [hoverTimeout, setHoverTimeout] = useState<number | null>(null);
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    const timeout = window.setTimeout(() => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setPopoverPosition({
          top: rect.bottom + 8, // 8px below the element
          left: rect.left + rect.width / 2, // Center horizontally
        });
      }
      setShowPopover(true);
    }, 400);
    setHoverTimeout(timeout);
  };

  const handleMouseLeave = () => {
    if (hoverTimeout) {
      window.clearTimeout(hoverTimeout);
      setHoverTimeout(null);
    }
    setShowPopover(false);
  };

  useEffect(() => {
    return () => {
      if (hoverTimeout) {
        window.clearTimeout(hoverTimeout);
      }
    };
  }, [hoverTimeout]);

  const getQualityLabel = (score: number) => {
    if (score >= 4.5) return 'Excellent';
    if (score >= 3.5) return 'Good';
    if (score >= 2.5) return 'Fair';
    if (score >= 1.5) return 'Poor';
    return 'Very Poor';
  };

  const getQualityDescription = (score: number) => {
    if (score >= 4.5) return 'Data meets all quality standards with minimal issues.';
    if (score >= 3.5) return 'Data quality is good with minor issues that don\'t impact usage.';
    if (score >= 2.5) return 'Data quality is acceptable but has some issues to monitor.';
    if (score >= 1.5) return 'Data quality has significant issues that may impact analysis.';
    return 'Data quality is poor and requires immediate attention.';
  };

  return (
    <div 
      className="data-quality-rating" 
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ position: 'relative', cursor: 'help' }}
    >
      {Array.from({ length: 5 }, (_, i) => (
        <div
          key={i}
          className={`quality-circle ${i < score ? 'filled' : 'empty'}`}
        />
      ))}
      
      {/* Popover - rendered via portal */}
      {showPopover && createPortal(
        <div
          className="data-quality-popover popover-base popover-data-quality"
          style={{
            position: 'fixed',
            top: `${popoverPosition.top}px`,
            left: `${popoverPosition.left}px`,
            transform: 'translateX(-50%)',
            zIndex: 9999,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: tokens.spacing.xs, color: tokens.colors.text }}>
            Data Quality: {getQualityLabel(score)}
          </div>
          <div style={{ color: tokens.colors.text, marginBottom: tokens.spacing.sm }}>
            Score: {score.toFixed(1)} / 5.0
          </div>
          <div style={{ color: tokens.colors.text, lineHeight: 1.4 }}>
            {getQualityDescription(score)}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

function CombinedErrorWarningIcon({ error, warning }: { error?: string | string[]; warning?: string | string[] }) {
  const [showPopover, setShowPopover] = useState(false);
  const [hoverTimeout, setHoverTimeout] = useState<number | null>(null);
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    const timeout = window.setTimeout(() => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setPopoverPosition({
          top: rect.bottom + 8,
          left: rect.left + rect.width / 2,
        });
      }
      setShowPopover(true);
    }, 400);
    setHoverTimeout(timeout);
  };

  const handleMouseLeave = () => {
    if (hoverTimeout) {
      window.clearTimeout(hoverTimeout);
      setHoverTimeout(null);
    }
    setShowPopover(false);
  };

  useEffect(() => {
    return () => {
      if (hoverTimeout) {
        window.clearTimeout(hoverTimeout);
      }
    };
  }, [hoverTimeout]);

  // Convert messages to arrays for consistent handling
  const errorMessages = error ? (Array.isArray(error) ? error : [error]) : [];
  const warningMessages = warning ? (Array.isArray(warning) ? warning : [warning]) : [];
  
  const hasErrors = errorMessages.length > 0;
  const hasWarnings = warningMessages.length > 0;
  
  if (!hasErrors && !hasWarnings) return null;

  return (
    <div 
      className="error-warning-item combined" 
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ position: 'relative', cursor: 'help', display: 'inline-flex', alignItems: 'center', gap: 8 }}
    >
      {/* Error section */}
      {hasErrors && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M11.3535 5.35352L8.70703 8L11.3535 10.6465L10.6465 11.3535L8 8.70703L5.35352 11.3535L4.64648 10.6465L7.29297 8L4.64648 5.35352L5.35352 4.64648L8 7.29297L10.6465 4.64648L11.3535 5.35352Z" fill="#E32442"/>
          <path fill-rule="evenodd" clip-rule="evenodd" d="M8 1C11.866 1 15 4.13401 15 8C15 11.866 11.866 15 8 15C4.13401 15 1 11.866 1 8C1 4.13401 4.13401 1 8 1ZM8 2C4.68629 2 2 4.68629 2 8C2 11.3137 4.68629 14 8 14C11.3137 14 14 11.3137 14 8C14 4.68629 11.3137 2 8 2Z" fill="#E32442"/>
          </svg>
          <span style={{ fontSize: 12, lineHeight: 1.5, color: '#D3132F' }}>
            {errorMessages.length}
          </span>
        </div>
      )}
      
      {/* Warning section */}
      {hasWarnings && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8.00039 11.5003C8.41445 11.5005 8.75039 11.8362 8.75039 12.2503C8.75028 12.6643 8.41438 13.0001 8.00039 13.0003C7.58625 13.0003 7.2505 12.6644 7.25039 12.2503C7.25039 11.8361 7.58618 11.5003 8.00039 11.5003Z" fill="#F3BE0F"/>
          <path d="M8.50039 10.5003H7.50039V6.00028H8.50039V10.5003Z" fill="#F3BE0F"/>
          <path fill-rule="evenodd" clip-rule="evenodd" d="M6.68008 2.89871C7.24643 1.84691 8.75435 1.84691 9.3207 2.89871L14.6469 12.7893C15.1844 13.7884 14.461 14.9998 13.3266 15.0003H2.67422C1.5395 15 0.81605 13.7885 1.35391 12.7893L6.68008 2.89871ZM8.44082 3.37235C8.25203 3.02178 7.74875 3.02178 7.55996 3.37235L2.23477 13.263C2.05548 13.596 2.29611 14 2.67422 14.0003H13.3266C13.7044 13.9998 13.945 13.5958 13.766 13.263L8.44082 3.37235Z" fill="#F3BE0F"/>
          </svg>
          <span style={{ fontSize: 12, lineHeight: 1.5, color: '#653E03' }}>
            {warningMessages.length}
          </span>
        </div>
      )}
      
      {/* Combined Popover - rendered via portal */}
      {showPopover && createPortal(
        <div
          className="error-warning-popover popover-base"
          style={{
            position: 'fixed',
            top: `${popoverPosition.top}px`,
            left: `${popoverPosition.left}px`,
            transform: 'translateX(-50%)',
            zIndex: 9999,
          }}
        >
          {/* Error Section */}
          {hasErrors && (
            <div style={{ marginBottom: hasWarnings ? 12 : 0 }}>
              <div style={{ fontWeight: 600, marginBottom: 8, color: '#1e252f', display: 'flex', alignItems: 'center', gap: 4 }}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M11.3535 5.35352L8.70703 8L11.3535 10.6465L10.6465 11.3535L8 8.70703L5.35352 11.3535L4.64648 10.6465L7.29297 8L4.64648 5.35352L5.35352 4.64648L8 7.29297L10.6465 4.64648L11.3535 5.35352Z" fill="#E32442"/>
                <path fill-rule="evenodd" clip-rule="evenodd" d="M8 1C11.866 1 15 4.13401 15 8C15 11.866 11.866 15 8 15C4.13401 15 1 11.866 1 8C1 4.13401 4.13401 1 8 1ZM8 2C4.68629 2 2 4.68629 2 8C2 11.3137 4.68629 14 8 14C11.3137 14 14 11.3137 14 8C14 4.68629 11.3137 2 8 2Z" fill="#E32442"/>
                </svg>
                {errorMessages.length > 1 ? `Errors (${errorMessages.length})` : 'Error'}
              </div>
              {errorMessages.map((msg, index) => (
                <div key={`error-${index}`} style={{ marginBottom: index < errorMessages.length - 1 ? 8 : 0 }}>
                  <div style={{ color: '#1e252f', lineHeight: 1.5, marginBottom: 2 }}>
                    {errorMessages.length > 1 && <span>{index + 1}. </span>}
                    {msg}
                  </div>
                </div>
              ))}
              <div style={{ color: '#5d6a85', fontSize: 12, lineHeight: 1.5, marginTop: 6 }}>
                {errorMessages.length > 1 ? 'These errors may impact data quality and should be addressed.' : 'This error may impact data quality and should be addressed.'}
              </div>
            </div>
          )}
          
          {/* Warning Section */}
          {hasWarnings && (
            <div>
              <div style={{ fontWeight: 600, marginBottom: 8, color: '#1e252f', display: 'flex', alignItems: 'center', gap: 4 }}>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8.00039 11.5003C8.41445 11.5005 8.75039 11.8362 8.75039 12.2503C8.75028 12.6643 8.41438 13.0001 8.00039 13.0003C7.58625 13.0003 7.2505 12.6644 7.25039 12.2503C7.25039 11.8361 7.58618 11.5003 8.00039 11.5003Z" fill="#F3BE0F"/>
                <path d="M8.50039 10.5003H7.50039V6.00028H8.50039V10.5003Z" fill="#F3BE0F"/>
                <path fill-rule="evenodd" clip-rule="evenodd" d="M6.68008 2.89871C7.24643 1.84691 8.75435 1.84691 9.3207 2.89871L14.6469 12.7893C15.1844 13.7884 14.461 14.9998 13.3266 15.0003H2.67422C1.5395 15 0.81605 13.7885 1.35391 12.7893L6.68008 2.89871ZM8.44082 3.37235C8.25203 3.02178 7.74875 3.02178 7.55996 3.37235L2.23477 13.263C2.05548 13.596 2.29611 14 2.67422 14.0003H13.3266C13.7044 13.9998 13.945 13.5958 13.766 13.263L8.44082 3.37235Z" fill="#F3BE0F"/>
                </svg>
                {warningMessages.length > 1 ? `Warnings (${warningMessages.length})` : 'Warning'}
              </div>
              {warningMessages.map((msg, index) => (
                <div key={`warning-${index}`} style={{ marginBottom: index < warningMessages.length - 1 ? 8 : 0 }}>
                  <div style={{ color: '#1e252f', lineHeight: 1.4, marginBottom: 2 }}>
                    {warningMessages.length > 1 && <span>{index + 1}. </span>}
                    {msg}
                  </div>
                </div>
              ))}
              <div style={{ color: '#5d6a85', fontSize: 12, lineHeight: 1.5, marginTop: 6 }}>
                {warningMessages.length > 1 ? 'These warnings should be reviewed to ensure data quality.' : 'This warning should be reviewed to ensure data quality.'}
              </div>
            </div>
          )}
          
        </div>,
        document.body
      )}
    </div>
  );
}

function ErrorWarningIcon({ type, message }: { type: 'error' | 'warning'; message: string | string[] }) {
  const [showPopover, setShowPopover] = useState(false);
  const [hoverTimeout, setHoverTimeout] = useState<number | null>(null);
  const [popoverPosition, setPopoverPosition] = useState({ top: 0, left: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    const timeout = window.setTimeout(() => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setPopoverPosition({
          top: rect.bottom + 8,
          left: rect.left + rect.width / 2,
        });
      }
      setShowPopover(true);
    }, 400);
    setHoverTimeout(timeout);
  };

  const handleMouseLeave = () => {
    if (hoverTimeout) {
      window.clearTimeout(hoverTimeout);
      setHoverTimeout(null);
    }
    setShowPopover(false);
  };

  useEffect(() => {
    return () => {
      if (hoverTimeout) {
        window.clearTimeout(hoverTimeout);
      }
    };
  }, [hoverTimeout]);

  // Convert message to array for consistent handling
  const messages = Array.isArray(message) ? message : [message];
  const displayMessage = messages[0]; // Show first message
  const hasMultiple = messages.length > 1;
  const additionalCount = messages.length - 1;

  const iconProps = { width: 16, height: 16, style: { marginRight: 4 } };
  
  if (type === 'error') {
    return (
      <div 
        className="error-warning-item error" 
        ref={containerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{ position: 'relative', cursor: 'help' }}
      >
        <svg {...iconProps} viewBox="0 0 16 16" fill="currentColor">
        <path d="M11.3535 5.35352L8.70703 8L11.3535 10.6465L10.6465 11.3535L8 8.70703L5.35352 11.3535L4.64648 10.6465L7.29297 8L4.64648 5.35352L5.35352 4.64648L8 7.29297L10.6465 4.64648L11.3535 5.35352Z" fill="#E32442"/>
        <path fill-rule="evenodd" clip-rule="evenodd" d="M8 1C11.866 1 15 4.13401 15 8C15 11.866 11.866 15 8 15C4.13401 15 1 11.866 1 8C1 4.13401 4.13401 1 8 1ZM8 2C4.68629 2 2 4.68629 2 8C2 11.3137 4.68629 14 8 14C11.3137 14 14 11.3137 14 8C14 4.68629 11.3137 2 8 2Z" fill="#E32442"/>
        </svg>
        <span className="error-warning-text">
          {displayMessage}
          {hasMultiple && <span> +{additionalCount}</span>}
        </span>
        
        {/* Popover - rendered via portal */}
        {showPopover && createPortal(
          <div
            className="error-warning-popover popover-base popover-error"
            style={{
              position: 'fixed',
              top: `${popoverPosition.top}px`,
              left: `${popoverPosition.left}px`,
              transform: 'translateX(-50%)',
              zIndex: 9999,
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 8, color: '#1e252f', display: 'flex', alignItems: 'center', gap: 4 }}>
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M11.3535 5.35352L8.70703 8L11.3535 10.6465L10.6465 11.3535L8 8.70703L5.35352 11.3535L4.64648 10.6465L7.29297 8L4.64648 5.35352L5.35352 4.64648L8 7.29297L10.6465 4.64648L11.3535 5.35352Z" fill="#E32442"/>
              <path fill-rule="evenodd" clip-rule="evenodd" d="M8 1C11.866 1 15 4.13401 15 8C15 11.866 11.866 15 8 15C4.13401 15 1 11.866 1 8C1 4.13401 4.13401 1 8 1ZM8 2C4.68629 2 2 4.68629 2 8C2 11.3137 4.68629 14 8 14C11.3137 14 14 11.3137 14 8C14 4.68629 11.3137 2 8 2Z" fill="#E32442"/>
              </svg>
              {hasMultiple ? `Errors (${messages.length})` : 'Error'}
            </div>
            {messages.map((msg, index) => (
              <div key={index} style={{ marginBottom: index < messages.length - 1 ? 8 : 0 }}>
                <div style={{ color: '#1e252f', lineHeight: 1.4, marginBottom: 2 }}>
                  {hasMultiple && <span>{index + 1}. </span>}
                  {msg}
                </div>
              </div>
            ))}
            <div style={{ color: '#5d6a85', fontSize: 12, lineHeight: 1.5, marginTop: 8 }}>
              {hasMultiple ? 'These errors may impact data quality and should be addressed.' : 'This error may impact data quality and should be addressed.'}
            </div>
          </div>,
          document.body
        )}
      </div>
    );
  }
  
  return (
    <div 
      className="error-warning-item warning" 
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ position: 'relative', cursor: 'help' }}
    >
      <svg {...iconProps} viewBox="0 0 16 16" fill="currentColor">
      <path d="M8.00039 11.5003C8.41445 11.5005 8.75039 11.8362 8.75039 12.2503C8.75028 12.6643 8.41438 13.0001 8.00039 13.0003C7.58625 13.0003 7.2505 12.6644 7.25039 12.2503C7.25039 11.8361 7.58618 11.5003 8.00039 11.5003Z" fill="#F3BE0F"/>
      <path d="M8.50039 10.5003H7.50039V6.00028H8.50039V10.5003Z" fill="#F3BE0F"/>
      <path fill-rule="evenodd" clip-rule="evenodd" d="M6.68008 2.89871C7.24643 1.84691 8.75435 1.84691 9.3207 2.89871L14.6469 12.7893C15.1844 13.7884 14.461 14.9998 13.3266 15.0003H2.67422C1.5395 15 0.81605 13.7885 1.35391 12.7893L6.68008 2.89871ZM8.44082 3.37235C8.25203 3.02178 7.74875 3.02178 7.55996 3.37235L2.23477 13.263C2.05548 13.596 2.29611 14 2.67422 14.0003H13.3266C13.7044 13.9998 13.945 13.5958 13.766 13.263L8.44082 3.37235Z" fill="#F3BE0F"/>
      </svg>
      <span className="error-warning-text">
        {displayMessage}
        {hasMultiple && <span> +{additionalCount}</span>}
      </span>
      
      {/* Popover - rendered via portal */}
      {showPopover && createPortal(
        <div
          className="error-warning-popover popover-base popover-warning"
          style={{
            position: 'fixed',
            top: `${popoverPosition.top}px`,
            left: `${popoverPosition.left}px`,
            transform: 'translateX(-50%)',
            zIndex: 9999,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 8, color: '#1e252f', display: 'flex', alignItems: 'center', gap: 4 }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path fillRule="evenodd" clipRule="evenodd" d="M6.67978 2.89871C7.24613 1.84691 8.75405 1.84691 9.3204 2.89871L14.6466 12.7893C15.1841 13.7884 14.4607 14.9998 13.3263 15.0003H2.67392C1.53925 15 0.815875 13.7885 1.3536 12.7893L6.67978 2.89871ZM8.00009 11.5003C7.58587 11.5003 7.25009 11.8361 7.25009 12.2503C7.25026 12.6643 7.58598 13.0003 8.00009 13.0003C8.41412 13.0002 8.74992 12.6643 8.75009 12.2503C8.75009 11.8361 8.41422 11.5004 8.00009 11.5003ZM7.50009 6.00028V10.5003H8.50009V6.00028H7.50009Z" fill="#F3BE0F"/>
            </svg>
            {hasMultiple ? `Warnings (${messages.length})` : 'Warning'}
          </div>
          {messages.map((msg, index) => (
            <div key={index} style={{ marginBottom: index < messages.length - 1 ? 8 : 0 }}>
              <div style={{ color: '#1e252f', lineHeight: 1.4, marginBottom: 2 }}>
                {hasMultiple && <span>{index + 1}. </span>}
                {msg}
              </div>
            </div>
          ))}
          <div style={{ color: '#5d6a85', fontSize: 12, lineHeight: 1.5, marginTop: 8 }}>
            {hasMultiple ? 'These warnings should be reviewed to ensure data quality.' : 'This warning should be reviewed to ensure data quality.'}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export function NodeCard({ data }: { data: NodeCardData }) {
  const [childrenListHeight, setChildrenListHeight] = useState<number>(206); // Default height
  const [isAutoExpanded, setIsAutoExpanded] = useState<boolean>(false); // Track if auto-expanded
  const [isDragging, setIsDragging] = useState(false);
  const [searchQuery, setSearchQuery] = useState<string>(''); // Search query for filtering columns
  const dragStartRef = useRef<{ y: number; height: number } | null>(null);
  const lastClickTimeRef = useRef<number>(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isToolbarHovered, setIsToolbarHovered] = useState(false);
  const hoverTimeoutRef = useRef<number | null>(null);

  // Trigger ReactFlow layout recalculation when children list height changes
  useEffect(() => {
    if (data.onLayoutChange && data.childrenExpanded) {
      // Small delay to ensure the DOM has updated before triggering recalculation
      const timer = setTimeout(() => {
        data.onLayoutChange?.();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [childrenListHeight, isAutoExpanded, data.onLayoutChange, data.childrenExpanded]);

  // Cleanup hover timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // Handle node hover with delay
  const handleNodeMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      console.log('Node hover START', data.id);
      setIsHovered(true);
    }, 200);
  };

  const handleNodeMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      if (!isToolbarHovered) {
        console.log('Node hover END', data.id);
        setIsHovered(false);
      }
    }, 200);
  };

  // Handle toolbar hover
  const handleToolbarMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setIsToolbarHovered(true);
    setIsHovered(true);
  };

  const handleToolbarMouseLeave = () => {
    setIsToolbarHovered(false);
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(false);
    }, 200);
  };

  // Determine if toolbars should be visible
  const showToolbars = isHovered || isToolbarHovered || data.selected;

  const handleDoubleClick = () => {
    console.log('Double click detected'); // Debug log
    
    if (isAutoExpanded) {
      // If already auto-expanded, return to default height
      setChildrenListHeight(206);
      setIsAutoExpanded(false);
      console.log('Collapsed to default height');
    } else {
      // Auto-expand to show all children
      setIsAutoExpanded(true);
      console.log('Auto-expanded to show all children');
    }
  };

  const handleSingleClick = () => {
    const now = Date.now();
    const timeSinceLastClick = now - lastClickTimeRef.current;
    lastClickTimeRef.current = now;

    // If clicks are within 300ms, treat as double click
    if (timeSinceLastClick < 300) {
      handleDoubleClick();
      return true; // Indicate this was handled as double click
    }
    return false; // Indicate this was a single click
  };

  const handleDragStart = (e: React.PointerEvent | React.MouseEvent) => {
    // Check if this is a double-click first
    if (handleSingleClick()) {
      // This was handled as a double-click, don't start dragging
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    console.log('Drag start triggered'); // Debug log
    
    // Prevent all possible event propagation
    e.preventDefault();
    e.stopPropagation();
    
    // For React events, also stop native event propagation
    if ('nativeEvent' in e) {
      e.nativeEvent.stopImmediatePropagation();
      e.nativeEvent.preventDefault();
    }
    
    // Capture the pointer to ensure we get all subsequent events
    if ('pointerId' in e && e.currentTarget instanceof Element) {
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    
    // If auto-expanded, start from current default height for dragging
    const startHeight = isAutoExpanded ? 206 : childrenListHeight;
    
    setIsDragging(true);
    dragStartRef.current = {
      y: e.clientY,
      height: startHeight
    };

    const handleDragMove = (e: PointerEvent | MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if ('stopImmediatePropagation' in e) {
        e.stopImmediatePropagation();
      }
      
      if (!dragStartRef.current) return;
      
      const deltaY = e.clientY - dragStartRef.current.y;
      const newHeight = Math.max(80, Math.min(400, dragStartRef.current.height + deltaY));
      
      // Exit auto-expanded mode when user starts dragging
      if (isAutoExpanded) {
        setIsAutoExpanded(false);
        console.log('Exited auto-expanded mode due to drag');
      }
      
      setChildrenListHeight(newHeight);
      console.log('Resizing to:', newHeight); // Debug log
    };

    const handleDragEnd = (e: PointerEvent | MouseEvent) => {
      console.log('Drag end triggered'); // Debug log
      
      e.preventDefault();
      e.stopPropagation();
      if ('stopImmediatePropagation' in e) {
        e.stopImmediatePropagation();
      }
      
      setIsDragging(false);
      dragStartRef.current = null;
      
      // Remove all possible event listeners
      document.removeEventListener('pointermove', handleDragMove as any, true);
      document.removeEventListener('pointerup', handleDragEnd as any, true);
      document.removeEventListener('mousemove', handleDragMove as any, true);
      document.removeEventListener('mouseup', handleDragEnd as any, true);
      document.removeEventListener('pointermove', handleDragMove as any, false);
      document.removeEventListener('pointerup', handleDragEnd as any, false);
      document.removeEventListener('mousemove', handleDragMove as any, false);
      document.removeEventListener('mouseup', handleDragEnd as any, false);
    };

    // Add listeners for both pointer and mouse events to cover all cases
    document.addEventListener('pointermove', handleDragMove as any, true);
    document.addEventListener('pointerup', handleDragEnd as any, true);
    document.addEventListener('mousemove', handleDragMove as any, true);
    document.addEventListener('mouseup', handleDragEnd as any, true);
    document.addEventListener('pointermove', handleDragMove as any, false);
    document.addEventListener('pointerup', handleDragEnd as any, false);
    document.addEventListener('mousemove', handleDragMove as any, false);
    document.addEventListener('mouseup', handleDragEnd as any, false);
  };

  return (
    <>
      {/* NodeToolbar - Top Left (Upstream Toggle) */}
      <NodeToolbar
        isVisible={true}
        position={Position.Left}
        align="center"
        offset={0}
      >
        <div 
          className="node-toolbar node-toolbar-left" 
          style={{ opacity: showToolbars ? 1 : 0, pointerEvents: showToolbars ? 'auto' : 'none' }}
          onMouseEnter={handleToolbarMouseEnter}
          onMouseLeave={handleToolbarMouseLeave}
        >
          <IconButton
            aria-label="Toggle upstream"
            onClick={() => {
              console.log('🔵 Upstream button clicked', data.id, data.upstreamExpanded);
              data.onToggleUpstream?.();
            }}
            size="sm"
            variant="icon"
            level="nodecard"
          >
            {data.upstreamExpanded ? <MinusIcon /> : <PlusIcon />}
          </IconButton>
        </div>
      </NodeToolbar>

      {/* NodeToolbar - Top Right (Downstream Toggle) */}
      <NodeToolbar
        isVisible={true}
        position={Position.Right}
        align="center"
        offset={0}
      >
        <div 
          className="node-toolbar node-toolbar-right" 
          style={{ opacity: showToolbars ? 1 : 0, pointerEvents: showToolbars ? 'auto' : 'none' }}
          onMouseEnter={handleToolbarMouseEnter}
          onMouseLeave={handleToolbarMouseLeave}
        >
          <IconButton
            aria-label="Toggle downstream"
            onClick={() => {
              console.log('🔴 Downstream button clicked', data.id, data.downstreamExpanded);
              data.onToggleDownstream?.();
            }}
            size="sm"
            variant="icon"
            level="nodecard"
          >
            {data.downstreamExpanded ? <MinusIcon /> : <PlusIcon />}
          </IconButton>
        </div>
      </NodeToolbar>

      {/* NodeToolbar - Bottom Center (View/Hide Children) */}
      {data.children && data.children.length > 0 && (
        <NodeToolbar
          isVisible={true}
          position={Position.Bottom}
          align="center"
          offset={0}
        >
          <div 
            className="node-toolbar node-toolbar-bottom" 
            style={{ opacity: showToolbars ? 1 : 0, pointerEvents: showToolbars ? 'auto' : 'none' }}
            onMouseEnter={handleToolbarMouseEnter}
            onMouseLeave={handleToolbarMouseLeave}
          >
            <IconButton
              aria-label={data.childrenExpanded ? "Hide columns" : "View children"}
              onClick={() => data.onToggleChildren?.()}
              size="sm"
              variant="secondary"
              level="nodecard"
            >
              {data.childrenExpanded ? 'Hide columns' : `${data.children.length} columns`}
            </IconButton>
          </div>
        </NodeToolbar>
      )}

      <div 
        className={`${nodeCard.base} ${typeStyle(data.objType)} ${data.selected ? 'selected' : ''}`}
        onMouseEnter={handleNodeMouseEnter}
        onMouseLeave={handleNodeMouseLeave}
      >
        <div className={nodeCard.type}>
          <TypeIcon type={data.objType} />
          {typeDisplay(data.objType)}
        </div>
        
        <div className="node-card-header">
        {data.brandIcon && (
          <img 
            src={data.brandIcon} 
            alt={`${data.label} brand icon`}
            style={{ 
              width: 40, 
              height: 40, 
              objectFit: 'contain',
              borderRadius: 4,
              flexShrink: 0
            }}
            onError={(e) => {
              // Hide the image if it fails to load
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
            }}
          />
        )}
        <div className={nodeCard.top}>
          <div className={nodeCard.row}>
            <div className={nodeCard.label} title={data.label}>
            {data.label}
            </div>
          </div>
          <div className={nodeCard.header} title={data.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              {data.name}
            </div>
          </div>
        </div>
      
      </div>
      {/* Conditional section - priority: errors/warnings > metadata > none */}
      {(data.error || data.warning) ? (
        <div className="node-card-alerts">
          {(data.error && data.warning) ? (
            // Both errors and warnings - use combined format
            <CombinedErrorWarningIcon error={data.error} warning={data.warning} />
          ) : (
            // Only errors OR only warnings - use previous format
            <>
              {data.error && <ErrorWarningIcon type="error" message={data.error} />}
              {data.warning && <ErrorWarningIcon type="warning" message={data.warning} />}
            </>
          )}
        </div>
      ) : (data.dataQualityScore !== undefined) ? (
        <div className="node-card-metadata">
          <DataQualityRating score={data.dataQualityScore} />
          {/* {data.createdTimestamp && (
            <div className="metadata-timestamp">
              Created: {data.createdTimestamp}
            </div>
          )} */}
        </div>
      ) : null}
      
      {/* Children section - shows when expanded */}
      {data.childrenExpanded && data.children && data.children.length > 0 && (
        <div className="node-card-children">
          <div className="children-header">
            <div className="children-search-container">
              <svg className="children-search-icon" width="16" height="16" viewBox="-2 -2 28 28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
              <input
                type="text"
                className="children-search-input"
                placeholder="Columns"
                value={searchQuery}
                onChange={(e) => {
                  e.stopPropagation(); // Prevent event from bubbling to ReactFlow
                  setSearchQuery(e.target.value);
                }}
                onFocus={(e) => e.stopPropagation()} 
                onBlur={(e) => e.stopPropagation()}
                onKeyDown={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
              />
              {searchQuery && (
                <button
                  className="children-search-clear"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSearchQuery('');
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  title="Clear search"
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M8.70717 7.99998L11.8536 4.85356L11.1465 4.14645L8.00006 7.29288L4.85364 4.14645L4.14653 4.85356L7.29295 7.99998L4.14648 11.1465L4.85359 11.8536L8.00006 8.70709L11.1465 11.8536L11.8536 11.1465L8.70717 7.99998Z" fill="#fff"/>
                  </svg>
                </button>
              )}
            </div>
          </div>
          <div 
            className="children-list nopan nodrag"
            style={{ 
              maxHeight: isAutoExpanded ? 'none' : `${childrenListHeight}px`,
              overflow: isAutoExpanded ? 'visible' : 'auto',
              overflowY: isAutoExpanded ? 'visible' : 'auto'
            }}
            onWheel={() => {
              // Clear column lineage when user scrolls
              data.onClearColumnLineage?.();
            }}
          >
            {data.children
              .filter(child => {
                // Filter columns based on search query
                if (!searchQuery.trim()) return true;
                const query = searchQuery.toLowerCase();
                return child.name.toLowerCase().includes(query) || 
                       child.type.toLowerCase().includes(query);
              })
              .map((child, index) => {
                const isSelected = data.selectedChildren?.has(child.name) || false;
                const isFocused = data.focusedChild === child.name;
                const isPrimarySelection = data.selectedChildren?.has(child.name) && 
                  data.selectedChildren?.size === 1; // Only this column is selected in this node
                const isRelatedColumn = isSelected && !isPrimarySelection;
              
              return (
                <div 
                  key={index} 
                  className={`child-item ${isSelected ? 'selected' : ''} ${isFocused ? 'focused' : ''} ${isRelatedColumn ? 'related' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    // First handle selection for lineage
                    data.onSelectChild?.(child.name);
                    // Then handle focus for side panel
                    data.onFocusChild?.(child.name);
                  }}
                  onMouseEnter={() => {
                    data.onHoverChild?.(child.name);
                  }}
                  onMouseLeave={() => {
                    data.onUnhoverChild?.();
                  }}
                >
                  {/* Column input handle */}
                  <Handle
                    type="target"
                    position={Position.Left}
                    id={`${data.id}-${child.name}-in`}
                    className="column-handle column-handle-input"
                    style={{
                      left: 0,
                      top: '50% !important',
                      transform: 'translate(-50%, -50%)',
                      width: 1,
                      height: 1,
                      background: 'transparent',
                      border: 'none'
                    }}
                  />
                  
                  <span className="child-name">
                    <ColumnTypeIcon type={child.type} />
                    {child.name}
                  </span>
                  
                  {/* Column output handle */}
                  <Handle
                    type="source"
                    position={Position.Right}
                    id={`${data.id}-${child.name}-out`}
                    className="column-handle column-handle-output"
                    style={{
                      right: 0,
                      top: '50% !important',
                      transform: 'translate(50%, -50%)',
                      width: 1,
                      height: 1,
                      background: 'transparent',
                      border: 'none'
                    }}
                  />
                </div>
              );
            })}
          </div>
          
          {/* Resize drag handle */}
          <div 
            className={`children-resize-handle ${isDragging ? 'dragging' : ''} ${isAutoExpanded ? 'auto-expanded' : ''}`}
            onPointerDown={handleDragStart}
            onMouseDown={handleDragStart}
            onDragStart={(e) => e.preventDefault()} // Prevent native drag
            title={isAutoExpanded ? "Drag to resize or double-click to collapse" : "Drag to resize or double-click to expand all"}
            style={{
              height: 16,
              cursor: 'ns-resize', // Always show resize cursor since dragging is always available
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: isDragging ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
              borderTop: isDragging ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid transparent',
              transition: 'all 0.15s ease',
              userSelect: 'none',
              touchAction: 'none', // Prevent touch scrolling
              pointerEvents: 'auto' // Ensure we capture pointer events
            }}
          >
            {/* Subtle drag indicator */}
            <div style={{
              width: 20,
              height: 2,
              background: isDragging ? 'rgba(59, 130, 246, 0.6)' : 'rgba(93, 106, 133, 0.3)',
              borderRadius: 1,
              transition: 'all 0.15s ease'
            }} />
          </div>
        </div>
      )}
      
      <Handle 
        type="target" 
        position={Position.Left}
        id={`${data.id}-main-in`}
        className="main-handle main-handle-input"
        style={{
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 10
        }}
      />
      <Handle 
        type="source" 
        position={Position.Right}
        id={`${data.id}-main-out`}
        className="main-handle main-handle-output"
        style={{
          top: '50%',
          transform: 'translateY(-50%)',
          zIndex: 10
        }}
      />
      </div>
    </>
  );
}