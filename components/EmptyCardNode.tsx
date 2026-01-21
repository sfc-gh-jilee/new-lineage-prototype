import { useState } from 'react';
import { Handle, Position, NodeToolbar } from 'reactflow';
import { tokens } from '../lib/tokens';

export type EmptyCardNodeData = {
  id: string;
  name: string;
  label: string;
  objType: 'EMPTY_CARD';
  title: string;
  path: string;
  description?: string;
  metadata?: {
    dataQualityScore?: number;
    createdTimestamp?: string;
    error?: string | string[];
    warning?: string | string[];
  };
  children?: Array<{ name: string; type: string }>;
  columnsMetadata?: any[];
  brandIcon?: string;
  customFields?: Record<string, any>;
  onUpdateTitle?: (title: string) => void;
  onUpdatePath?: (path: string) => void;
  onUpdateDescription?: (description: string) => void;
  onUpdateMetadata?: (metadata: any) => void;
  onSelectNode?: () => void;
};

function EmptyCardNodeCard({ data }: { data: EmptyCardNodeData }) {
  const [isHovered, setIsHovered] = useState(false);
  const [isToolbarHovered, setIsToolbarHovered] = useState(false);

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    if (!isToolbarHovered) {
      setIsHovered(false);
    }
  };

  const handleToolbarMouseEnter = () => {
    setIsToolbarHovered(true);
    setIsHovered(true);
  };

  const handleToolbarMouseLeave = () => {
    setIsToolbarHovered(false);
    setIsHovered(false);
  };

  const showToolbars = isHovered || isToolbarHovered;

  return (
    <>
      {/* NodeToolbar - Top Center (Configure) */}
      <NodeToolbar
        isVisible={true}
        position={Position.Top}
        align="center"
        offset={0}
      >
        <div 
          className="node-toolbar node-toolbar-top" 
          style={{ 
            opacity: showToolbars ? 1 : 0, 
            pointerEvents: showToolbars ? 'auto' : 'none',
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
            onClick={() => data.onSelectNode?.()}
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
            title="Configure node"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 2C8.55228 2 9 2.44772 9 3V7H13C13.5523 7 14 7.44772 14 8C14 8.55228 13.5523 9 13 9H9V13C9 13.5523 8.55228 14 8 14C7.44772 14 7 13.5523 7 13V9H3C2.44772 9 2 8.55228 2 8C2 7.44772 2.44772 7 3 7H7V3C7 2.44772 7.44772 2 8 2Z" />
            </svg>
            Configure
          </button>
        </div>
      </NodeToolbar>

      <div 
        className="empty-card-container"
        style={{
          background: '#fff',
          border: '2px solid #e2e8f0',
          borderRadius: '8px',
          padding: 16,
          minWidth: 200,
          minHeight: 120,
          cursor: 'move',
          position: 'relative',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
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
          className="empty-card-handle"
          style={{
            background: tokens.colors.primary,
            border: `2px solid ${tokens.colors.background}`,
            width: 12,
            height: 12,
          }}
        />
        <Handle
          type="source"
          position={Position.Right}
          id={`${data.id}-main-out`}
          className="empty-card-handle"
          style={{
            background: tokens.colors.primary,
            border: `2px solid ${tokens.colors.background}`,
            width: 12,
            height: 12,
          }}
        />
        
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 12,
        }}>
          <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor" style={{ color: '#4a5568' }}>
            <path fillRule="evenodd" clipRule="evenodd" d="M2 3C2 2.44772 2.44772 2 3 2H13C13.5523 2 14 2.44772 14 3V13C14 13.5523 13.5523 14 13 14H3C2.44772 14 2 13.5523 2 13V3ZM3 3V13H13V3H3Z" />
            <path d="M5 6H11V7H5V6Z" />
            <path d="M5 8H11V9H5V8Z" />
            <path d="M5 10H9V11H5V10Z" />
          </svg>
          <div>
            <div style={{
              fontWeight: 600,
              fontSize: '16px',
              color: '#1a202c',
              marginBottom: 2,
            }}>
              {data.title || 'Empty Card'}
            </div>
            <div style={{
              fontSize: '14px',
              color: '#718096',
            }}>
              {data.path || 'Configure path...'}
            </div>
          </div>
        </div>
        
        {/* Description */}
        {data.description && (
          <div style={{
            fontSize: '14px',
            color: '#718096',
            lineHeight: 1.4,
            marginBottom: 12,
          }}>
            {data.description}
          </div>
        )}
        
        {/* Metadata Preview */}
        {data.metadata && (
          <div style={{
            fontSize: '12px',
            color: '#718096',
            display: 'flex',
            gap: 12,
            marginTop: 12,
          }}>
            {data.metadata.dataQualityScore && (
              <span>Quality: {data.metadata.dataQualityScore}/5</span>
            )}
            {data.metadata.createdTimestamp && (
              <span>Created: {data.metadata.createdTimestamp}</span>
            )}
            {data.metadata.error && (
              <span style={{ color: '#e53e3e' }}>
                {Array.isArray(data.metadata.error) ? data.metadata.error.length : 1} error(s)
              </span>
            )}
            {data.metadata.warning && (
              <span style={{ color: '#d69e2e' }}>
                {Array.isArray(data.metadata.warning) ? data.metadata.warning.length : 1} warning(s)
              </span>
            )}
          </div>
        )}
        
        {/* Children Preview */}
        {data.children && data.children.length > 0 && (
          <div style={{
            fontSize: '12px',
            color: '#718096',
            marginTop: 12,
          }}>
            {data.children.length} items
          </div>
        )}
        
        {/* Custom Fields Preview */}
        {data.customFields && Object.keys(data.customFields).length > 0 && (
          <div style={{
            fontSize: '12px',
            color: '#718096',
            marginTop: 12,
          }}>
            {Object.keys(data.customFields).length} custom fields
          </div>
        )}
      </div>
    </>
  );
}

export { EmptyCardNodeCard };
