# T-132 M7-L1 owner console walkthrough

Date: 2026-07-25

Why this document exists: creating cloud identities and buckets requires console authentication and RAM (security) changes, which Claude must not perform on your behalf. Everything below is the exact sequence so the manual part stays short. Claude does every repo-side artifact and every post-upload digest/manifest.

Order matters: **A (bucket) → B (RAM roles) → C (ACR image) → D (dataset upload) → E (window)**. B needs the bucket name from A; the payload materializer needs C+D before E.

## A. OSS bucket (Aliyun console → 对象存储 OSS)

状态：**已完成并验证（2026-07-26）**。实际 Bucket 为 `pea-m7-canary-6194-202607`；地域、私有访问、SSE-OSS/AES256 和 `output/` 30 天生命周期规则均已确认。

1. 创建 Bucket：名称 `pea-m7-canary-<你的后缀>`，地域 **华东2（上海）cn-shanghai**，存储类型 标准，读写权限 **私有**。
2. 关闭公共读写与静态网站托管（默认即关，确认一眼）。
3. 服务端加密：开启 **OSS 完全托管（SSE-OSS）**。
4. 生命周期规则：前缀 `output/`，**30 天后删除**。（`input/` 不设规则，L2 收尾后手动删除。）
5. 已记录最终 Bucket 名，并已由 Codex 完成 `BUCKET_NAME` 替换与 policy 摘要复算。

## B. 两个 RAM 角色（console → 访问控制 RAM）

状态：**进行中**。两个自定义策略已创建并验证；controller 为当前 v1，runtime 为收紧后的当前 v2。下一步仅创建两个角色并分别附加对应策略。

1. **自定义权限策略 ×2（已完成 2026-07-26）**：
   - `pea-m7-canary-controller`：粘贴 `ram/controller-policy.json`
   - `pea-m7-canary-runtime`：粘贴 `ram/runtime-policy.json`
   - 当前摘要：controller v1 `ddde63f223f8d1982da124414ff8224aa7a431f56b51af834030b4fb681f4d8c`；runtime v2 `1eb7de00aceacc14817b058291eb4f2e85cdbb4c10ea467c91084a75094b1a4b`。
2. **角色 ×2**：
   - controller 角色（可信实体：阿里云账号 / 你自己），附加 `pea-m7-canary-controller` 策略。窗口期由你用它换取短时 STS。
   - runtime 角色（可信实体：**阿里云服务 → PAI**），附加 `pea-m7-canary-runtime` 策略。DLC 作业以此身份读 `input/`、写 `output/`。
3. 两条策略保存后，把控制台里最终生效的策略正文各自算一次 SHA-256（或直接告诉 Claude 你未改动，Claude 用仓库文件复算），记入 `18-m7-l1-authorization-materials.md` 第 5 项。
4. 自检：controller 角色不应具备任何 OSS 写权限；runtime 角色不应具备任何 `paidlc:*`。两份策略里都有显式 Deny 兜底。

## C. ACR 镜像（console → 容器镜像服务 ACR）

1. 创建个人版实例（若无）与命名空间 `pea`，仓库 `ragperf-canary`，地域 cn-shanghai，**私有**。
2. 在你自己的终端登录（这一步 Claude 不能代做——需要密码/令牌）：
   ```
   docker login registry.cn-shanghai.aliyuncs.com
   ```
3. 登录成功后告诉 Claude，Claude 可以直接执行 build/push（会先跟你确认最终 tag），或你自己跑：
   ```
   docker build --platform linux/amd64 -t registry.cn-shanghai.aliyuncs.com/pea/ragperf-canary:v1 workloads/ragperf-canary
   docker push registry.cn-shanghai.aliyuncs.com/pea/ragperf-canary:v1
   ```
4. push 完成后 Claude 取 RepoDigest 与 `entrypoint.py` 的 SHA-256，写入 18-md 第 1 项。

## D. 数据集镜像上传

1. 安装并配置 ossutil（配置需 AK/SK，Claude 不能代做）：`ossutil config`。
2. Claude 先在本地准备好 `corpus.jsonl` / `queries.jsonl` 两个切片并算出 SHA-256 与字节数（需你先同意一次外网下载）。
3. 配置完成后告诉 Claude，Claude 可执行上传（会先确认对象路径），或你自己跑：
   ```
   ossutil cp <local>/corpus.jsonl  oss://<bucket>/input/scifact/corpus.jsonl
   ossutil cp <local>/queries.jsonl oss://<bucket>/input/scifact/queries.jsonl
   ```
4. Claude 生成两份 mirror manifest（对象 ref + 内容摘要 + 字节数 + 访问策略 + 清理策略）并入档。

## E. 窗口执行（你 + Claude 同场）

1. 你在自己的终端为 controller 角色取一份短时 STS（建议 ≤1 小时），以环境变量导出到将要执行 runner 的 shell —— **不写进仓库、不贴进对话**。
2. 你在会话里说一句：`M7-L1 authorized: <日期>, ceiling ¥50, 2 jobs`。
3. Claude 执行两个 canary job 的完整 submit → sync/reconcile → collect → cleanup，并做只读 post-verify 与证据入档；超时/歧义一律 fail-closed，全程受 ¥50 与 2 jobs 硬顶约束。

## Claude 不代做的动作（一次性说明）

控制台登录与任何密码/AK/SK/STS 的录入、RAM 角色与策略的创建修改、云资源开通——这三类属于身份与安全设置，必须由你本人操作；换成 Codex 代驱动控制台也不改变这一点。除此之外的准备、校验、执行与归档，Claude 全包。
