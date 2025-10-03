import type { LineageEdge, LineageNode, ObjType, ColumnLineageEdge } from './types';

type RelEdge = LineageEdge;

function n(
  id: string, 
  label: string, 
  objType: ObjType,
  dataQualityScore?: number,
  createdTimestamp?: string,
  error?: string | string[],
  warning?: string | string[],
  children?: Array<{ name: string; type: string }>,
  brandIcon?: string
): LineageNode {
  return { 
    id, 
    name: id, 
    label, 
    objType, 
    hasUpstream: true, 
    hasDownstream: true,
    dataQualityScore,
    createdTimestamp,
    error,
    warning,
    children,
    brandIcon
  };
}
function e(source: string, target: string, relation?: string): RelEdge {
  return { id: `${source}->${target}`, source, target, relation };
}

export const ALL_NODES: LineageNode[] = [
  // External upstream data sources
  n('EXT.DATABRICKS.CUSTOMER_DATA', 'Customer Analytics', 'EXT_TABLE', undefined, '2024-01-01', undefined, undefined, [
    { name: 'customer_segments', type: 'VARCHAR' },
    { name: 'lifetime_value', type: 'DECIMAL' },
    { name: 'churn_probability', type: 'DECIMAL' },
    { name: 'last_activity', type: 'TIMESTAMP' }
  ], '/icons/databricks-logo.png'),
  n('EXT.SALESFORCE.LEADS', 'Salesforce Leads', 'EXT_STAGE', undefined, '2024-01-01', undefined, undefined, [
    { name: 'lead_id', type: 'VARCHAR' },
    { name: 'company', type: 'VARCHAR' },
    { name: 'email', type: 'VARCHAR' },
    { name: 'status', type: 'VARCHAR' },
    { name: 'created_date', type: 'TIMESTAMP' }
  ], '/icons/salesforce-logo.png'),
  n('EXT.STRIPE.PAYMENTS', 'Stripe Payments', 'EXT_TABLE', undefined, '2024-01-01', undefined, undefined, [
    { name: 'payment_id', type: 'VARCHAR' },
    { name: 'customer_id', type: 'VARCHAR' },
    { name: 'amount', type: 'DECIMAL' },
    { name: 'currency', type: 'VARCHAR' },
    { name: 'status', type: 'VARCHAR' }
  ], '/icons/stripe-logo.png'),

  // Raw data tables - lower quality scores, some with warnings
  n('RAW.PUBLIC.ORDERS_RAW', 'ORDERS_RAW', 'TABLE', 2, '2024-01-10', undefined, ['Missing timestamps', 'Inconsistent date formats', 'Null values in required fields'], [
    { name: 'order_id', type: 'VARCHAR' },
    { name: 'customer_id', type: 'VARCHAR' },
    { name: 'product_id', type: 'VARCHAR' },
    { name: 'quantity', type: 'INTEGER' },
    { name: 'order_date', type: 'TIMESTAMP' }
  ]),
  n('RAW.PUBLIC.CUSTOMERS_RAW', 'CUSTOMERS_RAW', 'TABLE', 3, '2024-01-10', ['Schema validation failed', 'Invalid foreign key references'], ['Duplicate records', 'Missing email validation'], [
    { name: 'customer_id', type: 'VARCHAR' },
    { name: 'first_name', type: 'VARCHAR' },
    { name: 'last_name', type: 'VARCHAR' },
    { name: 'email', type: 'VARCHAR' },
    { name: 'phone', type: 'VARCHAR' },
    { name: 'address', type: 'VARCHAR' }
  ]),
  n('RAW.PUBLIC.PRODUCTS_RAW', 'PRODUCTS_RAW', 'TABLE', 4, '2024-01-10', undefined, undefined, [
    { name: 'product_id', type: 'VARCHAR' },
    { name: 'product_name', type: 'VARCHAR' },
    { name: 'category', type: 'VARCHAR' },
    { name: 'price', type: 'DECIMAL' },
    { name: 'description', type: 'TEXT' }
  ]),
  n('RAW.PUBLIC.PAYMENTS_RAW', 'PAYMENTS_RAW', 'TABLE', 1, '2024-01-10', ['Connection failed', 'Data validation errors', 'Missing primary keys'], undefined, [
    { name: 'payment_id', type: 'VARCHAR' },
    { name: 'order_id', type: 'VARCHAR' },
    { name: 'amount', type: 'DECIMAL' },
    { name: 'payment_method', type: 'VARCHAR' },
    { name: 'status', type: 'VARCHAR' }
  ]),
  n('RAW.PUBLIC.EVENTS_RAW', 'EVENTS_RAW', 'TABLE', 3, '2024-01-10', undefined, 'Schema drift', [
    { name: 'event_id', type: 'VARCHAR' },
    { name: 'user_id', type: 'VARCHAR' },
    { name: 'event_type', type: 'VARCHAR' },
    { name: 'timestamp', type: 'TIMESTAMP' },
    { name: 'properties', type: 'JSON' }
  ]),
  
  // Staging tables - better quality scores
  n('STG.PUBLIC.ORDERS_STG', 'ORDERS_STG', 'TABLE', 4, '2024-01-15', undefined, undefined, [
    { name: 'order_id', type: 'VARCHAR' },
    { name: 'customer_id', type: 'VARCHAR' },
    { name: 'product_id', type: 'VARCHAR' },
    { name: 'quantity', type: 'INTEGER' },
    { name: 'order_date', type: 'TIMESTAMP' },
    { name: 'total_amount', type: 'DECIMAL' },
    { name: 'status', type: 'VARCHAR' }
  ]),
  n('STG.PUBLIC.CUSTOMERS_STG', 'CUSTOMERS_STG', 'TABLE', 5, '2024-01-15', undefined, undefined, [
    { name: 'customer_id', type: 'VARCHAR' },
    { name: 'first_name', type: 'VARCHAR' },
    { name: 'last_name', type: 'VARCHAR' },
    { name: 'email', type: 'VARCHAR' },
    { name: 'phone', type: 'VARCHAR' },
    { name: 'address', type: 'VARCHAR' },
    { name: 'created_at', type: 'TIMESTAMP' },
    { name: 'updated_at', type: 'TIMESTAMP' }
  ]),
  n('STG.PUBLIC.PRODUCTS_STG', 'PRODUCTS_STG', 'TABLE', 4, '2024-01-15', 'Schema validation failed', 'Slow refresh', [
    { name: 'product_id', type: 'VARCHAR' },
    { name: 'product_name', type: 'VARCHAR' },
    { name: 'category', type: 'VARCHAR' },
    { name: 'price', type: 'DECIMAL' },
    { name: 'description', type: 'TEXT' },
    { name: 'inventory_count', type: 'INTEGER' },
    { name: 'created_at', type: 'TIMESTAMP' },
    { name: 'updated_at', type: 'TIMESTAMP' }
  ]),
  n('STG.PUBLIC.PAYMENTS_STG', 'PAYMENTS_STG', 'TABLE', 3, '2024-01-15', 'Data validation error', undefined, [
    { name: 'payment_id', type: 'VARCHAR' },
    { name: 'order_id', type: 'VARCHAR' },
    { name: 'amount', type: 'DECIMAL' },
    { name: 'payment_method', type: 'VARCHAR' },
    { name: 'status', type: 'VARCHAR' },
    { name: 'transaction_id', type: 'VARCHAR' },
    { name: 'processed_at', type: 'TIMESTAMP' }
  ]),
  n('STG.PUBLIC.EVENTS_STG', 'EVENTS_STG', 'TABLE', 4, '2024-01-15', undefined, undefined, [
    { name: 'event_id', type: 'VARCHAR' },
    { name: 'user_id', type: 'VARCHAR' },
    { name: 'event_type', type: 'VARCHAR' },
    { name: 'timestamp', type: 'TIMESTAMP' },
    { name: 'properties', type: 'JSON' },
    { name: 'session_id', type: 'VARCHAR' },
    { name: 'ip_address', type: 'VARCHAR' }
  ]),
  
  // Data warehouse tables - high quality scores
  n('DW.PUBLIC.DIM_CUSTOMER', 'DIM_CUSTOMER', 'TABLE', 5, '2024-01-20', undefined, undefined, [
    { name: 'customer_key', type: 'INTEGER' },
    { name: 'customer_id', type: 'VARCHAR' },
    { name: 'first_name', type: 'VARCHAR' },
    { name: 'last_name', type: 'VARCHAR' },
    { name: 'email', type: 'VARCHAR' },
    { name: 'phone', type: 'VARCHAR' },
    { name: 'address', type: 'VARCHAR' },
    { name: 'city', type: 'VARCHAR' },
    { name: 'state', type: 'VARCHAR' },
    { name: 'zip_code', type: 'VARCHAR' },
    { name: 'created_at', type: 'TIMESTAMP' },
    { name: 'updated_at', type: 'TIMESTAMP' }
  ]),
  n('DW.PUBLIC.DIM_PRODUCT', 'DIM_PRODUCT', 'TABLE', 5, '2024-01-20', undefined, undefined, [
    { name: 'product_key', type: 'INTEGER' },
    { name: 'product_id', type: 'VARCHAR' },
    { name: 'product_name', type: 'VARCHAR' },
    { name: 'category', type: 'VARCHAR' },
    { name: 'subcategory', type: 'VARCHAR' },
    { name: 'brand', type: 'VARCHAR' },
    { name: 'price', type: 'DECIMAL' },
    { name: 'cost', type: 'DECIMAL' },
    { name: 'weight', type: 'DECIMAL' },
    { name: 'dimensions', type: 'VARCHAR' },
    { name: 'created_at', type: 'TIMESTAMP' },
    { name: 'updated_at', type: 'TIMESTAMP' }
  ]),
  n('DW.PUBLIC.FCT_ORDERS', 'FCT_ORDERS', 'TABLE', 4, '2024-01-20', undefined, 'Large table', [
    { name: 'order_key', type: 'INTEGER' },
    { name: 'order_id', type: 'VARCHAR' },
    { name: 'customer_key', type: 'INTEGER' },
    { name: 'product_key', type: 'INTEGER' },
    { name: 'order_date', type: 'DATE' },
    { name: 'quantity', type: 'INTEGER' },
    { name: 'unit_price', type: 'DECIMAL' },
    { name: 'total_amount', type: 'DECIMAL' },
    { name: 'discount', type: 'DECIMAL' },
    { name: 'tax', type: 'DECIMAL' },
    { name: 'status', type: 'VARCHAR' }
  ]),
  n('DW.PUBLIC.FCT_REVENUE', 'FCT_REVENUE', 'TABLE', 5, '2024-01-20', undefined, undefined, [
    { name: 'revenue_key', type: 'INTEGER' },
    { name: 'customer_key', type: 'INTEGER' },
    { name: 'product_key', type: 'INTEGER' },
    { name: 'date', type: 'DATE' },
    { name: 'gross_revenue', type: 'DECIMAL' },
    { name: 'net_revenue', type: 'DECIMAL' },
    { name: 'cost_of_goods', type: 'DECIMAL' },
    { name: 'profit_margin', type: 'DECIMAL' },
    { name: 'order_count', type: 'INTEGER' }
  ]),
  n('DW.PUBLIC.FCT_EVENTS', 'FCT_EVENTS', 'TABLE', 4, '2024-01-20', undefined, undefined, [
    { name: 'event_key', type: 'INTEGER' },
    { name: 'event_id', type: 'VARCHAR' },
    { name: 'user_key', type: 'INTEGER' },
    { name: 'event_type', type: 'VARCHAR' },
    { name: 'event_date', type: 'DATE' },
    { name: 'event_timestamp', type: 'TIMESTAMP' },
    { name: 'session_id', type: 'VARCHAR' },
    { name: 'page_url', type: 'VARCHAR' },
    { name: 'referrer', type: 'VARCHAR' },
    { name: 'device_type', type: 'VARCHAR' }
  ]),
  
  // Analytics tables and views
  n('ANALYTICS.PUBLIC.MRR', 'MRR', 'TABLE', 5, '2024-01-25', undefined, undefined, [
    { name: 'customer_id', type: 'VARCHAR' },
    { name: 'month', type: 'DATE' },
    { name: 'mrr', type: 'DECIMAL' },
    { name: 'arr', type: 'DECIMAL' },
    { name: 'churn_rate', type: 'DECIMAL' },
    { name: 'growth_rate', type: 'DECIMAL' },
    { name: 'plan_type', type: 'VARCHAR' },
    { name: 'calculated_at', type: 'TIMESTAMP' }
  ]),
  n('ANALYTICS.PUBLIC.LTV_VIEW', 'LTV_VIEW', 'VIEW', 4, '2024-01-25', undefined, 'Complex query', [
    { name: 'customer_id', type: 'VARCHAR' },
    { name: 'ltv', type: 'DECIMAL' },
    { name: 'avg_order_value', type: 'DECIMAL' },
    { name: 'purchase_frequency', type: 'DECIMAL' },
    { name: 'customer_age_days', type: 'INTEGER' },
    { name: 'total_orders', type: 'INTEGER' },
    { name: 'last_order_date', type: 'DATE' },
    { name: 'segment', type: 'VARCHAR' }
  ]),
  n('ANALYTICS.PUBLIC.SALES_DASH', 'SALES_DASH', 'VIEW', 5, '2024-01-25', undefined, undefined, [
    { name: 'date', type: 'DATE' },
    { name: 'total_revenue', type: 'DECIMAL' },
    { name: 'total_orders', type: 'INTEGER' },
    { name: 'avg_order_value', type: 'DECIMAL' },
    { name: 'new_customers', type: 'INTEGER' },
    { name: 'returning_customers', type: 'INTEGER' },
    { name: 'conversion_rate', type: 'DECIMAL' },
    { name: 'top_product', type: 'VARCHAR' },
    { name: 'top_category', type: 'VARCHAR' }
  ]),

  // External downstream data destinations (BI Tools)
  n('EXT.POWERBI.SALES_DASHBOARD', 'Sales Dashboard', 'EXTERNAL', undefined, '2024-01-20', undefined, undefined, [
    { name: 'total_revenue', type: 'DECIMAL' },
    { name: 'sales_by_region', type: 'JSON' },
    { name: 'top_products', type: 'JSON' },
    { name: 'monthly_trends', type: 'JSON' }
  ], '/icons/powerbi-logo.svg'),
  n('EXT.TABLEAU.EXECUTIVE_REPORTS', 'Executive Reports', 'EXTERNAL', undefined, '2024-01-20', undefined, undefined, [
    { name: 'kpi_metrics', type: 'JSON' },
    { name: 'performance_indicators', type: 'JSON' },
    { name: 'comparative_analysis', type: 'JSON' }
  ], '/icons/tableau-logo.svg'),
  n('EXT.LOOKER.CUSTOMER_INSIGHTS', 'Customer 360 View', 'EXTERNAL', undefined, '2024-01-20', undefined, undefined, [
    { name: 'customer_lifetime_value', type: 'DECIMAL' },
    { name: 'segmentation_data', type: 'JSON' },
    { name: 'behavior_patterns', type: 'JSON' }
  ], '/icons/looker-logo.png'),
];

