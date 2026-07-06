/**
 * T-087 Topic Workbench module types.
 *
 * Stage / sub-tab vocabulary mirrors the shared types in
 * `apps/desktop/src/renderer/literature/shared/types.ts`. This module owns
 * the runtime types that bind UI surfaces to backend authority/workflow
 * objects under the v1a/b/c decision chain.
 *
 * Design SSOT: `dev-docs/archive/topic-selection-decision-chain-redesign/06-design-spec.md` §3977
 * Dev-docs: `dev-docs/archive/topic-selection-desktop-workbench-v1abc/02-architecture.md`
 */

import type {
  TitleCardPrimaryTabKey,
} from '../../../literature/shared/types';

export type TitleCardWorkbenchSummary = {
  title_card_id: string;
  working_title: string;
  brief: string;
  status: string;
  evidence_count: number;
  need_count: number;
  research_question_count: number;
  value_assessment_count: number;
  package_count: number;
  promotion_decision_count: number;
  latest_paper_id?: string;
  created_at: string;
  updated_at: string;
};

export type TitleCardWorkbenchListPayload = {
  items: TitleCardWorkbenchSummary[];
  summary: {
    total_title_cards: number;
    active_title_cards: number;
    promoted_title_cards: number;
    total_evidence_items: number;
    pending_promotion_cards: number;
  };
};

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

