export type ObjType = 'TABLE' | 'VIEW' | 'STAGE' | 'DATASET' | 'MODEL' | 'EXTERNAL' | 'EXT_TABLE' | 'EXT_STAGE' | 'GROUP' | 'DOCUMENTATION' | 'STICKY_NOTE' | 'EMPTY_CARD';

export type ColumnMetadata = {
  name: string;
  type: string;
  description?: string;
  nullable?: boolean;
  primaryKey?: boolean;
  foreignKey?: string; // Reference to another table.column
  defaultValue?: string;
  constraints?: string[];
  tags?: string[];
  dataQualityScore?: number;
  lastUpdated?: string;
  sampleValues?: string[];
  statistics?: {
    uniqueCount?: number;
    nullCount?: number;
    avgLength?: number;
    minValue?: string;
    maxValue?: string;
  };
};

export type LineageNode = {
  id: string;
  name: string;
  label: string;
  objType: ObjType;
  hasUpstream: boolean;
  hasDownstream: boolean;
  dataQualityScore?: number;
  createdTimestamp?: string;
  error?: string | string[];
  warning?: string | string[];
  children?: Array<{ name: string; type: string }>; // Simple version for display
  columnsMetadata?: ColumnMetadata[]; // Detailed version for side panel
  brandIcon?: string; // Path to brand icon for external nodes
};

export type LineageEdge = {
  id: string;
  source: string;
  target: string;
  relation?: string;
};

export type ColumnLineageEdge = {
  id: string;
  sourceTable: string;
  sourceColumn: string;
  targetTable: string;
  targetColumn: string;
  relation?: string;
};


export type GroupNode = {
  id: string;
  name: string;
  label: string;
  objType: 'GROUP';
  description?: string;
  groupedNodeIds: string[];
  color?: string;
  icon?: string;
  isCollapsed?: boolean;
};

export type DocumentationNode = {
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
};

export type StickyNoteNode = {
  id: string;
  name: string;
  label: string;
  objType: 'STICKY_NOTE';
  content: string;
  color: 'yellow' | 'blue' | 'green' | 'pink' | 'purple' | 'orange';
  width: number;
  height: number;
  position: { x: number; y: number };
};

export type EmptyCardNode = {
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
  columnsMetadata?: ColumnMetadata[];
  brandIcon?: string;
  customFields?: Record<string, any>;
};
