import type { ComponentProps } from 'react';
import { AutoImportTab } from './auto-import/AutoImportTab';
import { ManualImportTab } from './manual-import/ManualImportTab';
import { OverviewTab } from './overview/OverviewTab';
import { MetadataIntakePanel } from './intake/MetadataIntakePanel';
import { ContentProcessingOperationsPanel } from './operations/ContentProcessingOperationsPanel';
import { LiteratureContentProcessingSettingsPanel } from './settings/LiteratureContentProcessingSettingsPanel';
import type { ContentProcessingSubTabKey, LiteratureTabKey } from './shared/types';

type LiteratureWorkspaceProps = {
  activeLiteratureTab: LiteratureTabKey;
  contentProcessingSubTab: ContentProcessingSubTabKey;
  autoImportTabProps: ComponentProps<typeof AutoImportTab>;
  manualImportTabProps: ComponentProps<typeof ManualImportTab>;
  overviewTabProps: ComponentProps<typeof OverviewTab>;
  metadataIntakePanelProps: ComponentProps<typeof MetadataIntakePanel>;
};

export function LiteratureWorkspace({
  activeLiteratureTab,
  contentProcessingSubTab,
  autoImportTabProps,
  manualImportTabProps,
  overviewTabProps,
  metadataIntakePanelProps,
}: LiteratureWorkspaceProps) {
  return (
    <>
      <section className="module-dashboard literature-workspace">
        <div data-ui="stack" data-direction="col" data-gap="3">
          {activeLiteratureTab === 'content-processing' ? (
            contentProcessingSubTab === 'settings' ? (
              <LiteratureContentProcessingSettingsPanel />
            ) : (
              <ContentProcessingOperationsPanel />
            )
          ) : null}
          <AutoImportTab {...autoImportTabProps} />
          <ManualImportTab {...manualImportTabProps} />
          <OverviewTab {...overviewTabProps} />
        </div>
      </section>

      <MetadataIntakePanel {...metadataIntakePanelProps} />
    </>
  );
}
