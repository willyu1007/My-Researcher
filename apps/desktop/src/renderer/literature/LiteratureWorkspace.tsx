import type { ComponentProps } from 'react';
import { AutoImportTab } from './auto-import/AutoImportTab';
import { ManualImportTab } from './manual-import/ManualImportTab';
import { OverviewTab } from './overview/OverviewTab';
import { MetadataIntakePanel } from './intake/MetadataIntakePanel';

type LiteratureWorkspaceProps = {
  autoImportTabProps: ComponentProps<typeof AutoImportTab>;
  manualImportTabProps: ComponentProps<typeof ManualImportTab>;
  overviewTabProps: ComponentProps<typeof OverviewTab>;
  metadataIntakePanelProps: ComponentProps<typeof MetadataIntakePanel>;
};

export function LiteratureWorkspace({
  autoImportTabProps,
  manualImportTabProps,
  overviewTabProps,
  metadataIntakePanelProps,
}: LiteratureWorkspaceProps) {
  return (
    <>
      <section className="module-dashboard literature-workspace">
        <div data-ui="stack" data-direction="col" data-gap="3">
          <AutoImportTab {...autoImportTabProps} />
          <ManualImportTab {...manualImportTabProps} />
          <OverviewTab {...overviewTabProps} />
        </div>
      </section>

      <MetadataIntakePanel {...metadataIntakePanelProps} />
    </>
  );
}
