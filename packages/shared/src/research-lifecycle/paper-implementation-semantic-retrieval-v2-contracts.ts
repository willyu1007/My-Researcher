import type {
  PaperImplementationExperimentLineageClosureStateV2,
  PaperImplementationExperimentLineageTargetRefV2,
  ProjectValidationCycleLineageSummaryV2,
  ValidationCycleExperimentLineageAdmittedRevisionV2,
  ValidationCycleExperimentLineageEffectiveHeadRunV2,
} from './paper-implementation-experiment-lineage-v2-contracts.js';
import {
  projectValidationCycleLineageSummaryV2Schema,
  validationCycleExperimentLineageAdmittedRevisionV2Schema,
  validationCycleExperimentLineageEffectiveHeadRunV2Schema,
  validationCycleExperimentLineageHeaderV2Schema,
} from './paper-implementation-experiment-lineage-v2-contracts.js';
import { EXPERIMENT_V2_HASH_PATTERN } from './experiment-v2-contract-limits.js';

export const PAPER_IMPLEMENTATION_SEMANTIC_DOCUMENT_SOURCE_TYPES_V2 = Object.freeze([
  'validation_cycle',
  'effective_branch_head',
] as const);
export type PaperImplementationSemanticDocumentSourceTypeV2 =
  (typeof PAPER_IMPLEMENTATION_SEMANTIC_DOCUMENT_SOURCE_TYPES_V2)[number];

export const PAPER_IMPLEMENTATION_SEMANTIC_DOCUMENT_SCHEMA_VERSION_V2 = 'v1' as const;
export const PAPER_IMPLEMENTATION_SEMANTIC_QUERY_MAX_LENGTH_V2 = 4_000;

export interface PaperImplementationSemanticDocumentSourceRefV2 {
  source_type: PaperImplementationSemanticDocumentSourceTypeV2;
  source_id: string;
  source_version: string;
  source_hash: string;
}

export interface PaperImplementationValidationCycleSemanticDocumentContentV2 {
  source_type: 'validation_cycle';
  validation_cycle: ProjectValidationCycleLineageSummaryV2;
}

export interface PaperImplementationEffectiveBranchHeadSemanticContentV2 {
  source_type: 'effective_branch_head';
  validation_cycle: {
    validation_cycle_id: string;
    status: string;
    target_ref: PaperImplementationExperimentLineageTargetRefV2;
    created_at: string;
    closure: PaperImplementationExperimentLineageClosureStateV2;
  };
  branch: {
    branch_id: string;
    branch_key: string;
    parent_branch_key: string | null;
    current_admitted_revision: ValidationCycleExperimentLineageAdmittedRevisionV2;
    effective_head_run: ValidationCycleExperimentLineageEffectiveHeadRunV2;
  };
}

export type PaperImplementationSemanticDocumentContentV2 =
  | PaperImplementationValidationCycleSemanticDocumentContentV2
  | PaperImplementationEffectiveBranchHeadSemanticContentV2;

export interface PaperImplementationSemanticDocumentV2 {
  schema_version: typeof PAPER_IMPLEMENTATION_SEMANTIC_DOCUMENT_SCHEMA_VERSION_V2;
  document_id: string;
  implementation_project_id: string;
  source: PaperImplementationSemanticDocumentSourceRefV2;
  semantic_text: string;
  document_hash: string;
  content: PaperImplementationSemanticDocumentContentV2;
}

/**
 * The only payload a future semantic ranker may receive. The service prepares
 * this bounded set after the structured lineage reader has resolved the project.
 */
export interface PaperImplementationSemanticRankingInputV2 {
  schema_version: typeof PAPER_IMPLEMENTATION_SEMANTIC_DOCUMENT_SCHEMA_VERSION_V2;
  implementation_project_id: string;
  query: string;
  candidates: PaperImplementationSemanticDocumentV2[];
}