export const ALL_EDGES: RelEdge[] = [
  // External upstream connections
  e('EXT.DATABRICKS.CUSTOMER_DATA', 'RAW.PUBLIC.CUSTOMERS_RAW', 'DATABRICKS_SYNC'),
  e('EXT.SALESFORCE.LEADS', 'RAW.PUBLIC.CUSTOMERS_RAW', 'SALESFORCE_SYNC'),
  e('EXT.STRIPE.PAYMENTS', 'RAW.PUBLIC.PAYMENTS_RAW', 'STRIPE_WEBHOOK'),

  // Existing internal data flow
  e('RAW.PUBLIC.ORDERS_RAW', 'STG.PUBLIC.ORDERS_STG', 'FIVETRAN_SYNC'),
  e('RAW.PUBLIC.CUSTOMERS_RAW', 'STG.PUBLIC.CUSTOMERS_STG', 'FIVETRAN_SYNC'),
  e('RAW.PUBLIC.PRODUCTS_RAW', 'STG.PUBLIC.PRODUCTS_STG', 'COPY INTO'),
  e('RAW.PUBLIC.PAYMENTS_RAW', 'STG.PUBLIC.PAYMENTS_STG', 'AIRFLOW_PIPELINE'),
  e('RAW.PUBLIC.EVENTS_RAW', 'STG.PUBLIC.EVENTS_STG', 'SPARK_JOB'),
  e('STG.PUBLIC.ORDERS_STG', 'DW.PUBLIC.FCT_ORDERS', 'DBT_MODEL'),
  e('STG.PUBLIC.PAYMENTS_STG', 'DW.PUBLIC.FCT_REVENUE', 'DBT_MODEL'),
  e('STG.PUBLIC.CUSTOMERS_STG', 'DW.PUBLIC.DIM_CUSTOMER', 'DBT_SNAPSHOT'),
  e('STG.PUBLIC.PRODUCTS_STG', 'DW.PUBLIC.DIM_PRODUCT', 'MERGE'),
  e('STG.PUBLIC.EVENTS_STG', 'DW.PUBLIC.FCT_EVENTS', 'CTAS'),
  e('DW.PUBLIC.FCT_REVENUE', 'ANALYTICS.PUBLIC.MRR', 'DBT_MODEL'),
  e('DW.PUBLIC.FCT_ORDERS', 'ANALYTICS.PUBLIC.SALES_DASH', 'VIEW DEP'),
  e('DW.PUBLIC.DIM_CUSTOMER', 'ANALYTICS.PUBLIC.LTV_VIEW', 'VIEW DEP'),
  e('DW.PUBLIC.FCT_ORDERS', 'ANALYTICS.PUBLIC.LTV_VIEW', 'DBT_MODEL'),

  // External downstream connections
  e('ANALYTICS.PUBLIC.SALES_DASH', 'EXT.POWERBI.SALES_DASHBOARD', 'POWERBI_EXPORT'),
  e('ANALYTICS.PUBLIC.LTV_VIEW', 'EXT.TABLEAU.EXECUTIVE_REPORTS', 'TABLEAU_EXPORT'),
  e('ANALYTICS.PUBLIC.MRR', 'EXT.TABLEAU.EXECUTIVE_REPORTS', 'TABLEAU_EXPORT'),
  e('DW.PUBLIC.DIM_CUSTOMER', 'EXT.LOOKER.CUSTOMER_INSIGHTS', 'LOOKER_EXPORT'),
];

