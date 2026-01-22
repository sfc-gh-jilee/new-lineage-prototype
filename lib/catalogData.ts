import type { LineageEdge, LineageNode, ObjType, ColumnMetadata } from './types';

// Helper functions for creating nodes and columns
function n(
  id: string,
  label: string,
  objType: ObjType,
  db: string,
  schema: string,
  cols: ColumnMetadata[],
  metadata?: {
    qualityScore?: number;
    lastRefreshed?: string;
    rowCount?: number;
    sizeBytes?: number;
    owner?: string;
    description?: string;
    tags?: string[];
    errors?: number;
    warnings?: number;
    dataFreshness?: 'fresh' | 'stale' | 'outdated' | 'unknown';
    certificationStatus?: 'certified' | 'pending' | 'deprecated' | 'none';
    
    // Dynamic relationship discovery
    upstreamReferences?: string[]; // References to upstream nodes
    downstreamReferences?: string[]; // References to downstream nodes
    
    // Column-level lineage metadata
    columnLineage?: {
      [columnName: string]: {
        upstreamColumns?: string[]; // e.g., ["DW.SALES.ORDERS.ORDER_ID", "DW.CUSTOMERS.CUSTOMER_ID"]
        downstreamColumns?: string[]; // e.g., ["DW.ANALYTICS.ORDER_SUMMARY.ORDER_ID"]
        transformationType?: string; // e.g., "join", "aggregate", "filter"
        dataQuality?: number; // 0-100
      };
    };
    
    // Model-specific metadata
    modelType?: string; // e.g., "classification", "regression", "recommendation"
    algorithm?: string; // e.g., "random_forest", "neural_network"
    accuracy?: number; // Model accuracy score
    features?: string[]; // List of features used by the model
  }
): any {
  // Format label as all caps
  const formattedLabel = label.toUpperCase();
  const fullPath = `${db}.${schema}.${formattedLabel}`;
  
  return {
    id,
    name: fullPath, // Full path for display in node card header
    label: formattedLabel, // Just the table name for main label
    objType,
    db,
    schema,
    children: objType === 'MODEL' && metadata && metadata.features 
      ? metadata.features.map(feature => ({ name: feature, type: 'feature' })) // Use features for models
      : cols.map(col => ({ name: col.name, type: col.type })), // Use columns for tables/views
    upstreamExpanded: false,
    downstreamExpanded: false,
    hasUpstream: true,
    hasDownstream: true,
    dataQualityScore: metadata?.qualityScore,
    error: metadata?.errors ? `${metadata.errors} error${metadata.errors > 1 ? 's' : ''} detected` : undefined,
    warning: metadata?.warnings ? `${metadata.warnings} warning${metadata.warnings > 1 ? 's' : ''} detected` : undefined,
    columnsMetadata: cols,
    metadata: {
      fullPath,
      ...metadata,
    },
  };
}

function e(source: string, target: string, relation?: string): LineageEdge {
  return {
    id: `${source}-${target}`,
    source,
    target,
    relation,
  };
}

function col(name: string, type: string, description?: string): ColumnMetadata {
  return { name, type, description };
}

// ============ CATALOG NODES ============

