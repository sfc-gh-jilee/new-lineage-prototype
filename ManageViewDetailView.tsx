import { List, ListItem, PreviewPill } from '@snowflake/core-ui';
import { SchemaObjectTypeFE } from '@snowflake/crud-gen-models';
import { flags } from '@snowflake/flags';
import React from 'react';
import type { IntlShape } from 'react-intl';
import { useIntl } from 'react-intl';
import { isEnterpriseOrUpEdition } from '../../../accountAndRegion/functions/edition';
import { MLFeatureViewManageViewDetailSectionContainer } from '../../../cortex/featureStore/containers/FeatureViewManageViewDetailSectionContainer';
import { useDocsUrl } from '../../../externalLinks/hooks/useDocsUrl';
import { DeprecatedPepRemoteComponent } from '../../../pep/DeprecatedPepRemoteComponent';
import { getDataManageUrl } from '../../../routing/domains/databases/functions/getDataManageUrl';
import { DatabaseListControllerNavigation } from '../../../routing/domains/databases/navigationClasses/DatabaseListControllerNavigation';
import {
  DataQualitySubTabs,
  ManageViewDetailTabs,
  ManageViewDetailTabsDeprecated,
} from '../../../routing/domains/databases/routeTypes/dataManageNavigationEnums';
import type { BaseUrlDataType } from '../../../routing/routeTypes/BaseUrlDataType';
import type { QueryData } from '../../../routing/types/QueryData';
import type { SecurableHooks } from '../../../securableHooks/core/SecurableHooks';
import { DetailLevels } from '../../../securableStoreTypes/DetailLevels';
import { SecurableType } from '../../../securableStoreTypes/SecurableType';
import type { SecurableId } from '../../../securableStoreTypes/core/SecurableId';
import { isFeatureStoreEnabled } from '../../../stores/functions/cortex/isFeatureStoreEnabled';
import { useStores } from '../../../stores/hooks/stores';
import { useIsFeatureContactObjectEnabled } from '../../../stores/searchFeatures/hooks/useIsFeatureContactObjectEnabled';
import { isEligibleForTagging } from '../../ax/utils/TagUtil';
import type { ManageAXHookResult } from '../../controllers/compute/hooks/useManageAXControllerHooks';
import { LineagePage } from '../../dataGovernanceLineage/components/v2/LineagePage';
import { useDGLineageEnabled } from '../../dataGovernanceLineage/hooks/useDGLineageEnabled';
import { DataQualityPage } from '../../dataQuality/components/DataQualityPage';
import { useIsDataQualityUIEnabled } from '../../dataQuality/hooks/useIsDataQualityUIEnabled';
import { shouldShowDataQualityTab } from '../../dataQuality/utils/shouldShowDataQualityTab';
import { DescribeTableButton } from '../../generateCortexDescription/components/DescribeTableButton';
import { isSnowflakeDatabase } from '../../generateCortexDescription/functions/CortexDescriptionUtil';
import type { CortexId } from '../../generateCortexDescription/functions/CortexObjectDescriptionTypes';
import type { PageHeaderProps, SubnavProps } from '../../shared/PageHeader';
import { Subnav } from '../../shared/Subnav';
import { SyntheticDataGenerateDialogProvider } from '../../syntheticDataGeneration/shared/layout/SyntheticDataGenerateDialogProvider';
import { ColumnList, ColumnStickyControlBar } from '../components/ColumnList';
import { DefinitionListItem } from '../components/DDLSectionFrame';
import { DataPreviewTab } from '../components/DataPreview';
import { DescriptionSection } from '../components/DescriptionSection';
import { HeaderActionMenuButton } from '../components/HeaderActionMenuButton';
import { PolicySection } from '../components/PolicySection';
import { SilentWrapper, WrapperForSharedDB, useIsSharedDb } from '../components/SilentWrapper';
import { TagSection } from '../components/TagSection';
import { ContactsSectionForObject } from '../components/contactObject/ContactsSectionForObject';
import { GrantSection } from '../components/grant/GrantSection';
import { PipelineListItem } from '../components/pipelines/PipelineListItem';
import { INFORMATION_SCHEMA } from '../consts/databaseConsts';
import { useCheckApplyTagsAndPolicyPrivileges } from '../hooks/DataGovernanceHooks';
import { useHasAccountAdminOrGovernanceViewerAndObjectViewer } from '../hooks/useHasAccountAdminOrGovernanceViewerAndObjectViewer';
import type { ManageViewPropsWithDatabaseAndSchema } from '../types/ManageViewPropsWithDatabaseAndSchema';
import type { ManageViewPropsWithDatabaseSchemaAndSchemaObj } from '../types/ManageViewPropsWithDatabaseSchemaAndSchemaObj';
import { getTabLabel } from '../utils/dataManageFormatMessageHelpers';
import { filterReferredUrlParams } from '../utils/filterReferredUrlParams';
import { getBreadcrumbs } from '../utils/getBreadcrumbs';
import { getBreadcrumbsFromQuery } from '../utils/getBreadcrumbsFromQuery';
import { getSecurableIdForUrlId } from '../utils/getSecurableIdForUrlId';
import { shouldShowLineageTab } from '../utils/shouldShowLineageTab';
import { GovernanceTab } from './ManageTableDetailView';

