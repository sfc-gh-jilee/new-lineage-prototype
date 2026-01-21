import { useState, useRef, useEffect } from 'react';
import { Handle, Position, NodeToolbar } from 'reactflow';
import { tokens } from '../lib/tokens';

export type StickyNoteNodeData = {
  id: string;
  name: string;
  label: string;
  objType: 'STICKY_NOTE';
  content: string;
  color: 'yellow' | 'blue' | 'green' | 'pink' | 'purple' | 'orange';
  width: number;
  height: number;
  position: { x: number; y: number };
  onUpdateContent?: (content: string) => void;
  onUpdateColor?: (color: string) => void;
  onResize?: (width: number, height: number) => void;
  onSelectNode?: () => void;
};

const colorThemes = {
  yellow: {
    background: '#fef3c7',
    border: '#f59e0b',
    text: '#92400e',
    shadow: 'rgba(245, 158, 11, 0.2)'
  },
  blue: {
    background: '#dbeafe',
    border: '#3b82f6',
    text: '#1e40af',
    shadow: 'rgba(59, 130, 246, 0.2)'
  },
  green: {
    background: '#d1fae5',
    border: '#10b981',
    text: '#065f46',
    shadow: 'rgba(16, 185, 129, 0.2)'
  },
  pink: {
    background: '#fce7f3',
    border: '#ec4899',
    text: '#be185d',
    shadow: 'rgba(236, 72, 153, 0.2)'
  },
  purple: {
    background: '#e9d5ff',
    border: '#8b5cf6',
    text: '#6b21a8',
    shadow: 'rgba(139, 92, 246, 0.2)'
  },
  orange: {
    background: '#fed7aa',
    border: '#f97316',
    text: '#c2410c',
    shadow: 'rgba(249, 115, 22, 0.2)'
  }
};

function StickyNoteNodeCard({ data }: { data: StickyNoteNodeData }) {
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(data.content);
  const [isResizing, setIsResizing] = useState(false);
  const [dimensions, setDimensions] = useState({ width: data.width, height: data.height });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const resizeRef = useRef<HTMLDivElement>(null);

  const theme = colorThemes[data.color];

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    data.onUpdateContent?.(newContent);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      setIsEditing(false);
    } else if (e.key === 'Escape') {
      setContent(data.content);
      setIsEditing(false);
    }
  };

  const handleBlur = () => {
    setIsEditing(false);
  };

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);

    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = dimensions.width;
    const startHeight = dimensions.height;

    const handleMouseMove = (e: MouseEvent) => {
      const newWidth = Math.max(150, startWidth + (e.clientX - startX));
      const newHeight = Math.max(100, startHeight + (e.clientY - startY));
      setDimensions({ width: newWidth, height: newHeight });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      data.onResize?.(dimensions.width, dimensions.height);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <>
      {/* NodeToolbar - Top Right (Color Picker) */}
      <NodeToolbar
        isVisible={true}
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
        >
          <span style={{ fontSize: '14px', color: '#4a5568' }}>Color:</span>
          <div style={{ display: 'flex', gap: 4 }}>
            {Object.keys(colorThemes).map((color) => (
              <button
                key={color}
                onClick={() => data.onUpdateColor?.(color)}
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

      <div 
        className="sticky-note-container"
        style={{
          background: theme.background,
          border: `2px solid ${theme.border}`,
          borderRadius: tokens.radius.md,
          width: dimensions.width,
          height: dimensions.height,
          cursor: 'move',
          position: 'relative',
          boxShadow: `0 4px 12px ${theme.shadow}`,
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={() => data.onSelectNode?.()}
      >
        {/* Handles for connections */}
        <Handle
          type="target"
          position={Position.Left}
          id={`${data.id}-main-in`}
          className="sticky-note-handle"
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
          className="sticky-note-handle"
          style={{
            background: theme.border,
            border: `2px solid ${theme.background}`,
            width: 12,
            height: 12,
          }}
        />
        
        {/* Header */}
        <div style={{
          padding: 12,
          borderBottom: `1px solid ${theme.border}`,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style={{ color: theme.text }}>
            <path d="M3 2C2.44772 2 2 2.44772 2 3V13C2 13.5523 2.44772 14 3 14H13C13.5523 14 14 13.5523 14 13V6L10 2H3ZM3 3H9V6H12V13H3V3ZM10 5V3.41421L11.5858 5H10Z" />
            <path d="M5 8H11V9H5V8Z" />
            <path d="M5 10H11V11H5V10Z" />
            <path d="M5 12H9V13H5V12Z" />
          </svg>
          <span style={{
            fontSize: '14px',
            fontWeight: 600,
            color: theme.text,
          }}>
            Sticky Note
          </span>
        </div>
        
        {/* Content Area */}
        <div style={{
          flex: 1,
          padding: 12,
          display: 'flex',
          flexDirection: 'column',
        }}>
          {isEditing ? (
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                outline: 'none',
                resize: 'none',
                fontSize: '14px',
                color: theme.text,
                fontFamily: 'inherit',
                lineHeight: 1.4,
              }}
              placeholder="Enter your note..."
            />
          ) : (
            <div
              onClick={() => setIsEditing(true)}
              style={{
                flex: 1,
                fontSize: '14px',
                color: theme.text,
                lineHeight: 1.4,
                cursor: 'text',
                minHeight: 60,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {content || 'Click to add note...'}
            </div>
          )}
        </div>
        
        {/* Resize Handle */}
        <div
          ref={resizeRef}
          onMouseDown={handleResizeStart}
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: 12,
            height: 12,
            cursor: 'nw-resize',
            background: theme.border,
            borderRadius: '0 0 4px 0',
            opacity: isResizing ? 1 : 0.7,
          }}
        />
      </div>
    </>
  );
}

export { StickyNoteNodeCard };
