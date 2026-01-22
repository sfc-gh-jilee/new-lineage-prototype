import { useState, useEffect } from 'react';
import { Handle, Position, NodeToolbar, NodeResizer, useReactFlow } from 'reactflow';

export type GroupNodeData = {
  id: string;
  name: string;
  label: string;
  objType: 'GROUP';
  description?: string;
  color?: string;
  icon?: string;
  isCollapsed?: boolean;
  width?: number;
  height?: number;
  childCount?: number;
  onToggleCollapse?: () => void;
  onPromoteNode?: (nodeId: string) => void;
  onSelectNode?: () => void;
  onResize?: (width: number, height: number) => void;
  onRemoveGroup?: () => void;
};

const colorThemes = {
  blue: {
    background: '#e3f2fd',
    border: '#2196f3',
    text: '#1565c0',
    header: '#bbdefb',
  },
  green: {
    background: '#e8f5e8',
    border: '#4caf50',
    text: '#2e7d32',
    header: '#c8e6c9',
  },
  purple: {
    background: '#f3e5f5',
    border: '#9c27b0',
    text: '#7b1fa2',
    header: '#e1bee7',
  },
  orange: {
    background: '#fff3e0',
    border: '#ff9800',
    text: '#f57c00',
    header: '#ffcc80',
  },
  gray: {
    background: '#f5f5f5',
    border: '#757575',
    text: '#424242',
    header: '#e0e0e0',
  },
};