export const ALL_CATALOG_NODES: LineageNode[] = [
  // Marketing Database
  n('DW.MARKETING.CAMPAIGNS', 'campaigns', 'TABLE', 'DW', 'MARKETING', [
    col('campaign_id', 'NUMBER'),
    col('campaign_name', 'VARCHAR'),
    col('start_date', 'DATE'),
    col('end_date', 'DATE'),
    col('budget', 'NUMBER'),
    col('channel', 'VARCHAR'),
    col('status', 'VARCHAR'),
    col('created_at', 'TIMESTAMP'),
  ], {
    qualityScore: 92,
    lastRefreshed: '2025-10-06T10:30:00Z',
    rowCount: 1247,
    sizeBytes: 524288,
    owner: 'marketing_team@company.com',
    description: 'Marketing campaign tracking table with budget and performance data',
    tags: ['marketing', 'campaigns', 'pii'],
    errors: 0,
    warnings: 1,
    dataFreshness: 'fresh',
    certificationStatus: 'certified',
  }),
  n('DW.MARKETING.AD_IMPRESSIONS', 'ad_impressions', 'TABLE', 'DW', 'MARKETING', [
    col('impression_id', 'NUMBER'),
    col('campaign_id', 'NUMBER'),
    col('ad_id', 'NUMBER'),
    col('user_id', 'NUMBER'),
    col('impression_time', 'TIMESTAMP'),
    col('device_type', 'VARCHAR'),
    col('country', 'VARCHAR'),
  ], {
    qualityScore: 88,
    lastRefreshed: '2025-10-06T11:45:00Z',
    rowCount: 8945231,
    sizeBytes: 12582912000,
    owner: 'marketing_team@company.com',
    description: 'Real-time ad impression tracking from all channels',
    tags: ['marketing', 'ads', 'real-time'],
    errors: 0,
    warnings: 2,
    dataFreshness: 'fresh',
    certificationStatus: 'certified',
  }),
  n('DW.MARKETING.AD_CLICKS', 'ad_clicks', 'TABLE', 'DW', 'MARKETING', [
    col('click_id', 'NUMBER', 'Unique identifier for each click event'),
    col('impression_id', 'NUMBER', 'Reference to the ad impression that generated this click'),
    col('campaign_id', 'NUMBER', 'ID of the marketing campaign'),
    col('user_id', 'NUMBER', 'ID of the user who clicked'),
    col('click_time', 'TIMESTAMP', 'Timestamp when the click occurred'),
    col('landing_page', 'VARCHAR', 'URL of the landing page'),
  ], {
    qualityScore: 85,
    lastRefreshed: '2025-10-06T11:50:00Z',
    rowCount: 452891,
    sizeBytes: 1048576000,
    owner: 'marketing_team@company.com',
    description: 'Click-through data for ad campaigns',
    tags: ['marketing', 'conversion'],
    errors: 1,
    warnings: 0,
    dataFreshness: 'fresh',
    certificationStatus: 'certified',
    
    // Dynamic relationship discovery
    upstreamReferences: ['DW.MARKETING.AD_IMPRESSIONS', 'DW.CUSTOMERS.CUSTOMER_BASE'],
    downstreamReferences: ['DW.ANALYTICS.CONVERSION_FUNNEL', 'DW.ANALYTICS.REVENUE_ATTRIBUTION'],
    
    // Column-level lineage
    columnLineage: {
      'impression_id': {
        upstreamColumns: ['DW.MARKETING.AD_IMPRESSIONS.impression_id'],
        transformationType: 'direct_copy',
        dataQuality: 100
      },
      'user_id': {
        upstreamColumns: ['DW.CUSTOMERS.CUSTOMER_BASE.customer_id'],
        transformationType: 'lookup',
        dataQuality: 95
      },
      'campaign_id': {
        upstreamColumns: ['DW.MARKETING.AD_IMPRESSIONS.campaign_id'],
        transformationType: 'direct_copy',
        dataQuality: 100
      }
    }
  }),
  n('DW.MARKETING.EMAIL_CAMPAIGNS', 'email_campaigns', 'TABLE', 'DW', 'MARKETING', [
    col('email_campaign_id', 'NUMBER'),
    col('campaign_name', 'VARCHAR'),
    col('subject_line', 'VARCHAR'),
    col('send_date', 'DATE'),
    col('total_sent', 'NUMBER'),
    col('total_opened', 'NUMBER'),
    col('total_clicked', 'NUMBER'),
  ], {
    qualityScore: 78,
    lastRefreshed: '2025-10-05T08:00:00Z',
    rowCount: 892,
    sizeBytes: 262144,
    owner: 'email_marketing@company.com',
    description: 'Email campaign performance metrics',
    tags: ['marketing', 'email', 'deprecated-soon'],
    errors: 0,
    warnings: 3,
    dataFreshness: 'stale',
    certificationStatus: 'pending',
  }),

  // Products Database
  n('DW.PRODUCTS.CATALOG', 'catalog', 'TABLE', 'DW', 'PRODUCTS', [
    col('product_id', 'NUMBER'),
    col('product_name', 'VARCHAR'),
    col('category', 'VARCHAR'),
    col('subcategory', 'VARCHAR'),
    col('price', 'NUMBER'),
    col('cost', 'NUMBER'),
    col('sku', 'VARCHAR'),
    col('status', 'VARCHAR'),
  ]),
  n('DW.PRODUCTS.INVENTORY', 'inventory', 'TABLE', 'DW', 'PRODUCTS', [
    col('product_id', 'NUMBER'),
    col('warehouse_id', 'NUMBER'),
    col('quantity_available', 'NUMBER'),
    col('quantity_reserved', 'NUMBER'),
    col('last_updated', 'TIMESTAMP'),
  ]),
  n('DW.PRODUCTS.SUPPLIERS', 'suppliers', 'TABLE', 'DW', 'PRODUCTS', [
    col('supplier_id', 'NUMBER'),
    col('supplier_name', 'VARCHAR'),
    col('country', 'VARCHAR'),
    col('lead_time_days', 'NUMBER'),
    col('rating', 'NUMBER'),
  ]),
  n('DW.PRODUCTS.PRODUCT_REVIEWS', 'product_reviews', 'TABLE', 'DW', 'PRODUCTS', [
    col('review_id', 'NUMBER'),
    col('product_id', 'NUMBER'),
    col('user_id', 'NUMBER'),
    col('rating', 'NUMBER'),
    col('review_text', 'VARCHAR'),
    col('review_date', 'DATE'),
  ]),

  // Users Database
  n('DW.USERS.CUSTOMERS', 'customers', 'TABLE', 'DW', 'USERS', [
    col('user_id', 'NUMBER'),
    col('email', 'VARCHAR'),
    col('first_name', 'VARCHAR'),
    col('last_name', 'VARCHAR'),
    col('signup_date', 'DATE'),
    col('country', 'VARCHAR'),
    col('state', 'VARCHAR'),
    col('city', 'VARCHAR'),
    col('postal_code', 'VARCHAR'),
  ], {
    qualityScore: 95,
    lastRefreshed: '2025-10-06T12:00:00Z',
    rowCount: 2847193,
    sizeBytes: 5368709120,
    owner: 'data_engineering@company.com',
    description: 'Core customer master data table - GDPR compliant',
    tags: ['users', 'pii', 'gdpr', 'critical'],
    errors: 0,
    warnings: 0,
    dataFreshness: 'fresh',
    certificationStatus: 'certified',
  }),
  n('DW.USERS.USER_SESSIONS', 'user_sessions', 'TABLE', 'DW', 'USERS', [
    col('session_id', 'VARCHAR'),
    col('user_id', 'NUMBER'),
    col('session_start', 'TIMESTAMP'),
    col('session_end', 'TIMESTAMP'),
    col('device_type', 'VARCHAR'),
    col('browser', 'VARCHAR'),
    col('ip_address', 'VARCHAR'),
  ]),
  n('DW.USERS.USER_PREFERENCES', 'user_preferences', 'TABLE', 'DW', 'USERS', [
    col('user_id', 'NUMBER'),
    col('preference_key', 'VARCHAR'),
    col('preference_value', 'VARCHAR'),
    col('updated_at', 'TIMESTAMP'),
  ]),

  // Orders/Transactions
  n('DW.SALES.ORDERS', 'orders', 'TABLE', 'DW', 'SALES', [
    col('order_id', 'NUMBER'),
    col('user_id', 'NUMBER'),
    col('order_date', 'DATE'),
    col('order_total', 'NUMBER'),
    col('tax_amount', 'NUMBER'),
    col('shipping_amount', 'NUMBER'),
    col('status', 'VARCHAR'),
  ], {
    qualityScore: 91,
    lastRefreshed: '2025-10-06T11:55:00Z',
    rowCount: 5923847,
    sizeBytes: 8589934592,
    owner: 'sales_ops@company.com',
    description: 'Main transactional table for all customer orders',
    tags: ['sales', 'transactions', 'revenue', 'critical'],
    errors: 0,
    warnings: 1,
    dataFreshness: 'fresh',
    certificationStatus: 'certified',
  }),
  n('DW.SALES.ORDER_ITEMS', 'order_items', 'TABLE', 'DW', 'SALES', [
    col('order_item_id', 'NUMBER'),
    col('order_id', 'NUMBER'),
    col('product_id', 'NUMBER'),
    col('quantity', 'NUMBER'),
    col('unit_price', 'NUMBER'),
    col('discount', 'NUMBER'),
  ]),
  n('DW.SALES.PAYMENTS', 'payments', 'TABLE', 'DW', 'SALES', [
    col('payment_id', 'NUMBER'),
    col('order_id', 'NUMBER'),
    col('payment_method', 'VARCHAR'),
    col('payment_amount', 'NUMBER'),
    col('payment_date', 'TIMESTAMP'),
    col('status', 'VARCHAR'),
  ]),
  n('DW.SALES.REFUNDS', 'refunds', 'TABLE', 'DW', 'SALES', [
    col('refund_id', 'NUMBER'),
    col('order_id', 'NUMBER'),
    col('refund_amount', 'NUMBER'),
    col('refund_reason', 'VARCHAR'),
    col('refund_date', 'DATE'),
  ]),

  // Finance
  n('DW.FINANCE.REVENUE', 'revenue', 'TABLE', 'DW', 'FINANCE', [
    col('revenue_id', 'NUMBER'),
    col('order_id', 'NUMBER'),
    col('revenue_date', 'DATE'),
    col('gross_revenue', 'NUMBER'),
    col('net_revenue', 'NUMBER'),
    col('currency', 'VARCHAR'),
  ]),
  n('DW.FINANCE.EXPENSES', 'expenses', 'TABLE', 'DW', 'FINANCE', [
    col('expense_id', 'NUMBER'),
    col('expense_category', 'VARCHAR'),
    col('expense_date', 'DATE'),
    col('amount', 'NUMBER'),
    col('vendor', 'VARCHAR'),
    col('description', 'VARCHAR'),
  ]),

  // Analytics Views
  n('ANALYTICS.REPORTING.DAILY_SALES', 'daily_sales', 'VIEW', 'ANALYTICS', 'REPORTING', [
    col('date', 'DATE'),
    col('total_orders', 'NUMBER'),
    col('total_revenue', 'NUMBER'),
    col('avg_order_value', 'NUMBER'),
    col('total_customers', 'NUMBER'),
  ], {
    qualityScore: 94,
    lastRefreshed: '2025-10-06T06:00:00Z',
    rowCount: 1825,
    sizeBytes: 1048576,
    owner: 'analytics_team@company.com',
    description: 'Daily aggregated sales metrics for executive reporting',
    tags: ['analytics', 'reporting', 'dashboard'],
    errors: 0,
    warnings: 0,
    dataFreshness: 'fresh',
    certificationStatus: 'certified',
  }),
  n('ANALYTICS.REPORTING.CUSTOMER_LIFETIME_VALUE', 'customer_lifetime_value', 'VIEW', 'ANALYTICS', 'REPORTING', [
    col('user_id', 'NUMBER'),
    col('email', 'VARCHAR'),
    col('total_orders', 'NUMBER'),
    col('total_spent', 'NUMBER'),
    col('first_order_date', 'DATE'),
    col('last_order_date', 'DATE'),
    col('ltv', 'NUMBER'),
  ], {
    qualityScore: 67,
    lastRefreshed: '2025-10-03T02:00:00Z',
    rowCount: 284719,
    sizeBytes: 2097152000,
    owner: 'analytics_team@company.com',
    description: 'Customer LTV calculations - needs performance optimization',
    tags: ['analytics', 'customer', 'ltv', 'slow-query'],
    errors: 2,
    warnings: 5,
    dataFreshness: 'outdated',
    certificationStatus: 'none',
  }),
  n('ANALYTICS.REPORTING.PRODUCT_PERFORMANCE', 'product_performance', 'VIEW', 'ANALYTICS', 'REPORTING', [
    col('product_id', 'NUMBER'),
    col('product_name', 'VARCHAR'),
    col('category', 'VARCHAR'),
    col('total_sold', 'NUMBER'),
    col('revenue', 'NUMBER'),
    col('avg_rating', 'NUMBER'),
  ]),
  n('ANALYTICS.REPORTING.MARKETING_ROI', 'marketing_roi', 'VIEW', 'ANALYTICS', 'REPORTING', [
    col('campaign_id', 'NUMBER'),
    col('campaign_name', 'VARCHAR'),
    col('total_spend', 'NUMBER'),
    col('total_impressions', 'NUMBER'),
    col('total_clicks', 'NUMBER'),
    col('total_conversions', 'NUMBER'),
    col('revenue_generated', 'NUMBER'),
    col('roi', 'NUMBER'),
  ]),

  // BI Tool Tables
  n('BI.DASHBOARDS.EXECUTIVE_SUMMARY', 'executive_summary', 'EXTERNAL', 'BI', 'DASHBOARDS', [
    col('metric_name', 'VARCHAR'),
    col('metric_value', 'NUMBER'),
    col('previous_period', 'NUMBER'),
    col('change_pct', 'NUMBER'),
  ]),
  n('BI.DASHBOARDS.SALES_DASHBOARD', 'sales_dashboard', 'EXTERNAL', 'BI', 'DASHBOARDS', [
    col('date', 'DATE'),
    col('region', 'VARCHAR'),
    col('sales', 'NUMBER'),
    col('target', 'NUMBER'),
  ]),

  // Machine Learning Models
  n('ML.CUSTOMER_CHURN_MODEL', 'customer_churn_model', 'MODEL', 'ML', 'CUSTOMER', [], {
    qualityScore: 88,
    lastRefreshed: '2025-10-06T14:30:00Z',
    rowCount: 125000,
    sizeBytes: 52428800,
    owner: 'ml_team@company.com',
    description: 'Machine learning model for predicting customer churn',
    tags: ['ml', 'churn', 'prediction', 'customer'],
    errors: 0,
    warnings: 3,
    dataFreshness: 'fresh',
    certificationStatus: 'certified',
    
    // Model-specific metadata
    modelType: 'classification',
    algorithm: 'random_forest',
    accuracy: 0.87,
    features: [
      'customer_age',
      'total_orders',
      'avg_order_value',
      'days_since_last_order',
      'support_tickets',
      'payment_method',
      'subscription_type'
    ],
    
    upstreamReferences: ['DW.USERS.CUSTOMERS', 'DW.SALES.ORDERS', 'DW.SALES.PAYMENTS'],
    downstreamReferences: ['DW.ANALYTICS.CHURN_ANALYSIS', 'DW.MARKETING.RETENTION_CAMPAIGNS'],
  }),

  n('ML.RECOMMENDATION_MODEL', 'recommendation_model', 'MODEL', 'ML', 'PRODUCT', [], {
    qualityScore: 91,
    lastRefreshed: '2025-10-06T15:00:00Z',
    rowCount: 2500000,
    sizeBytes: 104857600,
    owner: 'ml_team@company.com',
    description: 'Collaborative filtering model for product recommendations',
    tags: ['ml', 'recommendation', 'collaborative_filtering'],
    errors: 0,
    warnings: 1,
    dataFreshness: 'fresh',
    certificationStatus: 'certified',
    
    // Model-specific metadata
    modelType: 'recommendation',
    algorithm: 'matrix_factorization',
    accuracy: 0.82,
    features: [
      'user_purchase_history',
      'product_categories',
      'user_demographics',
      'seasonal_patterns',
      'price_sensitivity',
      'brand_preferences'
    ],
    
    upstreamReferences: ['DW.USERS.CUSTOMERS', 'DW.PRODUCTS.CATALOG', 'DW.SALES.ORDER_ITEMS'],
    downstreamReferences: ['DW.ANALYTICS.RECOMMENDATION_PERFORMANCE'],
  }),
];