const nonEmptyString = { type: 'string', minLength: 1 } as const;
const nullableString = {
  anyOf: [nonEmptyString, { type: 'null' }],
} as const;
const hashSchema = {
  type: 'string',
  pattern: EXPERIMENT_V2_HASH_PATTERN,
} as const;
const validationCycleDocumentContentSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['source_type', 'validation_cycle'],
  properties: {
    source_type: { type: 'string', const: 'validation_cycle' },
    validation_cycle: projectValidationCycleLineageSummaryV2Schema,
  },
} as const;

const effectiveBranchHeadDocumentContentSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['source_type', 'validation_cycle', 'branch'],
  properties: {
    source_type: { type: 'string', const: 'effective_branch_head' },
    validation_cycle: validationCycleExperimentLineageHeaderV2Schema,
    branch: {
      type: 'object',
      additionalProperties: false,
      required: [
        'branch_id',
        'branch_key',
        'parent_branch_key',
        'current_admitted_revision',
        'effective_head_run',
      ],
      properties: {
        branch_id: nonEmptyString,
        branch_key: nonEmptyString,
        parent_branch_key: nullableString,
        current_admitted_revision: validationCycleExperimentLineageAdmittedRevisionV2Schema,
        effective_head_run: validationCycleExperimentLineageEffectiveHeadRunV2Schema,
      },
    },
  },
} as const;

export const paperImplementationSemanticDocumentSourceRefV2Schema = {
  type: 'object',
  additionalProperties: false,
  required: ['source_type', 'source_id', 'source_version', 'source_hash'],
  properties: {
    source_type: {
      type: 'string',
      enum: [...PAPER_IMPLEMENTATION_SEMANTIC_DOCUMENT_SOURCE_TYPES_V2],
    },
    source_id: nonEmptyString,
    source_version: nonEmptyString,
    source_hash: hashSchema,
  },
} as const;

const documentRequired = [
  'schema_version',
  'document_id',
  'implementation_project_id',
  'source',
  'semantic_text',
  'document_hash',
  'content',
] as const;

const documentCommonProperties = {
  schema_version: {
    type: 'string',
    const: PAPER_IMPLEMENTATION_SEMANTIC_DOCUMENT_SCHEMA_VERSION_V2,
  },
  document_id: nonEmptyString,
  implementation_project_id: nonEmptyString,
  semantic_text: nonEmptyString,
  document_hash: hashSchema,
} as const;

export const paperImplementationSemanticDocumentV2Schema = {
  oneOf: [
    {
      type: 'object',
      additionalProperties: false,
      required: documentRequired,
      properties: {
        ...documentCommonProperties,
        source: {
          ...paperImplementationSemanticDocumentSourceRefV2Schema,
          properties: {
            ...paperImplementationSemanticDocumentSourceRefV2Schema.properties,
            source_type: { type: 'string', const: 'validation_cycle' },
          },
        },
        content: validationCycleDocumentContentSchema,
      },
    },
    {
      type: 'object',
      additionalProperties: false,
      required: documentRequired,
      properties: {
        ...documentCommonProperties,
        source: {
          ...paperImplementationSemanticDocumentSourceRefV2Schema,
          properties: {
            ...paperImplementationSemanticDocumentSourceRefV2Schema.properties,
            source_type: { type: 'string', const: 'effective_branch_head' },
          },
        },
        content: effectiveBranchHeadDocumentContentSchema,
      },
    },
  ],
} as const;

export const paperImplementationSemanticRankingInputV2Schema = {
  type: 'object',
  additionalProperties: false,
  required: ['schema_version', 'implementation_project_id', 'query', 'candidates'],
  properties: {
    schema_version: {
      type: 'string',
      const: PAPER_IMPLEMENTATION_SEMANTIC_DOCUMENT_SCHEMA_VERSION_V2,
    },
    implementation_project_id: nonEmptyString,
    query: {
      type: 'string',
      minLength: 1,
      maxLength: PAPER_IMPLEMENTATION_SEMANTIC_QUERY_MAX_LENGTH_V2,
    },
    candidates: {
      type: 'array',
      items: paperImplementationSemanticDocumentV2Schema,
    },
  },
} as const;