function GroupNodeCard({ data, selected, id }: { data: GroupNodeData; selected?: boolean; id: string }) {
  const [isHovered, setIsHovered] = useState(false);
  const [isToolbarHovered, setIsToolbarHovered] = useState(false);
  const [hoverTimeout, setHoverTimeout] = useState<number | null>(null);
  const [childCount, setChildCount] = useState(0);
  const { getNodes } = useReactFlow();

  const theme = colorThemes[data.color as keyof typeof colorThemes] || colorThemes.blue;

  // Count child nodes
  useEffect(() => {
    const nodes = getNodes();
    const children = nodes.filter(n => n.parentId === id);
    setChildCount(children.length);
  }, [getNodes, id]);

  const handleMouseEnter = () => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
    }
    setHoverTimeout(setTimeout(() => {
      setIsHovered(true);
    }, 200));
  };

  const handleMouseLeave = () => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
    }
    setHoverTimeout(setTimeout(() => {
      if (!isToolbarHovered) {
        setIsHovered(false);
      }
    }, 200));
  };

  const handleToolbarMouseEnter = () => {
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
    }
    setIsToolbarHovered(true);
    setIsHovered(true);
  };

  const handleToolbarMouseLeave = () => {
    setIsToolbarHovered(false);
    if (hoverTimeout) {
      clearTimeout(hoverTimeout);
    }
    setHoverTimeout(setTimeout(() => {
      setIsHovered(false);
    }, 200));
  };

  const showToolbars = isHovered || isToolbarHovered;

  const handleResize = (_event: any, params: any) => {
    data.onResize?.(params.width, params.height);
  };

  return (
    <>
      {/* Node Resizer */}
      <NodeResizer
        color={theme.border}
        isVisible={selected || isHovered}
        minWidth={200}
        minHeight={100}
        onResizeStart={() => {}}
        onResizeEnd={() => {}}
        onResize={handleResize}
      />

      {/* NodeToolbar - Top Center (Group Actions) */}
      <NodeToolbar
        isVisible={showToolbars}
        position={Position.Top}
        align="center"
        offset={0}
      >
        <div 
          className="node-toolbar node-toolbar-top" 
          style={{ 
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px',
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}
          onMouseEnter={handleToolbarMouseEnter}
          onMouseLeave={handleToolbarMouseLeave}
        >
          <button
            onClick={() => data.onToggleCollapse?.()}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: '14px',
              color: '#4a5568',
            }}
            title={data.isCollapsed ? "Expand group" : "Collapse group"}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              {data.isCollapsed ? (
                <path d="M8 4C8.55228 4 9 4.44772 9 5V7H11C11.5523 7 12 7.44772 12 8C12 8.55228 11.5523 9 11 9H9V11C9 11.5523 8.55228 12 8 12C7.44772 12 7 11.5523 7 11V9H5C4.44772 9 4 8.55228 4 8C4 7.44772 4.44772 7 5 7H7V5C7 4.44772 7.44772 4 8 4Z" />
              ) : (
                <path d="M4 8C4 7.44772 4.44772 7 5 7H11C11.5523 7 12 7.44772 12 8C12 8.55228 11.5523 9 11 9H5C4.44772 9 4 8.55228 4 8Z" />
              )}
            </svg>
            {data.isCollapsed ? 'Expand' : 'Collapse'}
          </button>

          <button
            onClick={() => data.onRemoveGroup?.()}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontSize: '14px',
              color: '#e53e3e',
            }}
            title="Remove group"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M12.8536 4.85355C13.0488 4.65829 13.0488 4.34171 12.8536 4.14645C12.6583 3.95118 12.3417 3.95118 12.1464 4.14645L8 8.29289L3.85355 4.14645C3.65829 3.95118 3.34171 3.95118 3.14645 4.14645C2.95118 4.34171 2.95118 4.65829 3.14645 4.85355L7.29289 9L3.14645 13.1464C2.95118 13.3417 2.95118 13.6583 3.14645 13.8536C3.34171 14.0488 3.65829 14.0488 3.85355 13.8536L8 9.70711L12.1464 13.8536C12.3417 14.0488 12.6583 14.0488 12.8536 13.8536C13.0488 13.6583 13.0488 13.3417 12.8536 13.1464L8.70711 9L12.8536 4.85355Z" />
            </svg>
            Remove
          </button>
        </div>
      </NodeToolbar>

      {/* NodeToolbar - Top Right (Color Picker) */}
      <NodeToolbar
        isVisible={showToolbars}
        position={Position.Top}
        align="end"
        offset={0}
      >
        <div 
          className="node-toolbar node-toolbar-top-right" 
          style={{ 
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 12px',
            background: '#fff',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}
          onMouseEnter={handleToolbarMouseEnter}
          onMouseLeave={handleToolbarMouseLeave}
        >
          <span style={{ fontSize: '14px', color: '#4a5568' }}>Color:</span>
          <div style={{ display: 'flex', gap: 4 }}>
            {Object.keys(colorThemes).map((color) => (
              <button
                key={color}
                onClick={() => data.color = color}
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  border: `2px solid ${data.color === color ? theme.border : 'transparent'}`,
                  background: colorThemes[color as keyof typeof colorThemes].background,
                  cursor: 'pointer',
                }}
                title={color}
              />
            ))}
          </div>
        </div>
      </NodeToolbar>

      {/* Group Node Container - Uses 100% to fill React Flow's managed dimensions */}
      <div 
        className="group-node-container"
        style={{
          background: theme.background,
          border: `2px solid ${selected ? '#1A6CE7' : theme.border}`,
          borderRadius: '8px',
          width: '100%',
          height: '100%',
          minWidth: 200,
          minHeight: 100,
          cursor: 'move',
          position: 'relative',
          boxShadow: selected 
            ? '0 0 0 2px rgba(26, 108, 231, 0.3), 0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            : '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'visible', // Allow child nodes to be visible
          boxSizing: 'border-box',
        }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={() => data.onSelectNode?.()}
      >
        {/* Handles for connections */}
        <Handle
          type="target"
          position={Position.Left}
          id={`${data.id}-main-in`}
          className="group-node-handle"
          style={{
            background: theme.border,
            border: `2px solid ${theme.background}`,
            width: 12,
            height: 12,
          }}
        />
        <Handle
          type="source"
          position={Position.Right}
          id={`${data.id}-main-out`}
          className="group-node-handle"
          style={{
            background: theme.border,
            border: `2px solid ${theme.background}`,
            width: 12,
            height: 12,
          }}
        />
        
        {/* Header - positioned at top of group */}
        <div style={{
          padding: '8px 12px',
          borderBottom: `1px solid ${theme.border}`,
          background: theme.header,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexShrink: 0,
          borderRadius: '6px 6px 0 0',
        }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style={{ color: theme.text }}>
            <path fillRule="evenodd" clipRule="evenodd" d="M2 3C2 2.44772 2.44772 2 3 2H13C13.5523 2 14 2.44772 14 3V13C14 13.5523 13.5523 14 13 14H3C2.44772 14 2 13.5523 2 13V3ZM3 3V13H13V3H3Z" />
            <path d="M5 6H11V7H5V6Z" />
            <path d="M5 8H11V9H5V8Z" />
            <path d="M5 10H9V11H5V10Z" />
          </svg>
          <span style={{
            fontSize: '14px',
            fontWeight: 600,
            color: theme.text,
            flex: 1,
          }}>
            {data.label || 'Group'}
          </span>
          {childCount > 0 && (
            <div style={{
              fontSize: '12px',
              color: theme.text,
              opacity: 0.7,
              background: theme.background,
              padding: '2px 8px',
              borderRadius: '10px',
            }}>
              {childCount} node{childCount !== 1 ? 's' : ''}
            </div>
          )}
          {data.isCollapsed && (
            <div style={{
              fontSize: '12px',
              color: theme.text,
              opacity: 0.7,
            }}>
              Collapsed
            </div>
          )}
        </div>
        
        {/* Content Area - Child nodes are rendered by React Flow on top of this */}
        <div style={{
          flex: 1,
          padding: 12,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'visible',
          position: 'relative',
          pointerEvents: 'none', // Allow clicks to pass through to child nodes
        }}>
          {data.description && childCount === 0 && (
            <div style={{
              fontSize: '12px',
              color: theme.text,
              opacity: 0.8,
              marginBottom: 8,
              lineHeight: 1.4,
              pointerEvents: 'auto',
            }}>
              {data.description}
            </div>
          )}
          
          {!data.isCollapsed && childCount === 0 && (
            <div style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '12px',
              color: theme.text,
              opacity: 0.6,
              fontStyle: 'italic',
              border: `2px dashed ${theme.border}`,
              borderRadius: '4px',
              padding: '16px',
              textAlign: 'center',
              pointerEvents: 'auto',
            }}>
              Select nodes and click "Group" to add them here
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export { GroupNodeCard };