// Default tab for information schema view is Columns since view details is empty
// Default tab for regular view is view details
const getDefaultTabForSchema = (schema: string) => {
  return schema === INFORMATION_SCHEMA
    ? ManageViewDetailTabs.columns
    : ManageViewDetailTabs.viewDetails;
};

export class ManageViewDetailPage {
  static getTitle(
    urlData: BaseUrlDataType & { schemaObj: string },
    formatMessage: IntlShape['formatMessage'],
  ) {
    return formatMessage(
      { id: '{pageTitle} | {pageSubtitle}' },
      {
        pageTitle: urlData.schemaObj,
        pageSubtitle: formatMessage({ id: 'View' }),
      },
    );
  }

  static getHeader(
    urlData: BaseUrlDataType & { schemaObj: string },
    formatMessage: IntlShape['formatMessage'],
    navigate: (path: string) => void,
    editButtonEnabled: boolean,
    urlQueryData?: QueryData,
    isSyntheticDataGenerationEnabled?: boolean,
  ): PageHeaderProps {
    // Create view ID for ExplainTableButton - determine if it's a materialized view or regular view
    const isView = urlData.objType === 'view';
    const viewId: CortexId = {
      type: isView ? SecurableType.VIEW : SecurableType.MATERIALIZED_VIEW,
      database: urlData.database,
      schema: urlData.schema || '',
      name: urlData.schemaObj || '',
    };

    return {
      title: urlData.schemaObj,
      linkAriaLabel: formatMessage({ id: 'Back to databases' }),
      breadcrumbs:
        getBreadcrumbsFromQuery(urlData, urlQueryData) ||
        getBreadcrumbs(urlData, formatMessage, navigate),
      titleIcon: {
        icon: 'database',
        href: DatabaseListControllerNavigation.getURL({
          org: urlData.org,
          region: urlData.region,
        }),
        onClick: () =>
          DatabaseListControllerNavigation.goBackOrNavigate({
            org: urlData.org,
            region: urlData.region,
          }),
      },
      auxContent: (
        <>
          <DescribeTableButton id={viewId} />
          {editButtonEnabled ? (
            <SilentWrapper>
              <WrapperForSharedDB database={urlData.database}>
                <SyntheticDataGenerateDialogProvider>
                  <HeaderActionMenuButton
                    clone={false}
                    urlData={urlData}
                    navigate={navigate}
                    showSyntheticData={isSyntheticDataGenerationEnabled}
                  />
                </SyntheticDataGenerateDialogProvider>
              </WrapperForSharedDB>
            </SilentWrapper>
          ) : null}
        </>
      ),
      auxContentContainerProps: { display: 'flex' },
    };
  }

  static getFetchAll(securables: SecurableHooks, id: SecurableId<SecurableType.VIEW>) {
    return (force: boolean) => {
      securables.securableStore.get(securables.role, id, DetailLevels.describe, {
        forceRefresh: force,
      });
    };
  }
}

