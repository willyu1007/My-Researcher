import { useState } from 'react';
import type {
  CancelExternalTrainingJobRequest,
  CollectExternalTrainingJobRequest,
  ExperimentFoundationRef,
  SubmitExternalTrainingJobRequest,
  SyncExternalTrainingJobRequest,
} from '@paper-engineering-assistant/shared/research-lifecycle/experiment-foundation-contracts';
import { RefPicker, RefPickerList } from '../components/RefPicker';

const DEFAULT_REQUESTED_BY: ExperimentFoundationRef = {
  ref_type: 'desktop_workbench',
  ref_id: 'T-110',
};
const DEFAULT_SOURCE_REFS: ExperimentFoundationRef[] = [
  { ref_type: 'desktop_workbench', ref_id: 'T-110' },
];

import type { ExperimentFoundationOperationStatus } from '../types';

/**
 * Job action lifecycle status. Aliased to the renderer-wide
 * `ExperimentFoundationOperationStatus` so the four-state union is single
 * sourced; renaming JobActionStatus or extending the union happens in one
 * place.
 */
export type JobActionStatus = ExperimentFoundationOperationStatus;

type ActionFormShellProps = {
  title: string;
  status: JobActionStatus;
  message: string | null;
  disabled?: boolean;
  ctaLabel: string;
  ctaVariant?: 'primary' | 'danger';
  onSubmit: () => void;
  children: React.ReactNode;
};

function ActionFormShell({
  title,
  status,
  message,
  disabled = false,
  ctaLabel,
  ctaVariant = 'primary',
  onSubmit,
  children,
}: ActionFormShellProps) {
  return (
    <section data-ui="section" data-padding="md">
      <div data-ui="stack" data-direction="col" data-gap="2">
        <p data-ui="text" data-variant="label" data-tone="primary">
          {title}
        </p>
        {children}
        <div data-ui="toolbar" data-align="end" data-wrap="wrap">
          {ctaVariant === 'danger' ? (
            <button
              data-ui="button"
              data-variant="danger"
              data-size="sm"
              type="button"
              disabled={disabled || status === 'loading'}
              onClick={onSubmit}
            >
              {ctaLabel}
            </button>
          ) : (
            <button
              data-ui="button"
              data-variant="primary"
              data-size="sm"
              type="button"
              disabled={disabled || status === 'loading'}
              onClick={onSubmit}
            >
              {ctaLabel}
            </button>
          )}
        </div>
        {status === 'success' && message ? (
          <p data-ui="text" data-variant="caption" data-tone="muted">
            {message}
          </p>
        ) : null}
        {status === 'error' && message ? (
          <p data-ui="text" data-variant="caption" data-tone="danger">
            {message}
          </p>
        ) : null}
      </div>
    </section>
  );
}

export type SubmitJobFormProps = {
  status: JobActionStatus;
  message: string | null;
  onSubmit: (body: SubmitExternalTrainingJobRequest) => Promise<void>;
  initial?: {
    trainingTaskSpecRef?: ExperimentFoundationRef | null;
    trainingTaskSpecHash?: string;
    materializationResultRef?: ExperimentFoundationRef | null;
    materializationResultHash?: string;
  };
};

export function SubmitJobForm({ status, message, onSubmit, initial }: SubmitJobFormProps) {
  const [specRef, setSpecRef] = useState<ExperimentFoundationRef | null>(
    initial?.trainingTaskSpecRef ?? { ref_type: 'training_task_spec', ref_id: '' },
  );
  const [specHash, setSpecHash] = useState<string>(initial?.trainingTaskSpecHash ?? '');
  const [matRef, setMatRef] = useState<ExperimentFoundationRef | null>(
    initial?.materializationResultRef ?? {
      ref_type: 'training_task_materialization_result',
      ref_id: '',
    },
  );
  const [matHash, setMatHash] = useState<string>(initial?.materializationResultHash ?? '');
  const [idempotencyKey, setIdempotencyKey] = useState<string>('');
  const [requestedBy, setRequestedBy] = useState<ExperimentFoundationRef | null>(DEFAULT_REQUESTED_BY);
  const [sourceRefs, setSourceRefs] = useState<ExperimentFoundationRef[]>(DEFAULT_SOURCE_REFS);
  const [localError, setLocalError] = useState<string | null>(null);

  const ready =
    Boolean(specRef && specRef.ref_id.trim() && matRef && matRef.ref_id.trim() && specHash.trim() && matHash.trim());

  const handleSubmit = async () => {
    if (!ready) {
      setLocalError('training_task_spec_ref/hash 和 materialization_result_ref/hash 都必填。');
      return;
    }
    if (!idempotencyKey.trim()) {
      setLocalError('idempotency_key 必填（用于去重）。');
      return;
    }
    if (!requestedBy) {
      setLocalError('requested_by_ref 必填。');
      return;
    }
    setLocalError(null);
    await onSubmit({
      training_task_spec_ref: specRef!,
      training_task_spec_hash: specHash.trim(),
      materialization_result_ref: matRef!,
      materialization_result_hash: matHash.trim(),
      idempotency_key: idempotencyKey.trim(),
      requested_by_ref: requestedBy,
      source_refs: sourceRefs.length > 0 ? sourceRefs : DEFAULT_SOURCE_REFS,
    });
  };

  return (
    <ActionFormShell
      title="Submit job"
      status={status}
      message={localError ?? message}
      ctaLabel="提交"
      onSubmit={() => void handleSubmit()}
    >
      <RefPicker
        label="training_task_spec_ref"
        refType="training_task_spec"
        allowedRefTypes={['training_task_spec']}
        value={specRef}
        onChange={setSpecRef}
        required
      />
      <label data-ui="field">
        <span data-slot="label">training_task_spec_hash *</span>
        <input
          data-ui="input"
          data-size="sm"
          value={specHash}
          onChange={(event) => setSpecHash(event.target.value)}
        />
      </label>
      <RefPicker
        label="materialization_result_ref"
        refType="training_task_materialization_result"
        allowedRefTypes={['training_task_materialization_result']}
        value={matRef}
        onChange={setMatRef}
        required
      />
      <label data-ui="field">
        <span data-slot="label">materialization_result_hash *</span>
        <input
          data-ui="input"
          data-size="sm"
          value={matHash}
          onChange={(event) => setMatHash(event.target.value)}
        />
      </label>
      <label data-ui="field">
        <span data-slot="label">idempotency_key</span>
        <input
          data-ui="input"
          data-size="sm"
          value={idempotencyKey}
          onChange={(event) => setIdempotencyKey(event.target.value)}
        />
      </label>
      <RefPicker
        label="requested_by_ref"
        refType="desktop_workbench"
        value={requestedBy}
        onChange={setRequestedBy}
      />
      <RefPickerList
        label="source_refs"
        refType="desktop_workbench"
        values={sourceRefs}
        onChange={setSourceRefs}
      />
    </ActionFormShell>
  );
}

