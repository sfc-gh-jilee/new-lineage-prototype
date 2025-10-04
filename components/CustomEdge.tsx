import { EdgeProps, getBezierPath, EdgeLabelRenderer, BaseEdge } from 'reactflow';

type EdgeData = {
  relation?: string;
  isColumnEdge?: boolean;
  isSelected?: boolean;
};

// Define special edge types that need custom labels
const SPECIAL_EDGE_TYPES = {
  'DBT_MODEL': {
    label: 'dbt',
    color: '#FF6B35',
    icon: 'icons/dbt.png', // Path to dbt logo
    description: 'dbt transformation'
  },
  'DBT_SNAPSHOT': {
    label: 'Snapshot',
    color: '#4ECDC4',
    icon: 'icons/dbt.png', // Path to dbt logo
    description: 'dbt snapshot'
  },
  'DBT_SEED': {
    label: 'Seed',
    color: '#45B7D1',
    icon: 'icons/dbt.png', // Path to dbt logo
    description: 'dbt seed'
  },
  'AIRFLOW_PIPELINE': {
    label: 'Airflow',
    color: '#017CEE',
    icon: 'icons/airflow.png', // Path to Airflow logo
    description: 'Airflow pipeline'
  },
  'SPARK_JOB': {
    label: 'Spark',
    color: '#E25A1C',
    icon: 'icons/spark.png', // Path to Spark logo
    description: 'Spark job'
  },
  'FIVETRAN_SYNC': {
    label: 'Fivetran',
    color: '#4C51BF',
    icon: 'icons/fivetran.png', // Path to Fivetran logo
    description: 'Fivetran sync'
  },
  // 'CTAS': {
  //   label: 'CTAS',
  //   color: '#10B981',
  //   icon: '/icons/sql.svg', // Path to SQL icon
  //   description: 'Create Table As Select'
  // },
  // 'MERGE': {
  //   label: 'Merge',
  //   color: '#8B5CF6',
  //   icon: '/icons/sql.svg', // Path to SQL icon
  //   description: 'Merge operation'
  // },
  // 'VIEW DEP': {
  //   label: 'View',
  //   color: '#06B6D4',
  //   icon: '/icons/sql.svg', // Path to SQL icon
  //   description: 'View dependency'
  // }
} as const;

export function CustomEdge({
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data,
  markerEnd,
}: EdgeProps<EdgeData>) {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const relation = data?.relation || '';
  const isColumnEdge = data?.isColumnEdge || false;
  const isSelected = data?.isSelected || false;
  
  // Check if this edge needs a special label
  const specialEdge = SPECIAL_EDGE_TYPES[relation as keyof typeof SPECIAL_EDGE_TYPES];
  
  // Don't show labels for column edges or if no special treatment needed
  const shouldShowLabel = !isColumnEdge && specialEdge;

  // Custom styling for different edge types
  const edgeStyle = {
    ...style,
    strokeWidth: isSelected ? 3 : (specialEdge ? 2 : 1),
    stroke: isSelected ? '#10B981' : (specialEdge?.color || style.stroke || '#b1b1b7'),
    opacity: isSelected ? 1 : 0.8,
  };

  return (
    <>
      <BaseEdge path={edgePath} markerEnd={markerEnd} style={edgeStyle} />
      {shouldShowLabel && (
        <EdgeLabelRenderer>
          <div
            className="edge-label-container nodrag nopan"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            }}
          >
            <div
              className={`edge-label-card ${isSelected ? 'selected' : ''}`}
              title={specialEdge.description}
            >
              <img 
                src={specialEdge.icon} 
                alt={`${specialEdge.label} icon`}
                className="edge-label-icon"
                onError={(e) => {
                  // Fallback to text if image fails to load
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const fallback = target.nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = 'inline';
                }}
              />
              <span className="edge-label-text">
                {specialEdge.label}
              </span>
            </div>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

// Export edge types for ReactFlow
export const customEdgeTypes = {
  default: CustomEdge,
  custom: CustomEdge,
};
