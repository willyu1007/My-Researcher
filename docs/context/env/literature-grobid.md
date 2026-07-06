# GROBID 运行约定(文献域 FULLTEXT_PREPROCESSED 依赖)

- **启动**:`docker compose -f docker-compose.literature.yml up -d`(镜像 `grobid/grobid:0.9.0-crf`,端口 8070)。
- **端点配置**:默认 `http://localhost:8070`,可经 content-processing settings `fulltext_parser.grobid.endpoint_url` 覆盖。
- **健康检查**:后端手动端点 `GET /settings/literature-content-processing/fulltext-parser/health`;运行时在每次解析前自动 probe `/api/isalive`(健康结果缓存 30s)。
- **生产姿态(T-130 W-02,2026-07-07)**:
  - 请求超时默认 120s(env `LITERATURE_GROBID_TIMEOUT_MS` 覆盖;settings 化归 W-10),超时/连接失败/503 有界重试 1 次;
  - 断路器复用 `LiteratureSourceRuntimeState`(source=`grobid`),失败指数退避 cooldown(60s×次数,上限 15min),窗内解析请求秒级 fast-block 为 `FULLTEXT_PARSER_UNAVAILABLE`(资产回退 registered,可重跑);
  - 服务可达但解析失败(4xx/NO_BLOCKS/204)不开断路器(分别映射 FAILED/OCR_REQUIRED)。
- **E2E 依赖**:文献 e2e runner(`literature-e2e-v2-runner.mjs`)的 `dependency:grobid` 步骤要求该容器在运行。