export type SyncJobFormProps = {
  status: JobActionStatus;
  message: string | null;
  disabled?: boolean;
  onSubmit: (body: SyncExternalTrainingJobRequest) => Promise<void>;
};

export function SyncJobForm({ status, message, disabled, onSubmit }: SyncJobFormProps) {
  const [sourceRefs, setSourceRefs] = useState<ExperimentFoundationRef[]>(DEFAULT_SOURCE_REFS);

  return (
    <ActionFormShell
      title="Sync job"
      status={status}
      message={message}
      disabled={disabled}
      ctaLabel="同步"
      onSubmit={() =>
        void onSubmit({
          source_refs: sourceRefs.length > 0 ? sourceRefs : DEFAULT_SOURCE_REFS,
        })
      }
    >
      <RefPickerList
        label="source_refs"
        refType="desktop_workbench"
        values={sourceRefs}
        onChange={setSourceRefs}
      />
    </ActionFormShell>
  );
}

export type CancelJobFormProps = {
  status: JobActionStatus;
  message: string | null;
  disabled?: boolean;
  onSubmit: (body: CancelExternalTrainingJobRequest) => Promise<void>;
};

export function CancelJobForm({ status, message, disabled, onSubmit }: CancelJobFormProps) {
  const [reason, setReason] = useState<string>('');
  const [idempotencyKey, setIdempotencyKey] = useState<string>('');
  const [requestedBy, setRequestedBy] = useState<ExperimentFoundationRef | null>(DEFAULT_REQUESTED_BY);
  const [sourceRefs, setSourceRefs] = useState<ExperimentFoundationRef[]>(DEFAULT_SOURCE_REFS);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      setLocalError('reason 必填。');
      return;
    }
    if (!idempotencyKey.trim()) {
      setLocalError('idempotency_key 必填。');
      return;
    }
    if (!requestedBy) {
      setLocalError('requested_by_ref 必填。');
      return;
    }
    setLocalError(null);
    await onSubmit({
      requested_by_ref: requestedBy,
      reason: reason.trim(),
      idempotency_key: idempotencyKey.trim(),
      source_refs: sourceRefs.length > 0 ? sourceRefs : DEFAULT_SOURCE_REFS,
    });
  };

  return (
    <ActionFormShell
      title="Cancel job"
      status={status}
      message={localError ?? message}
      disabled={disabled}
      ctaLabel="取消"
      ctaVariant="danger"
      onSubmit={() => void handleSubmit()}
    >
      <label data-ui="field">
        <span data-slot="label">reason</span>
        <textarea
          data-ui="textarea"
          data-size="sm"
          rows={2}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
        />
      </label>
      <label data-ui="field">
        <span data-slot="label">idempotency_key</span>
        <input
          data-ui="input"
          data-size="sm"
          value={idempotencyKey}
          onChange={(event) => setIdempotencyKey(event.target.value)}
        />
      </label>
      <RefPicker
        label="requested_by_ref"
        refType="desktop_workbench"
        value={requestedBy}
        onChange={setRequestedBy}
      />
      <RefPickerList
        label="source_refs"
        refType="desktop_workbench"
        values={sourceRefs}
        onChange={setSourceRefs}
      />
    </ActionFormShell>
  );
}

export type CollectJobFormProps = {
  status: JobActionStatus;
  message: string | null;
  disabled?: boolean;
  onSubmit: (body: CollectExternalTrainingJobRequest) => Promise<void>;
};

export function CollectJobForm({ status, message, disabled, onSubmit }: CollectJobFormProps) {
  const [sourceRefs, setSourceRefs] = useState<ExperimentFoundationRef[]>(DEFAULT_SOURCE_REFS);

  return (
    <ActionFormShell
      title="Collect job"
      status={status}
      message={message}
      disabled={disabled}
      ctaLabel="采集结果"
      onSubmit={() =>
        void onSubmit({
          source_refs: sourceRefs.length > 0 ? sourceRefs : DEFAULT_SOURCE_REFS,
        })
      }
    >
      <RefPickerList
        label="source_refs"
        refType="desktop_workbench"
        values={sourceRefs}
        onChange={setSourceRefs}
      />
    </ActionFormShell>
  );
}
