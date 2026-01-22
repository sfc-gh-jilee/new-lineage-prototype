import type { DataSource } from '../lib/types';

export type SourceGroupNodeData = {
  id: string;
  source: DataSource;
  width?: number;
  height?: number;
};

/**
 * SourceGroupNode - A visual container for nodes from the same data source
 * Renders as a simple background with a header label
 * 
 * Styling:
 * - External sources (Databricks, Salesforce, etc.): Amber/yellow background
 * - Internal sources (other Snowflake accounts): Blue background
 */
function SourceGroupNode({ data }: { data: SourceGroupNodeData }) {
  const { source } = data;
  
  // External sources get amber/yellow, internal sources get blue
  const isExternal = source.isExternal !== false; // Default to external if not specified
  
  const backgroundColor = isExternal 
    ? 'rgba(236, 183, 0, 0.07)' // Amber for external
    : 'rgba(178, 205, 247, 0.12)'; // Blue for internal (Snowflake accounts)
  
  const hoverBackgroundColor = isExternal
    ? 'rgba(236, 183, 0, 0.12)'
    : 'rgba(178, 205, 247, 0.18)';
  
  return (
    <div 
      className={`source-group-node ${isExternal ? 'external' : 'internal'}`}
      style={{
        width: '100%',
        height: '100%',
        minWidth: 300,
        minHeight: 150,
        position: 'relative',
        borderRadius: 12,
        backgroundColor: backgroundColor,
        border: 'none', // No border as per spec
        // Selected state hidden for now
        boxShadow: 'none',
        transition: 'background-color 0.2s ease',
        overflow: 'visible',
        pointerEvents: 'none', // Allow clicks to pass through to child nodes
      }}
    >
      {/* Header Label - Top Left - this area is interactive for selecting/dragging the group */}
      <div 
        className="source-group-header"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 40, // Header area height
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          pointerEvents: 'all', // Header area captures clicks for group selection/dragging
          cursor: 'grab',
          userSelect: 'none',
          borderRadius: '12px 12px 0 0',
        }}
        onMouseEnter={(e) => {
          const parent = e.currentTarget.parentElement;
          if (parent) parent.style.backgroundColor = hoverBackgroundColor;
        }}
        onMouseLeave={(e) => {
          const parent = e.currentTarget.parentElement;
          if (parent) parent.style.backgroundColor = backgroundColor;
        }}
      >
        {/* Title - matches .node-card-label style */}
        <span style={{
          color: 'var(--text-primary)', // #1e252f
          fontWeight: 500,
          fontSize: 14,
          lineHeight: '20px',
          textTransform: 'uppercase',
        }}>
          {source.name}
        </span>
        {/* Secondary text - matches .node-card-header style */}
        <span style={{
          color: 'var(--text-secondary)', // #5d6a85
          fontSize: 12,
          lineHeight: '16px',
          fontWeight: 400,
        }}>
          · {source.type}
        </span>
      </div>
    </div>
  );
}

export { SourceGroupNode };
