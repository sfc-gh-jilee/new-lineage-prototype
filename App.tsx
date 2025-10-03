import '@snowflake/balto-tokens/fonts.css';
import '@snowflake/balto-tokens/reset.css';

import { StrictMode, useEffect, useMemo, useState } from 'react';

import { createBridgeComponent } from '@module-federation/bridge-react';
import { BaltoProvider } from '@snowflake/balto-components';
import { i18nState } from '@snowflake/global/i18n';
import type { SupportedLocales } from '@snowflake/i18n/microfrontends';
import { FederatedContextProvider } from '@snowflake/pep-shared/hooks/useFederatedContext';
import { fetchAndSetToken } from '@snowflake/pep-shared/utils/authInterceptor';
import { setPepGlobalContext, setPepViewContext } from '@snowflake/pep-shared/utils/datadogContext';
import { useTheme } from '@snowsight/common-hooks/useTheme.ts';
import { PepPage } from '@snowsight/common-types/pepPage.model.ts';
import { AccountOverviewPage } from '@snowsight/feature-account-overview/AccountOverviewPage.tsx';
import { AccountsPage } from '@snowsight/feature-account/AccountsPage.tsx';
import { AdminContactsPage } from '@snowsight/feature-admin-contacts/AdminContactsPage.tsx';
import { AnomalyDetectionPage } from '@snowsight/feature-anomaly-detection/AnomalyDetectionPage.tsx';
import { BudgetPage } from '@snowsight/feature-budgets/BudgetPage.tsx';
import { ComputePoolDetailsPage } from '@snowsight/feature-compute-pools/computePoolDetails/ComputePoolDetailsPage.tsx';
import { ComputePoolsPage } from '@snowsight/feature-compute-pools/computePoolList/ComputePoolsPage.tsx';
import { CopyHistoryPage } from '@snowsight/feature-copy-history/CopyHistoryPage.tsx';
import { CortexSearchPlaygroundWrapper } from '@snowsight/feature-cortex-search/adminUI/CortexSearchPlaygroundWrapper.tsx';
import { CortexSearchServicesPage } from '@snowsight/feature-cortex-search/adminUI/CortexSearchServicesPage.tsx';
import { CortexSearchEvalPageWrapper } from '@snowsight/feature-cortex-search/evaluations/CortexSearchEvalPageWrapper.tsx';
import { CortexSearchAdminMainPage } from '@snowsight/feature-cortex-search/shared/CortexSearchAdminMainPage.tsx';
import { DataProfilePage } from '@snowsight/feature-data-quality/DataProfilePage.tsx';
import { DebugPanel } from '@snowsight/feature-debug-panel/DebugPanel.tsx';
import { DocumentAiPlaygroundPage } from '@snowsight/feature-document-ai/DocumentAiPlaygroundPage.tsx';
import { DocumentAiCoreSetup } from '@snowsight/feature-document-ai/pages/setup.tsx';
import { DynamicTablesPage } from '@snowsight/feature-dynamic-tables/DynamicTablesPage.tsx';
import { ExamplePage } from '@snowsight/feature-example/ExamplePage.tsx';
import { ExperimentTrackingPage } from '@snowsight/feature-experiment-tracking/ExperimentTrackingPage.tsx';
import { LineagePage } from '@snowsight/feature-governance/lineage/LineagePage/LineagePage.tsx';
import { GroupedQueryHistoryPage } from '@snowsight/feature-grouped-query-history/GroupedQueryHistoryPage.tsx';
import { GroupedQueryHistoryQueryHashDetailsPage } from '@snowsight/feature-grouped-query-history/queryHashDetails/GroupedQueryHistoryQueryHashDetailsPage.tsx';
import { ImProfilesDetailsPage } from '@snowsight/feature-im-profiles-details/ImProfilesDetailsPage.tsx';
import { IntegrationDetailsPage } from '@snowsight/feature-integrations/IntegrationDetailsPage.tsx';
import { IntegrationsPage } from '@snowsight/feature-integrations/IntegrationsPage.tsx';
import { CreateOAuthWizard } from '@snowsight/feature-integrations/snowflakeOauth/CreateOAuthWizard/CreateOAuthWizard.tsx';
import { SecurityIntegrationDetails } from '@snowsight/feature-integrations/snowflakeOauth/SecurityIntegrationDetailsPage/SecurityIntegrationDetailsPage.tsx';
import { IntelligenceAdminPage } from '@snowsight/feature-intelligence-admin/IntelligenceAdminPage.tsx';
import { INTERNAL_MARKETPLACE_PREFIX } from '@snowsight/feature-internal-marketplace/constant/internalMarketplaceRoutes.ts';
import { InternalMarketplaceSetup } from '@snowsight/feature-internal-marketplace/InternalMarketplaceSetup.tsx';
import { MarketplaceBillingPage } from '@snowsight/feature-marketplace-billing/MarketplaceBillingPage.tsx';
import { MLObservabilityDashboardPage } from '@snowsight/feature-ml-observability/MLObservabilityDashboardPage.tsx';
import { CentralizedEventTablesPage } from '@snowsight/feature-native-apps/centralizedEventTables/CentralizedEventTablesPage.tsx';
import { NativeAppsComponentWrapper } from '@snowsight/feature-native-apps/NativeAppsComponentWrapper.tsx';
import { OpenflowObservabilityPage } from '@snowsight/feature-openflow-observability/OpenflowObservabilityPage.tsx';
import { OracleLicensingPage } from '@snowsight/feature-oracle-licensing/OracleLicensingPage.tsx';
import { OrganizationHubPage } from '@snowsight/feature-organization-hub/OrganizationHubPage.tsx';
import { OrganizationOverviewPage } from '@snowsight/feature-organization-overview/OrganizationOverviewPage.tsx';
import { PerformanceExplorerPage } from '@snowsight/feature-performance-explorer/PerformanceExplorerPage.tsx';
import { PostgresPage } from '@snowsight/feature-postgres/PostgresPage.tsx';
import { PrivateSharingReaderAccountsPage } from '@snowsight/feature-private-sharing-reader-accounts/PrivateSharingReaderAccountsPage.tsx';
import { PromptStudioPage } from '@snowsight/feature-prompt-studio/PromptStudioPage.tsx';
import { ProviderStudioImProfilesPage } from '@snowsight/feature-provider-studio-im-profiles/ProviderStudioImProfilesPage.tsx';
import { ProviderStudioLearnPage } from '@snowsight/feature-provider-studio-learn/ProviderStudioLearnPage.tsx';
import { QueryHistoryPage } from '@snowsight/feature-query-history/QueryHistoryPage.tsx';
import { ResourceMonitorDetailsPage } from '@snowsight/feature-resourceMonitors/ResourceMonitorDetailsPage.tsx';
import { ResourceMonitorsPage } from '@snowsight/feature-resourceMonitors/ResourceMonitorsPage.tsx';
import { DataSecuritySetup } from '@snowsight/feature-security/dspm/DataSecuritySetup.tsx';
import { TrustCenterPage } from '@snowsight/feature-security/trustCenter/TrustCenterPage.tsx';
import { CreateServiceWizard } from '@snowsight/feature-services-and-jobs/components/CreateServiceWizard/CreateServiceWizard.tsx';
import { ServiceLogsPage } from '@snowsight/feature-services-and-jobs/serviceDetails/logsTab/ServiceLogsPage.tsx';
import { StatusPage } from '@snowsight/feature-status/StatusPage.tsx';
import { WarehousePage } from '@snowsight/feature-warehouse/warehouseList/WarehousePage.tsx';
import { localeCatalogs } from '@snowsight/i18n/messageCatalog.ts';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { IntlProvider } from 'react-intl';
import { HashRouter, useLocation, useRoutes } from 'react-router-dom';
import type { FederatedAppProps } from './appProps.model.ts';
import { syncGlobalStates } from './globalStateSync';

