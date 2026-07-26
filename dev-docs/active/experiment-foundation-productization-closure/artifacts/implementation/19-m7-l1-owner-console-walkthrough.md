# T-132 M7-L1 owner console walkthrough

Date: 2026-07-25

Why this document exists: creating cloud identities and buckets requires console authentication and RAM (security) changes. Everything below is the exact sequence so the manual part stays short. Codex does every repo-side artifact and every post-upload digest/manifest; the owner performs or confirms identity-sensitive actions.

Order matters: **A (bucket) → B (RAM roles) → C (official-image/OSS payload compatibility) → D (code + dataset upload) → E (window)**. B needs the bucket name from A; C must land before any object refs can become executable provider authority.

## A. OSS bucket (Aliyun console → 对象存储 OSS)

状态：**已完成并验证（2026-07-26）**。实际 Bucket 为 `pea-m7-canary-6194-202607`；地域、私有访问、SSE-OSS/AES256 和 `output/` 30 天生命周期规则均已确认。

1. 创建 Bucket：名称 `pea-m7-canary-<你的后缀>`，地域 **华东2（上海）cn-shanghai**，存储类型 标准，读写权限 **私有**。
2. 关闭公共读写与静态网站托管（默认即关，确认一眼）。
3. 服务端加密：开启 **OSS 完全托管（SSE-OSS）**。
4. 生命周期规则：前缀 `output/`，**30 天后删除**。（`input/` 不设规则，L2 收尾后手动删除。）
5. 已记录最终 Bucket 名，并已由 Codex 完成 `BUCKET_NAME` 替换与 policy 摘要复算。

## B. 两个 RAM 角色（console → 访问控制 RAM）

状态：**已完成并验证（2026-07-26）**。两个自定义策略、两个独立角色、精确可信主体和一对一策略绑定均已确认；未发现交叉授权。

1. **自定义权限策略 ×2（已完成 2026-07-26）**：
   - `pea-m7-canary-controller`：粘贴 `ram/controller-policy.json`
   - `pea-m7-canary-runtime`：粘贴 `ram/runtime-policy.json`
   - 当前摘要：controller v1 `ddde63f223f8d1982da124414ff8224aa7a431f56b51af834030b4fb681f4d8c`；runtime v2 `1eb7de00aceacc14817b058291eb4f2e85cdbb4c10ea467c91084a75094b1a4b`。
2. **角色 ×2（已完成 2026-07-26）**：
   - controller 角色 `pea-m7-canary-controller`：ID `300042892692129613`，ARN `acs:ram::1183869713036194:role/pea-m7-canary-controller`，仅信任 `acs:ram::1183869713036194:user/user_0002`，仅附加同名 controller 策略。窗口期由你用它换取短时 STS。
   - runtime 角色 `pea-m7-canary-runtime`：ID `300525928077898732`，ARN `acs:ram::1183869713036194:role/pea-m7-canary-runtime`，仅信任阿里云服务 PAI（`pai.aliyuncs.com`），仅附加同名 runtime 策略。DLC 作业以此身份读 `input/`、写 `output/`。
3. 两条策略保存后，把控制台里最终生效的策略正文各自算一次 SHA-256（或直接告诉 Codex 你未改动，Codex 用仓库文件复算），记入 `18-m7-l1-authorization-materials.md` 第 5 项。
4. 自检：controller 角色不应具备任何 OSS 写权限；runtime 角色不应具备任何 `paidlc:*`。两份策略里都有显式 Deny 兜底。

## C. 官方镜像 + OSS payload 兼容

状态：**路线已决定，仓库实现待完成（2026-07-26）**。

1. ACR 个人版创建已终止。控制台提交返回 `个人版仅限个人用户使用，请实名认证为个人账号。`；没有创建 ACR 资源，也不为本次 canary 开通企业版。
2. 采用 PAI 官方 CPU 镜像。当前控制台标签 `torcheasyrec:1.3.0-pytorch2.12.1-cpu-py311-ubuntu22.04` 仅作候选，Codex 还需通过 provider/官方 API 固定实际 `ImageUri` 和可接受的不可变身份。
3. Codex 先完成默认关闭的 payload 增量：精确绑定只读代码/输入挂载、读写输出挂载、entrypoint 所需环境变量，以及 runtime role `acs:ram::1183869713036194:role/pea-m7-canary-runtime` 的 credential injection。
4. 离线 schema、canonical hash/redaction、官方 SDK wire map 和负例全部通过后，才进入 D。此步骤不上传对象、不启用 capability、不调用 `CreateJob`。

## D. 代码与数据集镜像上传

1. 安装并配置 ossutil（配置需 AK/SK，Codex 不读取或记录凭证）：`ossutil config`。
2. Codex 先准备 content-addressed workload archive，以及 `corpus.jsonl` / `queries.jsonl` 两个切片，并记录每个对象的 SHA-256 与字节数（外网下载和 OSS 写入分别需要明确确认）。
3. 配置完成后告诉 Codex；在独立确认的上传窗口中，使用最终 manifest 给出的 exact object names 上传，不使用下列占位符字面值：
   ```
   ossutil cp <local-workload-archive> oss://pea-m7-canary-6194-202607/input/workload/<sha256>/ragperf-canary.tar.gz
   ossutil cp <local>/corpus.jsonl     oss://pea-m7-canary-6194-202607/input/scifact/<sha256>/corpus.jsonl
   ossutil cp <local>/queries.jsonl    oss://pea-m7-canary-6194-202607/input/scifact/<sha256>/queries.jsonl
   ```
4. Codex 做只读回查并生成 workload/mirror manifests（对象 ref + 内容摘要 + 字节数 + 访问策略 + 清理策略）入档。

## E. 窗口执行（你 + Claude 同场）

1. 你在自己的终端为 controller 角色取一份短时 STS（建议 ≤1 小时），以环境变量导出到将要执行 runner 的 shell —— **不写进仓库、不贴进对话**。
2. 你在会话里说一句：`M7-L1 authorized: <日期>, ceiling ¥50, 2 jobs`。
3. Codex 执行两个 canary job 的完整 submit → sync/reconcile → collect → cleanup，并做只读 post-verify 与证据入档；超时/歧义一律 fail-closed，全程受 ¥50 与 2 jobs 硬顶约束。

## Codex 不代做的动作（一次性说明）

任何密码/AK/SK/STS 的值都由你本人录入或在自己的 shell 中设置，Codex 不读取、不记录。涉及付费开通、最终授权或权限确认时由你点击确认；其余页面导航、仓库准备、校验、执行与归档由 Codex 推进。