export const ROOT_NODE_ID = 'DW.PUBLIC.FCT_ORDERS';

// Column lineage relationships
export const COLUMN_LINEAGE: ColumnLineageEdge[] = [
  // RAW to STG column mappings
  { id: 'col-1', sourceTable: 'RAW.PUBLIC.ORDERS_RAW', sourceColumn: 'order_id', targetTable: 'STG.PUBLIC.ORDERS_STG', targetColumn: 'order_id', relation: 'DIRECT_COPY' },
  { id: 'col-2', sourceTable: 'RAW.PUBLIC.ORDERS_RAW', sourceColumn: 'customer_id', targetTable: 'STG.PUBLIC.ORDERS_STG', targetColumn: 'customer_id', relation: 'DIRECT_COPY' },
  { id: 'col-3', sourceTable: 'RAW.PUBLIC.ORDERS_RAW', sourceColumn: 'product_id', targetTable: 'STG.PUBLIC.ORDERS_STG', targetColumn: 'product_id', relation: 'DIRECT_COPY' },
  { id: 'col-4', sourceTable: 'RAW.PUBLIC.ORDERS_RAW', sourceColumn: 'quantity', targetTable: 'STG.PUBLIC.ORDERS_STG', targetColumn: 'quantity', relation: 'DIRECT_COPY' },
  { id: 'col-5', sourceTable: 'RAW.PUBLIC.ORDERS_RAW', sourceColumn: 'order_date', targetTable: 'STG.PUBLIC.ORDERS_STG', targetColumn: 'order_date', relation: 'DIRECT_COPY' },
  
  { id: 'col-6', sourceTable: 'RAW.PUBLIC.CUSTOMERS_RAW', sourceColumn: 'customer_id', targetTable: 'STG.PUBLIC.CUSTOMERS_STG', targetColumn: 'customer_id', relation: 'DIRECT_COPY' },
  { id: 'col-7', sourceTable: 'RAW.PUBLIC.CUSTOMERS_RAW', sourceColumn: 'first_name', targetTable: 'STG.PUBLIC.CUSTOMERS_STG', targetColumn: 'first_name', relation: 'DIRECT_COPY' },
  { id: 'col-8', sourceTable: 'RAW.PUBLIC.CUSTOMERS_RAW', sourceColumn: 'last_name', targetTable: 'STG.PUBLIC.CUSTOMERS_STG', targetColumn: 'last_name', relation: 'DIRECT_COPY' },
  { id: 'col-9', sourceTable: 'RAW.PUBLIC.CUSTOMERS_RAW', sourceColumn: 'email', targetTable: 'STG.PUBLIC.CUSTOMERS_STG', targetColumn: 'email', relation: 'DIRECT_COPY' },
  
  // STG to DW column mappings
  { id: 'col-10', sourceTable: 'STG.PUBLIC.ORDERS_STG', sourceColumn: 'order_id', targetTable: 'DW.PUBLIC.FCT_ORDERS', targetColumn: 'order_id', relation: 'TRANSFORM' },
  { id: 'col-11', sourceTable: 'STG.PUBLIC.ORDERS_STG', sourceColumn: 'customer_id', targetTable: 'DW.PUBLIC.FCT_ORDERS', targetColumn: 'customer_key', relation: 'LOOKUP_TRANSFORM' },
  { id: 'col-12', sourceTable: 'STG.PUBLIC.ORDERS_STG', sourceColumn: 'product_id', targetTable: 'DW.PUBLIC.FCT_ORDERS', targetColumn: 'product_key', relation: 'LOOKUP_TRANSFORM' },
  { id: 'col-13', sourceTable: 'STG.PUBLIC.ORDERS_STG', sourceColumn: 'quantity', targetTable: 'DW.PUBLIC.FCT_ORDERS', targetColumn: 'quantity', relation: 'DIRECT_COPY' },
  { id: 'col-14', sourceTable: 'STG.PUBLIC.ORDERS_STG', sourceColumn: 'order_date', targetTable: 'DW.PUBLIC.FCT_ORDERS', targetColumn: 'order_date', relation: 'DATE_TRANSFORM' },
  
  { id: 'col-15', sourceTable: 'STG.PUBLIC.CUSTOMERS_STG', sourceColumn: 'customer_id', targetTable: 'DW.PUBLIC.DIM_CUSTOMER', targetColumn: 'customer_id', relation: 'DIRECT_COPY' },
  { id: 'col-16', sourceTable: 'STG.PUBLIC.CUSTOMERS_STG', sourceColumn: 'first_name', targetTable: 'DW.PUBLIC.DIM_CUSTOMER', targetColumn: 'first_name', relation: 'DIRECT_COPY' },
  { id: 'col-17', sourceTable: 'STG.PUBLIC.CUSTOMERS_STG', sourceColumn: 'last_name', targetTable: 'DW.PUBLIC.DIM_CUSTOMER', targetColumn: 'last_name', relation: 'DIRECT_COPY' },
  { id: 'col-18', sourceTable: 'STG.PUBLIC.CUSTOMERS_STG', sourceColumn: 'email', targetTable: 'DW.PUBLIC.DIM_CUSTOMER', targetColumn: 'email', relation: 'DIRECT_COPY' },
  
  // DW to Analytics column mappings
  { id: 'col-19', sourceTable: 'DW.PUBLIC.FCT_ORDERS', sourceColumn: 'customer_key', targetTable: 'ANALYTICS.PUBLIC.LTV_VIEW', targetColumn: 'customer_id', relation: 'JOIN_TRANSFORM' },
  { id: 'col-20', sourceTable: 'DW.PUBLIC.FCT_ORDERS', sourceColumn: 'total_amount', targetTable: 'ANALYTICS.PUBLIC.LTV_VIEW', targetColumn: 'avg_order_value', relation: 'AGGREGATE' },
  { id: 'col-21', sourceTable: 'DW.PUBLIC.DIM_CUSTOMER', sourceColumn: 'customer_id', targetTable: 'ANALYTICS.PUBLIC.LTV_VIEW', targetColumn: 'customer_id', relation: 'JOIN_TRANSFORM' },
];

export const CHILDREN: Record<string, string[]> = ALL_EDGES.reduce(
  (acc, { source, target }) => {
    (acc[source] ||= []).push(target);
    return acc;
  },
  {} as Record<string, string[]>,
);

export const PARENTS: Record<string, string[]> = ALL_EDGES.reduce(
  (acc, { source, target }) => {
    (acc[target] ||= []).push(source);
    return acc;
  },
  {} as Record<string, string[]>,
);

export const NODE_BY_ID = new Map(ALL_NODES.map((x) => [x.id, x] as const));
export const EDGE_BY_ID = new Map(ALL_EDGES.map((x) => [x.id, x] as const));