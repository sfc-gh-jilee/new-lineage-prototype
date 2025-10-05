import type { LineageEdge, LineageNode, ObjType, ColumnLineageEdge, ColumnMetadata } from './types';

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
  brandIcon?: string,
  columnsMetadata?: ColumnMetadata[]
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
    brandIcon,
    columnsMetadata
  };
}
function e(source: string, target: string, relation?: string): RelEdge {
  return { id: `${source}->${target}`, source, target, relation };
}

// Helper function to create detailed column metadata
function col(
  name: string,
  type: string,
  description?: string,
  options?: {
    nullable?: boolean;
    primaryKey?: boolean;
    foreignKey?: string;
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
  }
): ColumnMetadata {
  return {
    name,
    type,
    description,
    nullable: options?.nullable ?? true,
    primaryKey: options?.primaryKey ?? false,
    foreignKey: options?.foreignKey,
    defaultValue: options?.defaultValue,
    constraints: options?.constraints ?? [],
    tags: options?.tags ?? [],
    dataQualityScore: options?.dataQualityScore,
    lastUpdated: options?.lastUpdated ?? '2024-01-15',
    sampleValues: options?.sampleValues ?? [],
    statistics: options?.statistics
  };
}

export const ALL_NODES: LineageNode[] = [
  // External upstream data sources
  n('EXT.DATABRICKS.CUSTOMER_DATA', 'Customer Analytics', 'EXT_TABLE', undefined, '2024-01-01', undefined, undefined, [
    { name: 'customer_segments', type: 'VARCHAR' },
    { name: 'lifetime_value', type: 'DECIMAL' },
    { name: 'churn_probability', type: 'DECIMAL' },
    { name: 'last_activity', type: 'TIMESTAMP' }
  ], 'icons/databricks-logo.png'),
  n('EXT.SALESFORCE.LEADS', 'Salesforce Leads', 'EXT_STAGE', undefined, '2024-01-01', undefined, undefined, [
    { name: 'lead_id', type: 'VARCHAR' },
    { name: 'company', type: 'VARCHAR' },
    { name: 'email', type: 'VARCHAR' },
    { name: 'status', type: 'VARCHAR' },
    { name: 'created_date', type: 'TIMESTAMP' }
  ], 'icons/salesforce-logo.png'),
  n('EXT.STRIPE.PAYMENTS', 'Stripe Payments', 'EXT_TABLE', undefined, '2024-01-01', undefined, undefined, [
    { name: 'payment_id', type: 'VARCHAR' },
    { name: 'customer_id', type: 'VARCHAR' },
    { name: 'amount', type: 'DECIMAL' },
    { name: 'currency', type: 'VARCHAR' },
    { name: 'status', type: 'VARCHAR' }
  ], 'icons/stripe-logo.png'),

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
  ], undefined, [
    col('order_id', 'VARCHAR(50)', 'Unique identifier for each order', {
      primaryKey: true,
      nullable: false,
      constraints: ['UNIQUE', 'NOT NULL'],
      tags: ['PII', 'Business Key'],
      dataQualityScore: 5,
      sampleValues: ['ORD-2024-001', 'ORD-2024-002', 'ORD-2024-003'],
      statistics: { uniqueCount: 15420, nullCount: 0, avgLength: 11 }
    }),
    col('customer_id', 'VARCHAR(50)', 'Reference to customer who placed the order', {
      foreignKey: 'CUSTOMERS_STG.customer_id',
      nullable: false,
      constraints: ['FOREIGN KEY'],
      tags: ['PII', 'Foreign Key'],
      dataQualityScore: 4,
      sampleValues: ['CUST-001', 'CUST-002', 'CUST-003'],
      statistics: { uniqueCount: 8920, nullCount: 0, avgLength: 8 }
    }),
    col('product_id', 'VARCHAR(50)', 'Reference to ordered product', {
      foreignKey: 'PRODUCTS_STG.product_id',
      nullable: false,
      constraints: ['FOREIGN KEY'],
      tags: ['Business Key'],
      dataQualityScore: 4,
      sampleValues: ['PROD-001', 'PROD-002', 'PROD-003'],
      statistics: { uniqueCount: 1250, nullCount: 0, avgLength: 8 }
    }),
    col('quantity', 'INTEGER', 'Number of items ordered', {
      nullable: false,
      constraints: ['CHECK (quantity > 0)'],
      tags: ['Metric'],
      dataQualityScore: 5,
      sampleValues: ['1', '2', '5', '10'],
      statistics: { uniqueCount: 25, nullCount: 0, minValue: '1', maxValue: '50' }
    }),
    col('order_date', 'TIMESTAMP', 'When the order was placed', {
      nullable: false,
      constraints: ['NOT NULL'],
      tags: ['Temporal'],
      dataQualityScore: 5,
      sampleValues: ['2024-01-15 10:30:00', '2024-01-15 14:22:15', '2024-01-16 09:15:30'],
      statistics: { uniqueCount: 15420, nullCount: 0 }
    }),
    col('total_amount', 'DECIMAL(10,2)', 'Total order value in USD', {
      nullable: false,
      constraints: ['CHECK (total_amount >= 0)'],
      tags: ['Financial', 'Metric'],
      dataQualityScore: 4,
      sampleValues: ['29.99', '149.50', '75.25', '199.99'],
      statistics: { uniqueCount: 8920, nullCount: 0, minValue: '5.99', maxValue: '2499.99' }
    }),
    col('status', 'VARCHAR(20)', 'Current order status', {
      nullable: false,
      defaultValue: 'PENDING',
      constraints: ['CHECK (status IN (\'PENDING\', \'CONFIRMED\', \'SHIPPED\', \'DELIVERED\', \'CANCELLED\'))'],
      tags: ['Status'],
      dataQualityScore: 5,
      sampleValues: ['PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED'],
      statistics: { uniqueCount: 5, nullCount: 0, avgLength: 8 }
    })
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
  ], undefined, [
    col('customer_id', 'VARCHAR(50)', 'Unique customer identifier', {
      primaryKey: true,
      nullable: false,
      constraints: ['UNIQUE', 'NOT NULL'],
      tags: ['PII', 'Business Key'],
      dataQualityScore: 5,
      sampleValues: ['CUST-001', 'CUST-002', 'CUST-003'],
      statistics: { uniqueCount: 8920, nullCount: 0, avgLength: 8 }
    }),
    col('first_name', 'VARCHAR(100)', 'Customer first name', {
      nullable: false,
      constraints: ['NOT NULL'],
      tags: ['PII', 'Personal Data'],
      dataQualityScore: 4,
      sampleValues: ['John', 'Jane', 'Michael', 'Sarah'],
      statistics: { uniqueCount: 2450, nullCount: 12, avgLength: 6 }
    }),
    col('last_name', 'VARCHAR(100)', 'Customer last name', {
      nullable: false,
      constraints: ['NOT NULL'],
      tags: ['PII', 'Personal Data'],
      dataQualityScore: 4,
      sampleValues: ['Smith', 'Johnson', 'Williams', 'Brown'],
      statistics: { uniqueCount: 3200, nullCount: 8, avgLength: 7 }
    }),
    col('email', 'VARCHAR(255)', 'Customer email address', {
      nullable: false,
      constraints: ['UNIQUE', 'CHECK (email LIKE \'%@%\')'],
      tags: ['PII', 'Contact', 'Unique'],
      dataQualityScore: 5,
      sampleValues: ['john.smith@email.com', 'jane.doe@company.com'],
      statistics: { uniqueCount: 8920, nullCount: 0, avgLength: 24 }
    }),
    col('phone', 'VARCHAR(20)', 'Customer phone number', {
      nullable: true,
      constraints: ['CHECK (phone ~ \'^\\+?[0-9\\-\\s\\(\\)]+$\')'],
      tags: ['PII', 'Contact'],
      dataQualityScore: 3,
      sampleValues: ['+1-555-123-4567', '(555) 987-6543', '555.111.2222'],
      statistics: { uniqueCount: 7890, nullCount: 1030, avgLength: 14 }
    }),
    col('address', 'TEXT', 'Customer mailing address', {
      nullable: true,
      tags: ['PII', 'Location'],
      dataQualityScore: 3,
      sampleValues: ['123 Main St, Anytown, ST 12345', '456 Oak Ave, City, ST 67890'],
      statistics: { uniqueCount: 8100, nullCount: 820, avgLength: 45 }
    }),
    col('created_at', 'TIMESTAMP', 'Account creation timestamp', {
      nullable: false,
      defaultValue: 'CURRENT_TIMESTAMP',
      constraints: ['NOT NULL'],
      tags: ['Temporal', 'Audit'],
      dataQualityScore: 5,
      sampleValues: ['2024-01-10 08:15:30', '2024-01-12 16:45:22'],
      statistics: { uniqueCount: 8920, nullCount: 0 }
    }),
    col('updated_at', 'TIMESTAMP', 'Last update timestamp', {
      nullable: false,
      defaultValue: 'CURRENT_TIMESTAMP',
      constraints: ['NOT NULL'],
      tags: ['Temporal', 'Audit'],
      dataQualityScore: 5,
      sampleValues: ['2024-01-15 10:30:15', '2024-01-16 14:22:45'],
      statistics: { uniqueCount: 8920, nullCount: 0 }
    })
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
  ], undefined, [
    col('product_id', 'VARCHAR(50)', 'Unique product identifier', {
      primaryKey: true,
      nullable: false,
      constraints: ['UNIQUE', 'NOT NULL'],
      tags: ['Business Key'],
      dataQualityScore: 5,
      sampleValues: ['PROD-001', 'PROD-002', 'PROD-003'],
      statistics: { uniqueCount: 1250, nullCount: 0, avgLength: 8 }
    }),
    col('product_name', 'VARCHAR(200)', 'Product display name', {
      nullable: false,
      constraints: ['NOT NULL'],
      tags: ['Display'],
      dataQualityScore: 4,
      sampleValues: ['Wireless Headphones', 'Gaming Laptop', 'Coffee Maker'],
      statistics: { uniqueCount: 1250, nullCount: 0, avgLength: 25 }
    }),
    col('category', 'VARCHAR(100)', 'Product category classification', {
      nullable: false,
      constraints: ['NOT NULL'],
      tags: ['Classification'],
      dataQualityScore: 3,
      sampleValues: ['Electronics', 'Home & Garden', 'Sports', 'Books'],
      statistics: { uniqueCount: 45, nullCount: 15, avgLength: 12 }
    }),
    col('price', 'DECIMAL(10,2)', 'Product price in USD', {
      nullable: false,
      constraints: ['CHECK (price > 0)'],
      tags: ['Financial', 'Metric'],
      dataQualityScore: 4,
      sampleValues: ['29.99', '599.99', '15.50', '1299.00'],
      statistics: { uniqueCount: 890, nullCount: 0, minValue: '5.99', maxValue: '2999.99' }
    }),
    col('description', 'TEXT', 'Detailed product description', {
      nullable: true,
      tags: ['Content'],
      dataQualityScore: 2,
      sampleValues: ['High-quality wireless headphones with noise cancellation', 'Professional gaming laptop with RTX graphics'],
      statistics: { uniqueCount: 1100, nullCount: 150, avgLength: 120 }
    }),
    col('inventory_count', 'INTEGER', 'Current inventory quantity', {
      nullable: false,
      constraints: ['CHECK (inventory_count >= 0)'],
      tags: ['Inventory', 'Metric'],
      dataQualityScore: 4,
      sampleValues: ['50', '0', '125', '8'],
      statistics: { uniqueCount: 200, nullCount: 0, minValue: '0', maxValue: '500' }
    }),
    col('created_at', 'TIMESTAMP', 'Product creation timestamp', {
      nullable: false,
      defaultValue: 'CURRENT_TIMESTAMP',
      constraints: ['NOT NULL'],
      tags: ['Temporal', 'Audit'],
      dataQualityScore: 5,
      sampleValues: ['2024-01-05 09:30:00', '2024-01-08 14:15:30'],
      statistics: { uniqueCount: 1250, nullCount: 0 }
    }),
    col('updated_at', 'TIMESTAMP', 'Last update timestamp', {
      nullable: false,
      defaultValue: 'CURRENT_TIMESTAMP',
      constraints: ['NOT NULL'],
      tags: ['Temporal', 'Audit'],
      dataQualityScore: 5,
      sampleValues: ['2024-01-15 11:45:22', '2024-01-16 16:30:15'],
      statistics: { uniqueCount: 1250, nullCount: 0 }
    })
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
  ], 'icons/powerbi-logo.svg'),
  n('EXT.TABLEAU.EXECUTIVE_REPORTS', 'Executive Reports', 'EXTERNAL', undefined, '2024-01-20', undefined, undefined, [
    { name: 'kpi_metrics', type: 'JSON' },
    { name: 'performance_indicators', type: 'JSON' },
    { name: 'comparative_analysis', type: 'JSON' }
  ], 'icons/tableau-logo.svg'),
  n('EXT.LOOKER.CUSTOMER_INSIGHTS', 'Customer 360 View', 'EXTERNAL', undefined, '2024-01-20', undefined, undefined, [
    { name: 'customer_lifetime_value', type: 'DECIMAL' },
    { name: 'segmentation_data', type: 'JSON' },
    { name: 'behavior_patterns', type: 'JSON' }
  ], 'icons/looker-logo.png'),

  // Test case: Node with many downstream connections (30 nodes)
  n('TEST.CORE.USER_BASE', 'USER_BASE', 'TABLE', 5, '2024-01-20', undefined, undefined, [
    { name: 'user_id', type: 'VARCHAR' },
    { name: 'username', type: 'VARCHAR' },
    { name: 'email', type: 'VARCHAR' },
    { name: 'created_at', type: 'TIMESTAMP' }
  ]),
  
  // 30 downstream nodes connected to USER_BASE
  n('TEST.ANALYTICS.USER_PROFILE_1', 'User Profile 1', 'VIEW', 4, '2024-01-20', undefined, undefined, [{ name: 'user_id', type: 'VARCHAR' }]),
  n('TEST.ANALYTICS.USER_PROFILE_2', 'User Profile 2', 'VIEW', 4, '2024-01-20', undefined, undefined, [{ name: 'user_id', type: 'VARCHAR' }]),
  n('TEST.ANALYTICS.USER_PROFILE_3', 'User Profile 3', 'VIEW', 4, '2024-01-20', undefined, undefined, [{ name: 'user_id', type: 'VARCHAR' }]),
  n('TEST.ANALYTICS.USER_PROFILE_4', 'User Profile 4', 'VIEW', 4, '2024-01-20', undefined, undefined, [{ name: 'user_id', type: 'VARCHAR' }]),
  n('TEST.ANALYTICS.USER_PROFILE_5', 'User Profile 5', 'VIEW', 4, '2024-01-20', undefined, undefined, [{ name: 'user_id', type: 'VARCHAR' }]),
  n('TEST.ANALYTICS.USER_PROFILE_6', 'User Profile 6', 'VIEW', 4, '2024-01-20', undefined, undefined, [{ name: 'user_id', type: 'VARCHAR' }]),
  n('TEST.ANALYTICS.USER_PROFILE_7', 'User Profile 7', 'VIEW', 4, '2024-01-20', undefined, undefined, [{ name: 'user_id', type: 'VARCHAR' }]),
  n('TEST.ANALYTICS.USER_PROFILE_8', 'User Profile 8', 'VIEW', 4, '2024-01-20', undefined, undefined, [{ name: 'user_id', type: 'VARCHAR' }]),
  n('TEST.ANALYTICS.USER_PROFILE_9', 'User Profile 9', 'VIEW', 4, '2024-01-20', undefined, undefined, [{ name: 'user_id', type: 'VARCHAR' }]),
  n('TEST.ANALYTICS.USER_PROFILE_10', 'User Profile 10', 'VIEW', 4, '2024-01-20', undefined, undefined, [{ name: 'user_id', type: 'VARCHAR' }]),
  n('TEST.REPORTS.USER_ACTIVITY_1', 'User Activity 1', 'TABLE', 3, '2024-01-20', undefined, undefined, [{ name: 'user_id', type: 'VARCHAR' }]),
  n('TEST.REPORTS.USER_ACTIVITY_2', 'User Activity 2', 'TABLE', 3, '2024-01-20', undefined, undefined, [{ name: 'user_id', type: 'VARCHAR' }]),
  n('TEST.REPORTS.USER_ACTIVITY_3', 'User Activity 3', 'TABLE', 3, '2024-01-20', undefined, undefined, [{ name: 'user_id', type: 'VARCHAR' }]),
  n('TEST.REPORTS.USER_ACTIVITY_4', 'User Activity 4', 'TABLE', 3, '2024-01-20', undefined, undefined, [{ name: 'user_id', type: 'VARCHAR' }]),
  n('TEST.REPORTS.USER_ACTIVITY_5', 'User Activity 5', 'TABLE', 3, '2024-01-20', undefined, undefined, [{ name: 'user_id', type: 'VARCHAR' }]),
  n('TEST.DASHBOARDS.USER_METRICS_1', 'User Metrics 1', 'VIEW', 5, '2024-01-20', undefined, undefined, [{ name: 'user_id', type: 'VARCHAR' }]),
  n('TEST.DASHBOARDS.USER_METRICS_2', 'User Metrics 2', 'VIEW', 5, '2024-01-20', undefined, undefined, [{ name: 'user_id', type: 'VARCHAR' }]),
  n('TEST.DASHBOARDS.USER_METRICS_3', 'User Metrics 3', 'VIEW', 5, '2024-01-20', undefined, undefined, [{ name: 'user_id', type: 'VARCHAR' }]),
  n('TEST.DASHBOARDS.USER_METRICS_4', 'User Metrics 4', 'VIEW', 5, '2024-01-20', undefined, undefined, [{ name: 'user_id', type: 'VARCHAR' }]),
  n('TEST.DASHBOARDS.USER_METRICS_5', 'User Metrics 5', 'VIEW', 5, '2024-01-20', undefined, undefined, [{ name: 'user_id', type: 'VARCHAR' }]),
  n('TEST.ML.USER_PREDICTIONS_1', 'User Predictions 1', 'MODEL', 4, '2024-01-20', undefined, undefined, [{ name: 'user_id', type: 'VARCHAR' }]),
  n('TEST.ML.USER_PREDICTIONS_2', 'User Predictions 2', 'MODEL', 4, '2024-01-20', undefined, undefined, [{ name: 'user_id', type: 'VARCHAR' }]),
  n('TEST.ML.USER_PREDICTIONS_3', 'User Predictions 3', 'MODEL', 4, '2024-01-20', undefined, undefined, [{ name: 'user_id', type: 'VARCHAR' }]),
  n('TEST.ML.USER_PREDICTIONS_4', 'User Predictions 4', 'MODEL', 4, '2024-01-20', undefined, undefined, [{ name: 'user_id', type: 'VARCHAR' }]),
  n('TEST.ML.USER_PREDICTIONS_5', 'User Predictions 5', 'MODEL', 4, '2024-01-20', undefined, undefined, [{ name: 'user_id', type: 'VARCHAR' }]),
  n('TEST.EXPORT.USER_SEGMENT_1', 'User Segment 1', 'EXTERNAL', 4, '2024-01-20', undefined, undefined, [{ name: 'user_id', type: 'VARCHAR' }]),
  n('TEST.EXPORT.USER_SEGMENT_2', 'User Segment 2', 'EXTERNAL', 4, '2024-01-20', undefined, undefined, [{ name: 'user_id', type: 'VARCHAR' }]),
  n('TEST.EXPORT.USER_SEGMENT_3', 'User Segment 3', 'EXTERNAL', 4, '2024-01-20', undefined, undefined, [{ name: 'user_id', type: 'VARCHAR' }]),
  n('TEST.EXPORT.USER_SEGMENT_4', 'User Segment 4', 'EXTERNAL', 4, '2024-01-20', undefined, undefined, [{ name: 'user_id', type: 'VARCHAR' }]),
  n('TEST.EXPORT.USER_SEGMENT_5', 'User Segment 5', 'EXTERNAL', 4, '2024-01-20', undefined, undefined, [{ name: 'user_id', type: 'VARCHAR' }]),
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

  // Test case: 30 edges from USER_BASE to downstream nodes
  e('TEST.CORE.USER_BASE', 'TEST.ANALYTICS.USER_PROFILE_1', 'DBT_MODEL'),
  e('TEST.CORE.USER_BASE', 'TEST.ANALYTICS.USER_PROFILE_2', 'DBT_MODEL'),
  e('TEST.CORE.USER_BASE', 'TEST.ANALYTICS.USER_PROFILE_3', 'DBT_MODEL'),
  e('TEST.CORE.USER_BASE', 'TEST.ANALYTICS.USER_PROFILE_4', 'DBT_MODEL'),
  e('TEST.CORE.USER_BASE', 'TEST.ANALYTICS.USER_PROFILE_5', 'DBT_MODEL'),
  e('TEST.CORE.USER_BASE', 'TEST.ANALYTICS.USER_PROFILE_6', 'DBT_MODEL'),
  e('TEST.CORE.USER_BASE', 'TEST.ANALYTICS.USER_PROFILE_7', 'DBT_MODEL'),
  e('TEST.CORE.USER_BASE', 'TEST.ANALYTICS.USER_PROFILE_8', 'DBT_MODEL'),
  e('TEST.CORE.USER_BASE', 'TEST.ANALYTICS.USER_PROFILE_9', 'DBT_MODEL'),
  e('TEST.CORE.USER_BASE', 'TEST.ANALYTICS.USER_PROFILE_10', 'DBT_MODEL'),
  e('TEST.CORE.USER_BASE', 'TEST.REPORTS.USER_ACTIVITY_1', 'VIEW DEP'),
  e('TEST.CORE.USER_BASE', 'TEST.REPORTS.USER_ACTIVITY_2', 'VIEW DEP'),
  e('TEST.CORE.USER_BASE', 'TEST.REPORTS.USER_ACTIVITY_3', 'VIEW DEP'),
  e('TEST.CORE.USER_BASE', 'TEST.REPORTS.USER_ACTIVITY_4', 'VIEW DEP'),
  e('TEST.CORE.USER_BASE', 'TEST.REPORTS.USER_ACTIVITY_5', 'VIEW DEP'),
  e('TEST.CORE.USER_BASE', 'TEST.DASHBOARDS.USER_METRICS_1', 'VIEW DEP'),
  e('TEST.CORE.USER_BASE', 'TEST.DASHBOARDS.USER_METRICS_2', 'VIEW DEP'),
  e('TEST.CORE.USER_BASE', 'TEST.DASHBOARDS.USER_METRICS_3', 'VIEW DEP'),
  e('TEST.CORE.USER_BASE', 'TEST.DASHBOARDS.USER_METRICS_4', 'VIEW DEP'),
  e('TEST.CORE.USER_BASE', 'TEST.DASHBOARDS.USER_METRICS_5', 'VIEW DEP'),
  e('TEST.CORE.USER_BASE', 'TEST.ML.USER_PREDICTIONS_1', 'ML_PIPELINE'),
  e('TEST.CORE.USER_BASE', 'TEST.ML.USER_PREDICTIONS_2', 'ML_PIPELINE'),
  e('TEST.CORE.USER_BASE', 'TEST.ML.USER_PREDICTIONS_3', 'ML_PIPELINE'),
  e('TEST.CORE.USER_BASE', 'TEST.ML.USER_PREDICTIONS_4', 'ML_PIPELINE'),
  e('TEST.CORE.USER_BASE', 'TEST.ML.USER_PREDICTIONS_5', 'ML_PIPELINE'),
  e('TEST.CORE.USER_BASE', 'TEST.EXPORT.USER_SEGMENT_1', 'API_EXPORT'),
  e('TEST.CORE.USER_BASE', 'TEST.EXPORT.USER_SEGMENT_2', 'API_EXPORT'),
  e('TEST.CORE.USER_BASE', 'TEST.EXPORT.USER_SEGMENT_3', 'API_EXPORT'),
  e('TEST.CORE.USER_BASE', 'TEST.EXPORT.USER_SEGMENT_4', 'API_EXPORT'),
  e('TEST.CORE.USER_BASE', 'TEST.EXPORT.USER_SEGMENT_5', 'API_EXPORT'),
];

export const ROOT_NODE_ID = 'DW.PUBLIC.FCT_ORDERS';
export const TEST_ROOT_NODE_ID = 'TEST.CORE.USER_BASE';

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