import { useState } from 'react';
import { Handle, Position, NodeToolbar } from 'reactflow';
import { createPortal } from 'react-dom';
// import type { DocumentationNode as DocumentationNodeType } from '../lib/types';
import { tokens } from '../lib/tokens';

export type DocumentationNodeData = {
  id: string;
  name: string;
  label: string;
  objType: 'DOCUMENTATION';
  content: string;
  contentType: 'markdown' | 'html' | 'text';
  title?: string;
  author?: string;
  lastUpdated?: string;
  tags?: string[];
  relatedNodeIds?: string[];
  onSelectNode?: () => void;
  onViewFullContent?: () => void;
};

function DocumentationNodeCard({ data }: { data: DocumentationNodeData }) {
  const [isHovered, setIsHovered] = useState(false);
  const [isToolbarHovered, setIsToolbarHovered] = useState(false);
  const [hoverTimeout, setHoverTimeout] = useState<number | null>(null);
  const [showFullContent, setShowFullContent] = useState(false);

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

  // Truncate content for preview
  const getPreviewContent = () => {
    const maxLength = 150;
    if (data.content.length <= maxLength) {
      return data.content;
    }
    return data.content.substring(0, maxLength) + '...';
  };

  // Simple markdown to HTML conversion for preview
  const renderContent = (content: string) => {
    if (data.contentType === 'html') {
      return { __html: content };
    }
    
    // Simple markdown conversion
    let html = content
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*)\*/gim, '<em>$1</em>')
      .replace(/`(.*)`/gim, '<code>$1</code>')
      .replace(/\n/gim, '<br>');
    
    return { __html: html };
  };

  return (
    <>
      {/* NodeToolbar - Top Center (View Full Content) */}
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
            gap: tokens.spacing.xs,
            padding: `${tokens.spacing.xs} ${tokens.spacing.sm}`,
            background: tokens.colors.background,
            border: `1px solid ${tokens.colors.border}`,
            borderRadius: tokens.radius.sm,
            boxShadow: tokens.shadows.sm
          }}
          onMouseEnter={handleToolbarMouseEnter}
          onMouseLeave={handleToolbarMouseLeave}
        >
          <button
            onClick={() => {
              setShowFullContent(true);
              data.onViewFullContent?.();
            }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: tokens.spacing.xs,
              borderRadius: "4px",
              display: 'flex',
              alignItems: 'center',
              gap: tokens.spacing.xs,
              fontSize: tokens.spacing.sm,
              color: tokens.colors.text,
            }}
            title="View full content"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 2C9.10457 2 10 2.89543 10 4V6H12C13.1046 6 14 6.89543 14 8V12C14 13.1046 13.1046 14 12 14H4C2.89543 14 2 13.1046 2 12V8C2 6.89543 2.89543 6 4 6H6V4C6 2.89543 6.89543 2 8 2ZM8 3C7.44772 3 7 3.44772 7 4V6H9V4C9 3.44772 8.55228 3 8 3ZM4 7C3.44772 7 3 7.44772 3 8V12C3 12.5523 3.44772 13 4 13H12C12.5523 13 13 12.5523 13 12V8C13 7.44772 12.5523 7 12 7H4Z" />
            </svg>
            View Full
          </button>
        </div>
      </NodeToolbar>

      <div 
        className="documentation-node-container"
        style={{
          background: '#fff3cd',
          border: `2px solid #ffeaa7`,
          borderRadius: tokens.radius.md,
          padding: tokens.spacing.md,
          minWidth: 300,
          minHeight: 200,
          cursor: 'move',
          position: 'relative',
          boxShadow: tokens.shadows.sm,
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
          className="documentation-node-handle"
          style={{
            background: tokens.colors.warning,
            border: `2px solid ${tokens.colors.background}`,
            width: 12,
            height: 12,
          }}
        />
        <Handle
          type="source"
          position={Position.Right}
          id={`${data.id}-main-out`}
          className="documentation-node-handle"
          style={{
            background: tokens.colors.warning,
            border: `2px solid ${tokens.colors.background}`,
            width: 12,
            height: 12,
          }}
        />
        
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: tokens.spacing.sm,
          marginBottom: tokens.spacing.sm,
        }}>
          <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor" style={{ color: '#856404' }}>
            <path fillRule="evenodd" clipRule="evenodd" d="M3 2C2.44772 2 2 2.44772 2 3V13C2 13.5523 2.44772 14 3 14H13C13.5523 14 14 13.5523 14 13V6L10 2H3ZM3 3H9V6H12V13H3V3ZM10 5V3.41421L11.5858 5H10Z" />
            <path d="M5 8H11V9H5V8Z" />
            <path d="M5 10H11V11H5V10Z" />
            <path d="M5 12H9V13H5V12Z" />
          </svg>
          <div>
            <div style={{
              fontWeight: 600,
              fontSize: tokens.spacing.lg,
              color: '#856404',
              marginBottom: 2,
            }}>
              {data.title || data.label}
            </div>
            <div style={{
              fontSize: tokens.spacing.sm,
              color: '#6c757d',
            }}>
              Documentation
            </div>
          </div>
        </div>
        
        {/* Metadata */}
        {(data.author || data.lastUpdated) && (
          <div style={{
            fontSize: tokens.spacing.xs,
            color: '#6c757d',
            marginBottom: tokens.spacing.sm,
            display: 'flex',
            gap: tokens.spacing.sm,
          }}>
            {data.author && <span>By {data.author}</span>}
            {data.lastUpdated && <span>Updated {data.lastUpdated}</span>}
          </div>
        )}
        
        {/* Content Preview */}
        <div style={{
          fontSize: tokens.spacing.sm,
          color: '#495057',
          lineHeight: 1.5,
          marginBottom: tokens.spacing.sm,
          maxHeight: 120,
          overflow: 'hidden',
        }}>
          <div dangerouslySetInnerHTML={renderContent(getPreviewContent())} />
        </div>
        
        {/* Tags */}
        {data.tags && data.tags.length > 0 && (
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: tokens.spacing.xs,
            marginTop: tokens.spacing.sm,
          }}>
            {data.tags.map((tag, index) => (
              <span
                key={index}
                style={{
                  background: '#e9ecef',
                  color: '#495057',
                  padding: `${tokens.spacing.xs} ${tokens.spacing.sm}`,
                  borderRadius: "4px",
                  fontSize: tokens.spacing.xs,
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Full Content Modal */}
      {showFullContent && createPortal(
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
          }}
          onClick={() => setShowFullContent(false)}
        >
          <div
            style={{
              background: tokens.colors.background,
              border: `1px solid ${tokens.colors.border}`,
              borderRadius: tokens.radius.lg,
              padding: tokens.spacing.xl,
              maxWidth: '80vw',
              maxHeight: '80vh',
              overflow: 'auto',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowFullContent(false)}
              style={{
                position: 'absolute',
                top: tokens.spacing.md,
                right: tokens.spacing.md,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '1.5em',
                color: tokens.colors.secondary,
              }}
            >
              ×
            </button>
            
            <h1 style={{
              fontSize: tokens.spacing.xl,
              fontWeight: 700,
              marginBottom: tokens.spacing.lg,
              color: tokens.colors.text,
            }}>
              {data.title || data.label}
            </h1>
            
            <div style={{
              fontSize: tokens.spacing.md,
              lineHeight: 1.6,
              color: tokens.colors.text,
            }}>
              <div dangerouslySetInnerHTML={renderContent(data.content)} />
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

export { DocumentationNodeCard };