export function ManageViewDetailView(
  props: ManageViewPropsWithDatabaseSchemaAndSchemaObj & {
    navigate: (path: string) => void;
    hookResult: ManageAXHookResult;
  },
): JSX.Element {
  const { urlData } = props;
  const { schema } = urlData;
  const id: SecurableId<SecurableType.VIEW | SecurableType.MATERIALIZED_VIEW> =
    getSecurableIdForUrlId(urlData) as SecurableId<
      SecurableType.VIEW | SecurableType.MATERIALIZED_VIEW
    >;
  const { cannotEditTags, cannotEditRowAccessPolicy, cannotEditMaskingPolicies } =
    useCheckApplyTagsAndPolicyPrivileges(id);

  const viewDetailTab = props.urlData.tab || getDefaultTabForSchema(schema);

  switch (viewDetailTab) {
    case ManageViewDetailTabs.viewDetails:
      return (
        <ViewDetailTab
          {...props}
          cannotEditTags={cannotEditTags}
          cannotEditPolicy={cannotEditRowAccessPolicy}
        />
      );
    case ManageViewDetailTabs.governance:
      return (
        <GovernanceTab
          {...props}
          objType={SchemaObjectTypeFE.VIEW}
          cannotEditTags={cannotEditTags}
          cannotEditPolicy={cannotEditRowAccessPolicy}
        />
      );
    case ManageViewDetailTabs.columns:
      return (
        <ColumnList<SecurableType.VIEW>
          {...props}
          cannotEditTags={cannotEditTags}
          cannotEditPolicies={cannotEditMaskingPolicies}
        />
      );
    case ManageViewDetailTabsDeprecated.dataPreview:
    case ManageViewDetailTabs.dataPreview:
      return <DataPreviewTab {...props} />;
    case ManageViewDetailTabs.lineage:
      // Parameter is an extra guard to hide the lineage graph UI as the user can still
      // navigate to /lineage in the URL
      if (true) {
        return <DeprecatedPepRemoteComponent page="lineage" componentName="lineage" />;
      }
      return <LineagePage {...props} />;
    case ManageViewDetailTabs.dataQuality:
      return <DataQualityPage {...props} />;
    default:
      return schema === INFORMATION_SCHEMA ? (
        <ColumnList<SecurableType.VIEW> {...props} />
      ) : (
        <ViewDetailTab {...props} />
      );
  }
}

function ViewDetailTab(
  props: ManageViewPropsWithDatabaseSchemaAndSchemaObj & {
    cannotEditTags?: boolean;
    cannotEditPolicy?: boolean;
  },
): JSX.Element {
  const { urlData, cannotEditTags, cannotEditPolicy } = props;
  const { database, schema, schemaObj } = urlData;
  const { organization } = useStores(['organization']);
  const isEnterpriseOrUpEditionFeatureEnabled = isEnterpriseOrUpEdition(organization?.edition);
  const isTaggingEnabled = isEligibleForTagging(organization?.edition);

  // Hide Description Section for Snowflake DB
  const isSnowflakeDB = isSnowflakeDatabase(database);

  const { formatMessage } = useIntl();

  const id: SecurableId<SecurableType.VIEW | SecurableType.MATERIALIZED_VIEW> =
    getSecurableIdForUrlId(urlData) as SecurableId<
      SecurableType.VIEW | SecurableType.MATERIALIZED_VIEW
    >;

  const isContactObjectEnabled = useIsFeatureContactObjectEnabled();

  return (
    <List borderColor="none" itemPadding={12} paddingTop={12} paddingBottom={32}>
      <>
        {isSnowflakeDB ? null : <DescriptionSection id={id} />}
        {isFeatureStoreEnabled() && (
          <MLFeatureViewManageViewDetailSectionContainer
            database={database}
            schema={schema}
            featureViewTableName={schemaObj}
          />
        )}
        {isContactObjectEnabled ? (
          <ContactsSectionForObject
            type={SecurableType.VIEW}
            database={database}
            schema={schema}
            schemaObj={schemaObj}
          />
        ) : null}
        <DefinitionListItem
          title={formatMessage({ id: 'View definition' })}
          id={id}
          database={database}
          schema={schema}
        />
        {isTaggingEnabled ? <TagSection id={id} cannotEdit={cannotEditTags} /> : null}
        {isEnterpriseOrUpEditionFeatureEnabled ? (
          <PolicySection id={id} cannotEdit={cannotEditPolicy} />
        ) : null}
        <PipelineListItem id={id} urlData={urlData} />
        <ListItem>
          <GrantSection
            database={database}
            schema={schema}
            schemaObj={schemaObj}
            objType={SchemaObjectTypeFE.VIEW}
          />
        </ListItem>
      </>
    </List>
  );
}