// ============ CATALOG EDGES ============

export const ALL_CATALOG_EDGES: LineageEdge[] = [
  // Marketing flow
  e('DW.MARKETING.CAMPAIGNS', 'DW.MARKETING.AD_IMPRESSIONS'),
  e('DW.MARKETING.AD_IMPRESSIONS', 'DW.MARKETING.AD_CLICKS'),
  e('DW.MARKETING.CAMPAIGNS', 'DW.MARKETING.EMAIL_CAMPAIGNS'),

  // Products flow
  e('DW.PRODUCTS.CATALOG', 'DW.PRODUCTS.INVENTORY'),
  e('DW.PRODUCTS.CATALOG', 'DW.PRODUCTS.PRODUCT_REVIEWS'),
  e('DW.USERS.CUSTOMERS', 'DW.PRODUCTS.PRODUCT_REVIEWS'),

  // Users and Sessions
  e('DW.USERS.CUSTOMERS', 'DW.USERS.USER_SESSIONS'),
  e('DW.USERS.CUSTOMERS', 'DW.USERS.USER_PREFERENCES'),

  // Sales flow
  e('DW.USERS.CUSTOMERS', 'DW.SALES.ORDERS'),
  e('DW.SALES.ORDERS', 'DW.SALES.ORDER_ITEMS'),
  e('DW.PRODUCTS.CATALOG', 'DW.SALES.ORDER_ITEMS'),
  e('DW.SALES.ORDERS', 'DW.SALES.PAYMENTS'),
  e('DW.SALES.ORDERS', 'DW.SALES.REFUNDS'),

  // Finance flow
  e('DW.SALES.ORDERS', 'DW.FINANCE.REVENUE'),
  e('DW.MARKETING.CAMPAIGNS', 'DW.FINANCE.EXPENSES'),

  // Analytics Views
  e('DW.SALES.ORDERS', 'ANALYTICS.REPORTING.DAILY_SALES'),
  e('DW.SALES.ORDER_ITEMS', 'ANALYTICS.REPORTING.DAILY_SALES'),
  e('DW.USERS.CUSTOMERS', 'ANALYTICS.REPORTING.CUSTOMER_LIFETIME_VALUE'),
  e('DW.SALES.ORDERS', 'ANALYTICS.REPORTING.CUSTOMER_LIFETIME_VALUE'),
  e('DW.PRODUCTS.CATALOG', 'ANALYTICS.REPORTING.PRODUCT_PERFORMANCE'),
  e('DW.SALES.ORDER_ITEMS', 'ANALYTICS.REPORTING.PRODUCT_PERFORMANCE'),
  e('DW.PRODUCTS.PRODUCT_REVIEWS', 'ANALYTICS.REPORTING.PRODUCT_PERFORMANCE'),
  e('DW.MARKETING.CAMPAIGNS', 'ANALYTICS.REPORTING.MARKETING_ROI'),
  e('DW.MARKETING.AD_CLICKS', 'ANALYTICS.REPORTING.MARKETING_ROI'),
  e('DW.SALES.ORDERS', 'ANALYTICS.REPORTING.MARKETING_ROI'),

  // BI Dashboards
  e('ANALYTICS.REPORTING.DAILY_SALES', 'BI.DASHBOARDS.EXECUTIVE_SUMMARY'),
  e('ANALYTICS.REPORTING.CUSTOMER_LIFETIME_VALUE', 'BI.DASHBOARDS.EXECUTIVE_SUMMARY'),
  e('ANALYTICS.REPORTING.DAILY_SALES', 'BI.DASHBOARDS.SALES_DASHBOARD'),
];

