/**
 * T-087 Topic Workbench module types.
 *
 * Stage / sub-tab vocabulary mirrors the shared types in
 * `apps/desktop/src/renderer/literature/shared/types.ts`. This module owns
 * the runtime types that bind UI surfaces to backend authority/workflow
 * objects under the v1a/b/c decision chain.
 *
 * Maintained contract: `docs/context/ui/topic-workbench.md`.
 */

import type {
  TitleCardPrimaryTabKey,
} from '../../../literature/shared/types';
import type {
  TitleCardDTO,
  TitleCardListResponse,
} from '@paper-engineering-assistant/shared/research-lifecycle/title-card-management-contracts';

export type TitleCardWorkbenchSummary = TitleCardDTO;
export type TitleCardWorkbenchListPayload = TitleCardListResponse;

export type TopicWorkbenchModuleProps = {
  /** Active title-card id (D5: lifted to App.tsx). */
  titleCardId: string | null;
  /** Setter for active title-card; used by overview view to switch active card. */
  onSetTitleCardId: (id: string | null) => void;
  /** Refresh token (parity with legacy module). */
  refreshToken: number;
  /** Primary tab from Topbar. */
  activePrimaryTab: TitleCardPrimaryTabKey;
  /** Sub-tab from Topbar (null on overview). */
  activeSecondaryTab: string | null;
  onSelectPrimaryTab: (tab: TitleCardPrimaryTabKey) => void;
  onSelectSecondaryTab: (
    tab: Exclude<TitleCardPrimaryTabKey, 'overview'>,
    subTab: string,
  ) => void;
};
