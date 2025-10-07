import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import type { LineageNode } from '../lib/types';
import { CATALOG_TREE } from '../lib/catalogData';

type CatalogPanelProps = {
  isOpen: boolean;
  onClose: () => void;
  onAddNode: (node: LineageNode) => void;
  onAddSchema?: (schemaObjects: LineageNode[]) => void;
  onDragStart?: () => void;
};

export function CatalogPanel({ isOpen, onClose, onAddNode, onAddSchema, onDragStart }: CatalogPanelProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedDatabases, setExpandedDatabases] = useState<Set<string>>(new Set(['DW', 'ANALYTICS']));
  const [expandedSchemas, setExpandedSchemas] = useState<Set<string>>(new Set(['DW.SALES']));
  const [isDragging, setIsDragging] = useState(false);

  // Filter catalog tree based on search query
  const filteredTree = useMemo(() => {
    if (!searchQuery.trim()) return CATALOG_TREE;

    const query = searchQuery.toLowerCase();
    return CATALOG_TREE.map(db => ({
      ...db,
      schemas: db.schemas
        .map(schema => ({
          ...schema,
          objects: schema.objects.filter(obj =>
            obj.label.toLowerCase().includes(query) ||
            obj.id.toLowerCase().includes(query) ||
            obj.objType.toLowerCase().includes(query)
          ),
        }))
        .filter(schema => schema.objects.length > 0),
    })).filter(db => db.schemas.length > 0);
  }, [searchQuery]);

  const toggleDatabase = (database: string) => {
    setExpandedDatabases(prev => {
      const next = new Set(prev);
      if (next.has(database)) {
        next.delete(database);
      } else {
        next.add(database);
      }
      return next;
    });
  };

  const toggleSchema = (database: string, schema: string) => {
    const key = `${database}.${schema}`;
    setExpandedSchemas(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleDragStart = (node: LineageNode, e: React.DragEvent) => {
    console.log('Drag started:', node.id);
    e.dataTransfer.setData('application/reactflow', JSON.stringify(node));
    e.dataTransfer.effectAllowed = 'copy';
    
    // Set dragging state to make panel transparent to pointer events
    setIsDragging(true);
    
    // Notify parent that drag started
    onDragStart?.();
  };
  
  const handleDragEnd = () => {
    console.log('Drag ended');
    setIsDragging(false);
  };

  if (!isOpen) return null;

  return createPortal(
    <>
      {/* Backdrop - visual only, allows drag events through, hide when dragging */}
      <div 
        className="catalog-backdrop"
        style={{ 
          pointerEvents: 'none',
          opacity: isDragging ? 0 : 1,
          transition: 'opacity 0.15s ease',
        }}
      />
      
      {/* Panel */}
      <div 
        className="catalog-panel" 
        style={{ 
          pointerEvents: 'auto',
          opacity: isDragging ? 0.6 : 1,
          transition: 'opacity 0.15s ease',
        }}
      >
        {/* Header */}
        <div className="catalog-header">
          <h2 className="catalog-title">Catalog</h2>
          <button 
            className="catalog-close-button"
            onClick={onClose}
            aria-label="Close catalog"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M12.8536 4.85355C13.0488 4.65829 13.0488 4.34171 12.8536 4.14645C12.6583 3.95118 12.3417 3.95118 12.1464 4.14645L8 8.29289L3.85355 4.14645C3.65829 3.95118 3.34171 3.95118 3.14645 4.14645C2.95118 4.34171 2.95118 4.65829 3.14645 4.85355L7.29289 9L3.14645 13.1464C2.95118 13.3417 2.95118 13.6583 3.14645 13.8536C3.34171 14.0488 3.65829 14.0488 3.85355 13.8536L8 9.70711L12.1464 13.8536C12.3417 14.0488 12.6583 14.0488 12.8536 13.8536C13.0488 13.6583 13.0488 13.3417 12.8536 13.1464L8.70711 9L12.8536 4.85355Z" />
            </svg>
          </button>
        </div>

        {/* Search Box */}
        <div className="catalog-search-container">
          <svg 
            className="catalog-search-icon"
            width="16" 
            height="16" 
            viewBox="0 0 16 16" 
            fill="currentColor"
          >
            <path fillRule="evenodd" clipRule="evenodd" d="M10.5 7C10.5 8.933 8.933 10.5 7 10.5C5.067 10.5 3.5 8.933 3.5 7C3.5 5.067 5.067 3.5 7 3.5C8.933 3.5 10.5 5.067 10.5 7ZM9.96974 11.0304C9.10426 11.6446 8.0452 12 6.99999 12C4.23857 12 2 9.76142 2 7C2 4.23858 4.23858 2 7 2C9.76142 2 12 4.23858 12 7C12 8.04522 11.6446 9.10428 11.0303 9.96976L13.8536 12.7931C14.0488 12.9883 14.0488 13.3049 13.8536 13.5002C13.6583 13.6954 13.3417 13.6954 13.1464 13.5002L10.3232 10.677C10.2109 10.5647 10.0989 10.4527 9.96974 11.0304Z" />
          </svg>
          <input
            type="text"
            className="catalog-search-input"
            placeholder="Search objects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              className="catalog-search-clear"
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
                <path d="M12.8536 4.85355C13.0488 4.65829 13.0488 4.34171 12.8536 4.14645C12.6583 3.95118 12.3417 3.95118 12.1464 4.14645L8 8.29289L3.85355 4.14645C3.65829 3.95118 3.34171 3.95118 3.14645 4.14645C2.95118 4.34171 2.95118 4.65829 3.14645 4.85355L7.29289 9L3.14645 13.1464C2.95118 13.3417 2.95118 13.6583 3.14645 13.8536C3.34171 14.0488 3.65829 14.0488 3.85355 13.8536L8 9.70711L12.1464 13.8536C12.3417 14.0488 12.6583 14.0488 12.8536 13.8536C13.0488 13.6583 13.0488 13.3417 12.8536 13.1464L8.70711 9L12.8536 4.85355Z" />
              </svg>
            </button>
          )}
        </div>

        {/* Tree View */}
        <div className="catalog-tree">
          {filteredTree.length === 0 ? (
            <div className="catalog-empty">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
              <p>No objects found</p>
            </div>
          ) : (
            filteredTree.map(db => {
              const dbExpanded = expandedDatabases.has(db.database);
              
              return (
                <div key={db.database} className="catalog-database">
                  {/* Database Level */}
                  <div 
                    className="catalog-database-header"
                    onClick={() => toggleDatabase(db.database)}
                  >
                    <svg 
                      className={`catalog-expand-icon ${dbExpanded ? 'expanded' : ''}`}
                      width="12" 
                      height="12" 
                      viewBox="0 0 16 16" 
                      fill="currentColor"
                    >
                      <path fill-rule="evenodd" clip-rule="evenodd" d="M10.5 7.99999C10.5 7.86738 10.4473 7.7402 10.3536 7.64643L6 3.29288L5.29289 3.99999L9.29289 7.99999L5.29289 12L6 12.7071L10.3536 8.35354C10.4473 8.25977 10.5 8.13259 10.5 7.99999Z" fill="#5D6A85"/>
                    </svg>
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" style={{ marginRight: 6 }}>
                      <path fill-rule="evenodd" clip-rule="evenodd" d="M8.00098 2C9.30446 2.00001 10.5097 2.2626 11.4072 2.71094C12.2747 3.14435 13.0019 3.83649 13.002 4.74902C13.0019 4.80617 12.9997 4.86257 12.9941 4.91797C12.9994 4.97776 13.0019 5.03831 13.002 5.09961V10.9219L12.9961 11.0557L12.9951 11.0674L12.9941 11.0781C12.9133 12.0005 12.2271 12.7362 11.3477 13.2207C10.5661 13.6512 9.56526 13.9255 8.47363 13.9873L8.00098 14.001C6.68637 14.0009 5.47161 13.6938 4.56836 13.1719C3.67831 12.6575 3 11.8724 3 10.9004V5.09961C3.00002 5.037 3.0023 4.9751 3.00781 4.91406C3.0025 4.85993 3.00001 4.80482 3 4.74902C3.00004 3.83654 3.72731 3.14435 4.59473 2.71094C5.49219 2.26258 6.69749 2.00003 8.00098 2ZM12.002 6.42676C11.8172 6.56089 11.6166 6.68153 11.4072 6.78613C10.5097 7.23449 9.30449 7.49706 8.00098 7.49707C6.69744 7.49704 5.4922 7.23452 4.59473 6.78613C4.38534 6.6815 4.18478 6.56093 4 6.42676V10.9004C4 11.3642 4.32962 11.8797 5.06836 12.3066C5.79404 12.7259 6.83008 13.0009 8.00098 13.001L8.41992 12.9893C9.38241 12.9344 10.2332 12.6928 10.8652 12.3447C11.5975 11.9413 11.9537 11.4467 11.9961 10.9971L12.002 10.8789V6.42676ZM8.00098 3C6.83007 3.00004 5.79403 3.27521 5.06836 3.69434C4.43466 4.06041 4.10228 4.49154 4.02051 4.89941C4.09434 5.20354 4.39226 5.56693 5.04199 5.8916C5.77341 6.25697 6.81905 6.49704 8.00098 6.49707C9.18295 6.49706 10.2285 6.25698 10.96 5.8916C11.6096 5.56702 11.9065 5.20351 11.9805 4.89941C11.8986 4.4916 11.5672 4.06035 10.9336 3.69434C10.2986 3.32767 9.42603 3.07113 8.43359 3.0127L8.00098 3Z" fill="#5D6A85"/>
                    </svg>
                    <span className="catalog-database-name">{db.database}</span>
                  </div>

                  {/* Schemas */}
                  {dbExpanded && (
                    <div className="catalog-schemas">
                      <div className={"catalog-tree-line"}></div>
                      {db.schemas.map(schema => {
                        const schemaKey = `${db.database}.${schema.schema}`;
                        const schemaExpanded = expandedSchemas.has(schemaKey);

                        return (
                          <div key={schemaKey} className="catalog-schema">
                            {/* Schema Level */}
                            <div 
                              className="catalog-schema-header"
                              onClick={() => toggleSchema(db.database, schema.schema)}
                            >
                              <svg 
                                className={`catalog-expand-icon ${schemaExpanded ? 'expanded' : ''}`}
                                width="12" 
                                height="12" 
                                viewBox="0 0 16 16" 
                                fill="currentColor"
                              >
                                <path fill-rule="evenodd" clip-rule="evenodd" d="M10.5 7.99999C10.5 7.86738 10.4473 7.7402 10.3536 7.64643L6 3.29288L5.29289 3.99999L9.29289 7.99999L5.29289 12L6 12.7071L10.3536 8.35354C10.4473 8.25977 10.5 8.13259 10.5 7.99999Z" fill="#5D6A85"/>
                              </svg>
                              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor" style={{ marginRight: 6 }}>
                              <path fill-rule="evenodd" clip-rule="evenodd" d="M12.5 2C13.3284 2 14 2.67157 14 3.5V9.5C13.9999 10.3283 13.3283 11 12.5 11H11V12.5C10.9999 13.3283 10.3283 14 9.5 14H3.5C2.67165 14 2.00013 13.3283 2 12.5V6.5C2 5.67157 2.67157 5 3.5 5H5V3.5C5 2.67157 5.67157 2 6.5 2H12.5ZM3 9V12.5C3.00013 12.776 3.22394 13 3.5 13H9.5C9.77606 13 9.99987 12.776 10 12.5V9H3ZM6.5 3C6.22386 3 6 3.22386 6 3.5V5H9.5C10.3284 5 11 5.67157 11 6.5V10H12.5C12.7761 10 12.9999 9.77603 13 9.5V3.5C13 3.22386 12.7761 3 12.5 3H6.5ZM3.5 6C3.22386 6 3 6.22386 3 6.5V8H10V6.5C10 6.22386 9.77614 6 9.5 6H3.5Z" fill="#5D6A85"/>
                              </svg>
                              <span className="catalog-schema-name">{schema.schema}</span>
                              <button
                                className="catalog-add-button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Add all objects in this schema to the graph with proper layout
                                  if (onAddSchema) {
                                    onAddSchema(schema.objects);
                                  } else {
                                    // Fallback to individual adds if onAddSchema not provided
                                    schema.objects.forEach(obj => onAddNode(obj));
                                  }
                                }}
                                title={`Add all objects in ${schema.schema} schema to graph`}
                              >
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                                  <path d="M6.5 1.5H5.5V5.5H1.5V6.5H5.5V10.5H6.5V6.5H10.5V5.5H6.5V1.5Z" />
                                </svg>
                              </button>
                            </div>

                            {/* Objects */}
                            {schemaExpanded && (
                              <div className="catalog-objects">
                                <div className={"catalog-tree-line"}></div>
                                {schema.objects.map(obj => {
                                  const metadata = (obj as any).metadata;
                                  
                                  return (
                                    <div
                                      key={obj.id}
                                      className="catalog-object"
                                      draggable
                                      onDragStart={(e) => handleDragStart(obj, e)}
                                      onDragEnd={handleDragEnd}
                                      title={`${metadata?.fullPath || obj.id}\n${metadata?.description || ''}`}
                                    >
                                      <ObjectIcon type={obj.objType} />
                                      <span className="catalog-object-name">
                                        {obj.label}
                                      </span>
                                      <button
                                        className="catalog-add-button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onAddNode(obj);
                                        }}
                                        title={`Add ${obj.label} to graph`}
                                      >
                                        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                                          <path d="M6.5 1.5H5.5V5.5H1.5V6.5H5.5V10.5H6.5V6.5H10.5V5.5H6.5V1.5Z" />
                                        </svg>
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </>,
    document.body
  );
}

// Object type icons
function ObjectIcon({ type }: { type: string }) {
  const iconProps = { width: 14, height: 14, style: { marginRight: 6, flexShrink: 0 } };
  
  switch (type) {
    case 'TABLE':
      return (
        <svg {...iconProps} viewBox="0 0 16 16" fill="currentColor">
          <path fillRule="evenodd" clipRule="evenodd" d="M12.5 2C13.3284 2 14 2.67157 14 3.5V12.5C14 13.3284 13.3284 14 12.5 14H3.5C2.67157 14 2 13.3284 2 12.5V3.5C2 2.67157 2.67157 2 3.5 2H12.5ZM6 13H12.5C12.7761 13 13 12.7761 13 12.5V6H6V13ZM3 12.5C3 12.7761 3.22386 13 3.5 13H5V6H3V12.5ZM6 5H13V3.5C13 3.22386 12.7761 3 12.5 3H6V5ZM3.5 3C3.22386 3 3 3.22386 3 3.5V5H5V3H3.5Z" fill="#5D6A85"/>
        </svg>
      );
    case 'VIEW':
      return (
        <svg {...iconProps} viewBox="0 0 16 16" fill="currentColor">
          <path d="M9.70703 9.5L7.35352 11.8535L6.64648 11.1465L8.29297 9.5L6.64648 7.85352L7.35352 7.14648L9.70703 9.5Z" fill="#5D6A85"/>
          <path fillRule="evenodd" clipRule="evenodd" d="M12.5 2C13.3284 2 14 2.67157 14 3.5V12.5C14 13.3284 13.3284 14 12.5 14H3.5C2.67157 14 2 13.3284 2 12.5V3.5C2 2.67157 2.67157 2 3.5 2H12.5ZM3 12.5C3 12.7761 3.22386 13 3.5 13H12.5C12.7761 13 13 12.7761 13 12.5V6H3V12.5ZM3.5 3C3.22386 3 3 3.22386 3 3.5V5H13V3.5C13 3.22386 12.7761 3 12.5 3H3.5Z" fill="#5D6A85"/>
        </svg>
      );
    case 'EXTERNAL':
    case 'EXT_TABLE':
    case 'EXT_STAGE':
      return (
        <svg {...iconProps} viewBox="0 0 16 16" fill="currentColor">
          <path d="M6 5H3.5C3.22386 5 3 5.22386 3 5.5V12.5C3 12.7761 3.22386 13 3.5 13H10.5C10.7761 13 11 12.7761 11 12.5V10H12V12.5C12 13.3284 11.3284 14 10.5 14H3.5C2.67157 14 2 13.3284 2 12.5V5.5C2 4.67157 2.67157 4 3.5 4H6V5Z" fill="#5D6A85"/>
          <path d="M13.5 2C13.7761 2 14 2.22386 14 2.5V8H13V3.70703L6.35352 10.3535L5.64648 9.64648L12.293 3H8V2H13.5Z" fill="#5D6A85"/>
        </svg>
      );
    default:
      return (
        <svg {...iconProps} viewBox="0 0 16 16" fill="currentColor">
          <circle cx="8" cy="8" r="2" fill="#5D6A85"/>
        </svg>
      );
  }
}

