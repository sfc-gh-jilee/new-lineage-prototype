export type ObjType = 'TABLE' | 'VIEW' | 'STAGE' | 'DATASET' | 'MODEL' | 'EXTERNAL' | 'EXT_TABLE' | 'EXT_STAGE';

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