// ============ CATALOG TREE STRUCTURE ============

export type CatalogObject = LineageNode;
export type CatalogSchema = {
  schema: string;
  objects: CatalogObject[];
};
export type CatalogDatabase = {
  database: string;
  schemas: CatalogSchema[];
};
export type CatalogTree = CatalogDatabase[];

export const CATALOG_TREE: CatalogTree = [
  {
    database: 'DW',
    schemas: [
      {
        schema: 'MARKETING',
        objects: ALL_CATALOG_NODES.filter(n => (n as any).db === 'DW' && (n as any).schema === 'MARKETING'),
      },
      {
        schema: 'PRODUCTS',
        objects: ALL_CATALOG_NODES.filter(n => (n as any).db === 'DW' && (n as any).schema === 'PRODUCTS'),
      },
      {
        schema: 'USERS',
        objects: ALL_CATALOG_NODES.filter(n => (n as any).db === 'DW' && (n as any).schema === 'USERS'),
      },
      {
        schema: 'SALES',
        objects: ALL_CATALOG_NODES.filter(n => (n as any).db === 'DW' && (n as any).schema === 'SALES'),
      },
      {
        schema: 'FINANCE',
        objects: ALL_CATALOG_NODES.filter(n => (n as any).db === 'DW' && (n as any).schema === 'FINANCE'),
      },
    ],
  },
  {
    database: 'ANALYTICS',
    schemas: [
      {
        schema: 'REPORTING',
        objects: ALL_CATALOG_NODES.filter(n => (n as any).db === 'ANALYTICS' && (n as any).schema === 'REPORTING'),
      },
    ],
  },
  {
    database: 'BI',
    schemas: [
      {
        schema: 'DASHBOARDS',
        objects: ALL_CATALOG_NODES.filter(n => (n as any).db === 'BI' && (n as any).schema === 'DASHBOARDS'),
      },
    ],
  },
  {
    database: 'ML',
    schemas: [
      {
        schema: 'CUSTOMER',
        objects: ALL_CATALOG_NODES.filter(n => (n as any).db === 'ML' && (n as any).schema === 'CUSTOMER'),
      },
      {
        schema: 'PRODUCT',
        objects: ALL_CATALOG_NODES.filter(n => (n as any).db === 'ML' && (n as any).schema === 'PRODUCT'),
      },
    ],
  },
];