export function ManageViewDetailSubNav({
  urlData,
  urlQueryData,
}: {
  urlData: BaseUrlDataType & { schema: string };
  urlQueryData?: QueryData;
}): JSX.Element {
  const { region, org, database, schema, objType, schemaObj, tab } = urlData;
  const { formatMessage } = useIntl();
  const { getDocsUrl } = useDocsUrl();
  const isLineageEnabled = useDGLineageEnabled();

  const activeTab = tab || getDefaultTabForSchema(schema);
  const isSharedDb = useIsSharedDb(database);
  const hasAccountAdminOrGovernanceViewerAndObjectViewer =
    useHasAccountAdminOrGovernanceViewerAndObjectViewer();
  const isObjectInsightsEnabled =
    flags.UI_ENABLE_AX_OBJECT_INSIGHTS() && hasAccountAdminOrGovernanceViewerAndObjectViewer;
  const isDataQualityUIPrPrEnabled = useIsDataQualityUIEnabled();
  const previewPillGovernanceUrl = getDocsUrl('/LIMITEDACCESS/ui-snowsight-insights');
  const previewPillDataQualityUrl = getDocsUrl('/alias/data-governance/ui-snowsight-data-quality');

  const memoTabs = React.useMemo(() => {
    const filteredQueryData = filterReferredUrlParams(urlQueryData);

    const tabs: SubnavProps['tabs'] = [];

    Object.values(ManageViewDetailTabs).forEach((tabLabel) => {
      //Information schema view will not have view details tab
      if (
        (tabLabel === ManageViewDetailTabs.viewDetails && schema === INFORMATION_SCHEMA) ||
        (tabLabel === ManageViewDetailTabs.governance && !isObjectInsightsEnabled) ||
        (tabLabel === ManageViewDetailTabs.lineage &&
          (schema === INFORMATION_SCHEMA ||
            !shouldShowLineageTab({ isSharedDb, isLineageEnabled })))
      ) {
        return;
      }

      if (
        tabLabel === ManageViewDetailTabs.dataQuality &&
        !shouldShowDataQualityTab({
          isDataQualityEnabled: isDataQualityUIPrPrEnabled,
          // Views and materialized views are supported by DQ UI.
          isObjectTypeUISupported: objType === 'view' || objType === 'materialized-view',
          isSharedDb,
          database,
          schema,
        })
      ) {
        return;
      }

      let afterTitleElement: JSX.Element | undefined = undefined;
      if (tabLabel === ManageViewDetailTabs.dataQuality) {
        afterTitleElement = <PreviewPill href={previewPillDataQualityUrl} marginLeft={8} />;
      } else if (tabLabel === ManageViewDetailTabs.governance) {
        afterTitleElement = <PreviewPill href={previewPillGovernanceUrl} marginLeft={8} />;
      }

      tabs.push({
        id: tabLabel,
        title: getTabLabel(formatMessage, tabLabel),
        href: getDataManageUrl(
          {
            region,
            org,
            database,
            schema,
            objType: objType!,
            schemaObj: schemaObj!,
            tab: tabLabel,
            subtab:
              tabLabel === ManageViewDetailTabs.dataQuality
                ? DataQualitySubTabs.monitoring
                : undefined,
          },
          filteredQueryData,
        ),
        afterTitleElement,
      });
    });

    return tabs;
  }, [
    schema,
    isObjectInsightsEnabled,
    isSharedDb,
    isLineageEnabled,
    isDataQualityUIPrPrEnabled,
    objType,
    database,
    formatMessage,
    region,
    org,
    schemaObj,
    urlQueryData,
    previewPillGovernanceUrl,
    previewPillDataQualityUrl,
  ]);

  return <Subnav selected={activeTab as string} tabs={memoTabs} />;
}

export function ManageViewDetailViewStickyContent(
  props: ManageViewPropsWithDatabaseAndSchema,
): JSX.Element | null {
  const { urlData, searchValue, setSearchValue } = props;
  const activeTab = urlData.tab || getDefaultTabForSchema(urlData.schema);

  switch (activeTab) {
    case ManageViewDetailTabs.columns:
      return (
        <ColumnStickyControlBar<SecurableType.VIEW>
          urlData={urlData}
          searchValue={searchValue}
          setSearchValue={setSearchValue}
        />
      );
    default:
      return null;
  }
}