// Set view context immediately when the module loads
setPepViewContext();

// Initialize global state synchronization
syncGlobalStates();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      retry: false,
      staleTime: 60000,
    },
  },
});

/**
 * @deprecated Use Pages or Components instead
 */
// Create a wrapper component that includes the content with search params
const AppContent = (props: FederatedAppProps) => {
  const location = useLocation();
  const getPageParam = () => {
    const searchParams = new URLSearchParams(location.search);
    return props.page || searchParams.get('page') || PepPage.DEFAULT;
  };
  const pageParam = getPageParam();
  const { theme } = useTheme();
  const pageContent = useMemo(() => {
    switch (pageParam) {
      case PepPage.COPY_HISTORY:
        if ('copyHistoryProps' in props && props.copyHistoryProps !== undefined) {
          return <CopyHistoryPage {...props.copyHistoryProps} />;
        }
        return <CopyHistoryPage navigateToDatabaseView={undefined} noHeader={undefined} />;
      case PepPage.ANOMALY_DETECTION:
        return <AnomalyDetectionPage />;
      case PepPage.BUDGETS:
        if ('budgetProps' in props && props.budgetProps !== undefined) {
          return <BudgetPage {...props.budgetProps} />;
        }
        return (
          <BudgetPage
            navigateToBudgetDetails={undefined}
            budget={undefined}
            navigateToWarehouse={undefined}
            navigateToResourceMonitor={undefined}
          />
        );
      case PepPage.IM_PROFILES_DETAILS:
        return <ImProfilesDetailsPage />;
      case PepPage.ACCOUNTS:
        return <AccountsPage />;
      case PepPage.ORG_OVERVIEW:
        if ('organizationOverviewProps' in props && props.organizationOverviewProps !== undefined) {
          return <OrganizationOverviewPage {...props.organizationOverviewProps} />;
        }
        return <OrganizationOverviewPage navigateToConsumptionView={undefined} />;
      case PepPage.ORGANIZATION_HUB:
        return <OrganizationHubPage />;
      case PepPage.ORACLE_LICENSING:
        return <OracleLicensingPage />;
      case PepPage.COMPUTE_POOLS:
        return <ComputePoolsPage />;
      case PepPage.COMPUTE_POOL_DETAIL:
        return <ComputePoolDetailsPage />;
      case PepPage.RESOURCE_MONITORS:
        if ('resourceMonitorProps' in props && props.resourceMonitorProps !== undefined) {
          return <ResourceMonitorsPage {...props.resourceMonitorProps} />;
        }
        return <ResourceMonitorsPage />;
      case PepPage.RESOURCE_MONITORS_DETAIL:
        return <ResourceMonitorDetailsPage />;
      case PepPage.WAREHOUSE:
        return <WarehousePage />;
      case PepPage.PERFORMANCE_EXPLORER:
        if ('performanceExplorerProps' in props && props.performanceExplorerProps !== undefined) {
          return <PerformanceExplorerPage {...props.performanceExplorerProps} />;
        }
        return <PerformanceExplorerPage noHeader={undefined} />;
      case PepPage.QUERY_HISTORY:
        if ('queryHistoryProps' in props && props.queryHistoryProps !== undefined) {
          return <QueryHistoryPage {...props.queryHistoryProps} />;
        }
        return <QueryHistoryPage />;
      case PepPage.GROUPED_QUERY_HISTORY:
        if ('groupedQueryHistoryProps' in props && props.groupedQueryHistoryProps !== undefined) {
          return <GroupedQueryHistoryPage {...props.groupedQueryHistoryProps} />;
        }
        return <GroupedQueryHistoryPage />;
      case PepPage.GROUPED_QUERY_HISTORY_QUERY_HASH_DETAILS:
        if (
          'groupedQueryHistoryQueryHashDetailsProps' in props &&
          props.groupedQueryHistoryQueryHashDetailsProps !== undefined
        ) {
          return (
            <GroupedQueryHistoryQueryHashDetailsPage
              {...props.groupedQueryHistoryQueryHashDetailsProps}
            />
          );
        }
        return <GroupedQueryHistoryQueryHashDetailsPage showHeader={true} />;
      case PepPage.AGENTS_ADMIN:
        return <IntelligenceAdminPage />;
      case PepPage.DATA_SECURITY:
        return <DataSecuritySetup />;
      case PepPage.DEBUG_PANEL:
        if ('debugPanelProps' in props && props.debugPanelProps !== undefined) {
          return <DebugPanel {...props.debugPanelProps} />;
        }
        return null;
      case PepPage.DATA_PROFILE_PAGE:
        if ('dataProfileProps' in props && props.dataProfileProps !== undefined) {
          return <DataProfilePage {...props.dataProfileProps} />;
        }
        return (
          <DataProfilePage
            fullyQualifiedName=""
            objType=""
            isMonitoringSetup={false}
            onSetupMonitoring={() => {}}
          />
        );
      case PepPage.DOCUMENT_AI_PLAYGROUND:
        if ('documentAiPlaygroundProps' in props && props.documentAiPlaygroundProps !== undefined) {
          return <DocumentAiPlaygroundPage />;
        }
        return <DocumentAiPlaygroundPage />;
      case PepPage.POSTGRES:
        return <PostgresPage />;
      case PepPage.PRIVATE_SHARING_READER_ACCOUNTS:
        return <PrivateSharingReaderAccountsPage />;
      case PepPage.PROVIDER_STUDIO_IM_PROFILES:
        return <ProviderStudioImProfilesPage />;
      case PepPage.PROVIDER_STUDIO_LEARN_PAGE:
        return <ProviderStudioLearnPage />;
      case PepPage.PROMPT_STUDIO:
        return <PromptStudioPage />;
      case PepPage.APPLICATIONS:
        if ('nativeAppsProps' in props && props.nativeAppsProps !== undefined) {
          return (
            <NativeAppsComponentWrapper
              {...props.nativeAppsProps}
              componentName={props.nativeAppsProps.componentName || 'ApplicationsPage'}
            />
          );
        }
        return <NativeAppsComponentWrapper componentName="ApplicationsPage" />;
      case PepPage.ADMIN_CONTACTS:
        if ('adminContactsProps' in props && props.adminContactsProps !== undefined) {
          return <AdminContactsPage {...props.adminContactsProps} />;
        }
        return <AdminContactsPage />;
      // TODO (APPS-59834) remove once non-hashed routes are supported
      case PepPage.INTERNAL_MARKETPLACE_HOME:
        return <InternalMarketplaceSetup />;
      case PepPage.MARKETPLACE_BILLING:
        return <MarketplaceBillingPage />;
      case PepPage.CORTEX_SEARCH_EVALUATION:
      case PepPage.CORTEX_SEARCH_GOLDEN_SET_DETAILS:
      case PepPage.CORTEX_SEARCH_EVALUATION_RUN_DETAILS:
        return <CortexSearchEvalPageWrapper />;
      case PepPage.CORTEX_SEARCH_ADMIN_MAIN:
        return <CortexSearchAdminMainPage />;
      case PepPage.CORTEX_SEARCH_PLAYGROUND:
        return <CortexSearchPlaygroundWrapper />;
      case PepPage.CORTEX_SEARCH_SERVICES:
        return <CortexSearchServicesPage />;
      case PepPage.DYNAMIC_TABLES:
        if ('dynamicTablesProps' in props && props.dynamicTablesProps !== undefined) {
          return <DynamicTablesPage {...props.dynamicTablesProps} />;
        }
        return <DynamicTablesPage />;
      case PepPage.INTEGRATIONS:
        if ('integrationsProps' in props && props.integrationsProps !== undefined) {
          return <IntegrationsPage {...props.integrationsProps} />;
        }
        return null;
      case PepPage.INTEGRATIONS_DETAIL:
        // Flattened routing logic from IntegrationsSetup - check federated context
        if (props.page === PepPage.CREATE_OAUTH_WIZARD) {
          if ('createOAuthWizardProps' in props && props.createOAuthWizardProps !== undefined) {
            return <CreateOAuthWizard {...props.createOAuthWizardProps} />;
          }
          return <CreateOAuthWizard />;
        }
        if (props.page === PepPage.SECURITY_INTEGRATION_DETAILS) {
          if (
            'securityIntegrationDetailsProps' in props &&
            props.securityIntegrationDetailsProps !== undefined
          ) {
            return <SecurityIntegrationDetails {...props.securityIntegrationDetailsProps} />;
          }
          const searchParams = new URLSearchParams(location.search);
          const integrationName = searchParams.get('integrationName') || '';
          return <SecurityIntegrationDetails integrationName={integrationName} />;
        }
        return <IntegrationDetailsPage />;
      case PepPage.EXPERIMENT_TRACKING:
        return <ExperimentTrackingPage />;
      case PepPage.SECURITY_INTEGRATION_DETAILS: {
        if (
          'securityIntegrationDetailsProps' in props &&
          props.securityIntegrationDetailsProps !== undefined
        ) {
          return <SecurityIntegrationDetails {...props.securityIntegrationDetailsProps} />;
        }
        // Read integrationName from URL parameters when navigating directly
        const searchParams = new URLSearchParams(location.search);
        const integrationName = searchParams.get('integrationName') || '';
        return <SecurityIntegrationDetails integrationName={integrationName} />;
      }
      case PepPage.TRUST_CENTER_FINDINGS:
        return <TrustCenterPage />;
      case PepPage.CENTRALIZED_EVENT_TABLES:
        return <CentralizedEventTablesPage />;
      case PepPage.CREATE_SERVICE_WIZARD:
        if ('createServiceWizardProps' in props && props.createServiceWizardProps !== undefined) {
          return <CreateServiceWizard {...props.createServiceWizardProps} />;
        }
        return <CreateServiceWizard />;
      case PepPage.SERVICE_LOGS:
        if ('serviceLogsProps' in props && props.serviceLogsProps !== undefined) {
          return <ServiceLogsPage {...props.serviceLogsProps} />;
        }
        return <ServiceLogsPage serviceData={undefined} />;
      case PepPage.ML_OBSERVABILITY_DASHBOARD:
        return <MLObservabilityDashboardPage />;
      case PepPage.EXAMPLE:
        return <ExamplePage />;
      case 'lineage':
        return <LineagePage />;
      case PepPage.STATUS:
      case PepPage.DEFAULT:
      default:
        return <StatusPage />;
    }
  }, [pageParam, props, location.search]);

  useEffect(() => {
    // Fetch a new token from coldbrew, and see if it is valid
    // If it is valid, cache token in memory
    // If it is not valid, sign out the user and reload the page
    fetchAndSetToken();
  }, []);

  const routes = useRoutes([
    {
      path: '/trust-center/data-security/*',
      element: <DataSecuritySetup />,
    },
    { path: '/organization-hub/*', element: <OrganizationHubPage /> },
    {
      path: `${INTERNAL_MARKETPLACE_PREFIX}/*`,
      element: <InternalMarketplaceSetup />,
    },
    { path: '/openflow-observability/*', element: <OpenflowObservabilityPage /> },
    {
      path: '/account/usage/anomaly',
      element: <AnomalyDetectionPage />,
    },
    {
      path: '/account/usage/overview',
      element: <AccountOverviewPage />,
    },
    {
      path: '/document-ai-playground/*',
      element: <DocumentAiPlaygroundPage />,
    },
    {
      path: '/governance/lineage/*',
      element: <LineagePage />,
    },
    {
      path: '/data/integrations/:integrationName',
      element: (() => {
        // Check federated context for OAuth wizard
        if (props.page === PepPage.CREATE_OAUTH_WIZARD) {
          if ('createOAuthWizardProps' in props && props.createOAuthWizardProps !== undefined) {
            return <CreateOAuthWizard {...props.createOAuthWizardProps} />;
          }
          return <CreateOAuthWizard />;
        }
        // Check for security integration details
        if (props.page === PepPage.SECURITY_INTEGRATION_DETAILS) {
          if (
            'securityIntegrationDetailsProps' in props &&
            props.securityIntegrationDetailsProps !== undefined
          ) {
            return <SecurityIntegrationDetails {...props.securityIntegrationDetailsProps} />;
          }
          const searchParams = new URLSearchParams(location.search);
          const integrationName = searchParams.get('integrationName') || '';
          return <SecurityIntegrationDetails integrationName={integrationName} />;
        }
        return <IntegrationDetailsPage />;
      })(),
    },
    {
      path: '/document-ai-core/*',
      element: <DocumentAiCoreSetup />,
    },
    {
      path: '/data/integrations/*',
      element: (() => {
        // Check federated context for OAuth wizard
        if (props.page === PepPage.CREATE_OAUTH_WIZARD) {
          if ('createOAuthWizardProps' in props && props.createOAuthWizardProps !== undefined) {
            return <CreateOAuthWizard {...props.createOAuthWizardProps} />;
          }
          return <CreateOAuthWizard />;
        }
        if (props.page === PepPage.INTEGRATIONS) {
          if ('integrationsProps' in props && props.integrationsProps !== undefined) {
            return <IntegrationsPage {...props.integrationsProps} />;
          }
        }
        return null;
      })(),
    },
    { path: '*', element: pageContent },
  ]);

  return (
    <FederatedContextProvider value={props}>
      <QueryClientProvider client={queryClient}>
        <BaltoProvider colorScheme={theme} addBaseColors disableIsolation>
          {pageParam === PepPage.DEBUG_PANEL ? pageContent : routes}
        </BaltoProvider>
      </QueryClientProvider>
    </FederatedContextProvider>
  );
};

export const App = (props: FederatedAppProps) => {
  const [currentLocale, setCurrentLocale] = useState<SupportedLocales>(
    i18nState().locale as SupportedLocales,
  );

  useEffect(() => {
    // Subscribe to the locale state, afterwards it can be accessed via the IntlProvider
    // example: const { locale } = useIntl();
    const unsubI18nState = i18nState.subscribe(({ locale }) =>
      setCurrentLocale(locale as SupportedLocales),
    );

    // Set PEP context for DataDog
    // TODO: Remove following a later Snowsight release
    const removePepContext = setPepGlobalContext();

    // Unsubscribe from the locale state and remove PEP context
    return () => {
      unsubI18nState();
      removePepContext();
    };
  }, []);

  return (
    <StrictMode>
      <IntlProvider messages={localeCatalogs[currentLocale]()} locale={currentLocale}>
        <HashRouter>
          <AppContent {...props} />
        </HashRouter>
      </IntlProvider>
    </StrictMode>
  );
};

const BridgedApp = createBridgeComponent({
  rootComponent: App,
});

export default BridgedApp;