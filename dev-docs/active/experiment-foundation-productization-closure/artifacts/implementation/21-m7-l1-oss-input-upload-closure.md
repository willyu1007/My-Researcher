# T-132 M7-L1 OSS input upload closure

Date: 2026-07-27

Scope: authorized external SciFact download, deterministic slicing, upload of
the exact workload and two dataset objects, and read-only remote verification.
This checkpoint does not authorize a capability change, controller STS
issuance, `CreateJob`, provider compute or scientific evidence.

## Source and slice

- Official BEIR SciFact archive:
  `https://public.ukp.informatik.tu-darmstadt.de/thakur/BEIR/datasets/scifact.zip`
- Official archive MD5: `5f7d1de60b170fc8027bb7898e2efca1`
- Downloaded archive SHA-256:
  `536e14446a0ba56ed1398ab1055f39fe852686ecad24a6306c80c490fa8e0165`
- Corpus: complete 5,183-record BEIR SciFact corpus, preserving source bytes.
- Queries: the 300 unique IDs referenced by `qrels/test.tsv`, preserving source
  `queries.jsonl` order.
- Qrels and training data were not uploaded.
- License evidence is frozen in
  `workloads/ragperf-canary/manifests/scifact-mirrors-v1.json`.

## Upload route

The owner completed Cloud Shell phone verification. Cloud Shell was used with
the logged-in identity's temporary credentials, so no long-lived AK/SK was
created, viewed, copied or stored. The optional Cloud Shell performance NAS
prompt was declined; no NAS file system was created.

All OSS operations explicitly used the Bucket's regional endpoint:
`oss-cn-shanghai.aliyuncs.com`. Read-only `stat` returned `NoSuchKey` for all
three exact targets before upload, proving that the operation did not overwrite
an existing object.

The three successful commands followed this shape:

```bash
aliyun oss cp <local-file> <exact-content-addressed-oss-ref> \
  --endpoint oss-cn-shanghai.aliyuncs.com
```

## Verified objects

| Role | Exact object key | Bytes | SHA-256 | CRC64-ECMA | ETag |
|---|---|---:|---|---:|---|
| workload | `input/workload/9b2a82298dfa969146e5e223893d3d86c6254cb16a995be72b65709a55b4f05d/entrypoint.py` | 7,916 | `9b2a82298dfa969146e5e223893d3d86c6254cb16a995be72b65709a55b4f05d` | `1815526306812411307` | `9FF79D3924DAA52B1473E4352CDEB5B1` |
| corpus | `input/scifact/dec31c8182f3d744c7d2c09423756fd1d17cbef75808db13ba01cc0aab4d1ac6/corpus.jsonl` | 8,106,566 | `dec31c8182f3d744c7d2c09423756fd1d17cbef75808db13ba01cc0aab4d1ac6` | `8566302686400034898` | `26537F8AE036FDB77D847EC4F7AC1858` |
| queries | `input/scifact/f9c63730eafb7e72a9d18dd07a684516956b006096d419b41df0c1eaf8a5c520/queries.jsonl` | 56,640 | `f9c63730eafb7e72a9d18dd07a684516956b006096d419b41df0c1eaf8a5c520` | `14258960024956570564` | `561E9AA7B1812659979305A94731E3E9` |

For each object, post-upload `aliyun oss stat` content length matched the local
byte count and `X-Oss-Hash-Crc64ecma` matched local `ossutil hash`. The SHA-256
values were computed and validated before upload and are embedded in the
content-addressed object keys.

## Cost and authority boundary

- New objects total 8,171,122 bytes (about 7.8 MiB) in Standard OSS storage.
- No NAS instance, ACR instance or PAI-DLC job was created.
- No capability was enabled and both real-provider capabilities remain
  default `false`.
- `create_job_authorized` remains `false` in both manifests.
- The next live gate is still blocked by the unresolved official-image content
  identity contract, then requires fresh short-lived controller STS and an
  explicit two-job/¥50 execution authorization.
