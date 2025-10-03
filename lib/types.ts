export type ObjType = 'TABLE' | 'VIEW' | 'STAGE' | 'DATASET' | 'MODEL' | 'EXTERNAL' | 'EXT_TABLE' | 'EXT_STAGE';

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
  children?: Array<{ name: string; type: string }>;
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