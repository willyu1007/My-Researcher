#!/usr/bin/env node
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const DEFAULT_FIXTURE_PATH = 'dev-docs/active/literature-end-to-end-quality-upgrade/artifacts/evaluator/t041-evaluator-v2-fixtures.json';
const DEFAULT_GROBID_ENDPOINT = 'http://localhost:8070';
const DEFAULT_RAW_FILES_ROOT = '/Volumes/DataDisk/Paper/Auto';
const TERMINAL_ACQUISITION_STATUSES = new Set(['SUCCEEDED', 'PARTIAL', 'FAILED', 'CANCELED']);
const TERMINAL_PIPELINE_STATUSES = new Set(['SUCCESS', 'PARTIAL', 'FAILED', 'SKIPPED']);
const INDEXED_OUTCOME = 'indexed';
const OCR_OUTCOME = 'ocr_required';
const RIGHTS_OUTCOME = 'rights_blocked';

const EMBEDDING_PRICES_USD_PER_1M_TOKENS = {
  'text-embedding-3-large': 0.13,
  'text-embedding-3-small': 0.02,
  'text-embedding-ada-002': 0.10,
};

const CATEGORY_KEYS = [
  'research_problem',
  'contributions',
  'method',
  'datasets_and_benchmarks',
  'experiments',
  'key_findings',
  'limitations',
  'reproducibility',
  'related_work_positioning',
  'evidence_candidates',
  'figure_insights',
  'table_insights',
  'claim_evidence_map',
  'automation_signals',
];

const SAMPLE_CATALOG = {
  attention: {
    provider: 'arxiv',
    external_id: '1706.03762',
    title: 'Attention Is All You Need',
    year: 2017,
    authors: ['Ashish Vaswani', 'Noam Shazeer', 'Niki Parmar', 'Jakob Uszkoreit', 'Llion Jones', 'Aidan N. Gomez', 'Lukasz Kaiser', 'Illia Polosukhin'],
    abstract: 'We propose the Transformer, a sequence transduction architecture based solely on attention mechanisms, dispensing with recurrence and convolutions.',
    facts: {
      problem: 'Sequence transduction models were dominated by recurrent or convolutional architectures that limited parallelization.',
      contribution: 'The Transformer uses self-attention and multi-head attention as the core architecture for machine translation.',
      method: 'Scaled dot-product attention, positional encoding, encoder-decoder attention, and feed-forward layers replace recurrence.',
      finding: 'The model achieved strong translation quality while improving training parallelism and path length for dependencies.',
      keywords: 'transformer attention sequence transduction without recurrence scaled dot-product attention multi-head attention positional encoding machine translation model based solely on attention mechanisms',
    },
  },
  bert: {
    provider: 'arxiv',
    external_id: '1810.04805',
    title: 'BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding',
    year: 2018,
    authors: ['Jacob Devlin', 'Ming-Wei Chang', 'Kenton Lee', 'Kristina Toutanova'],
    abstract: 'BERT pre-trains deep bidirectional Transformer representations using masked language modeling and next sentence prediction for language understanding tasks.',
    facts: {
      problem: 'Language understanding systems needed stronger bidirectional contextual representations from unlabeled text.',
      contribution: 'BERT introduced deep bidirectional Transformer pretraining for downstream language understanding tasks.',
      method: 'Masked language modeling and next sentence prediction pretrain a Transformer encoder that is fine tuned for GLUE and SQuAD.',
      finding: 'Fine tuning BERT produced strong results across GLUE, SQuAD, and related natural language understanding benchmarks.',
      keywords: 'masked language model next sentence prediction bidirectional Transformer pretraining BERT fine tuning GLUE SQuAD deep bidirectional representations from unlabeled text',
    },
  },
  resnet: {
    provider: 'arxiv',
    external_id: '1512.03385',
    title: 'Deep Residual Learning for Image Recognition',
    year: 2015,
    authors: ['Kaiming He', 'Xiangyu Zhang', 'Shaoqing Ren', 'Jian Sun'],
    abstract: 'Residual learning with identity shortcut connections enables training very deep neural networks for image recognition.',
    facts: {
      problem: 'Very deep neural networks suffered from degradation even when optimization should have represented shallower solutions.',
      contribution: 'Residual learning adds identity shortcut connections that let layers learn residual functions.',
      method: 'Deep residual networks stack residual blocks and shortcut connections to train very deep convolutional models.',
      finding: 'Residual networks enabled 152 layer models and strong ImageNet recognition performance.',
      keywords: 'residual learning identity shortcut connections very deep networks degradation problem ImageNet shortcut connections enable training 152 layer neural network',
    },
  },
  adam: {
    provider: 'arxiv',
    external_id: '1412.6980',
    title: 'Adam: A Method for Stochastic Optimization',
    year: 2014,
    authors: ['Diederik P. Kingma', 'Jimmy Ba'],
    abstract: 'Adam is an adaptive stochastic optimization method using estimates of first and second moments of gradients.',
    facts: {
      problem: 'Stochastic optimization needed adaptive learning rates that handle sparse gradients and noisy objectives.',
      contribution: 'Adam combines momentum-style first moments with RMSProp-style second moments and bias correction.',
      method: 'The optimizer maintains exponential moving averages of gradients and squared gradients for adaptive moment estimation.',
      finding: 'Adam provides efficient adaptive stochastic optimization with robust step sizes for machine learning training.',
      keywords: 'adaptive moment estimation first second moments stochastic optimization Adam optimizer bias correction sparse gradients step size combines AdaGrad RMSProp adaptive learning rates',
    },
  },
  batchnorm: {
    provider: 'arxiv',
    external_id: '1502.03167',
    title: 'Batch Normalization: Accelerating Deep Network Training by Reducing Internal Covariate Shift',
    year: 2015,
    authors: ['Sergey Ioffe', 'Christian Szegedy'],
    abstract: 'Batch normalization normalizes layer inputs over mini-batches to accelerate and stabilize deep network training.',
    facts: {
      problem: 'Internal covariate shift and changing layer input distributions slowed deep network training.',
      contribution: 'Batch normalization normalizes layer inputs using mini-batch statistics.',
      method: 'Normalization parameters are inserted into the network and learned with scale and shift parameters.',
      finding: 'Batch normalization accelerates and stabilizes deep network training.',
      keywords: 'batch normalization internal covariate shift mini-batch statistics normalize layer inputs accelerate deep network training',
    },
  },
  dropout: {
    provider: 'arxiv',
    external_id: '1207.0580',
    title: 'Improving neural networks by preventing co-adaptation of feature detectors',
    year: 2012,
    authors: ['Geoffrey E. Hinton', 'Nitish Srivastava', 'Alex Krizhevsky', 'Ilya Sutskever', 'Ruslan Salakhutdinov'],
    abstract: 'Dropout reduces overfitting by randomly omitting feature detectors during training, preventing complex co-adaptations.',
    facts: {
      problem: 'Neural networks overfit when hidden units co-adapt strongly to training examples.',
      contribution: 'Dropout randomly omits feature detectors during training to reduce co-adaptation.',
      method: 'Hidden units are randomly dropped during training and combined through model averaging at inference.',
      finding: 'Dropout reduces overfitting and improves generalization in neural network training.',
      keywords: 'dropout prevent co-adaptation feature detectors overfitting randomly omit hidden units during neural network training',
    },
  },
  dqn: {
    provider: 'arxiv',
    external_id: '1312.5602',
    title: 'Playing Atari with Deep Reinforcement Learning',
    year: 2013,
    authors: ['Volodymyr Mnih', 'Koray Kavukcuoglu', 'David Silver', 'Alex Graves', 'Ioannis Antonoglou', 'Daan Wierstra', 'Martin Riedmiller'],
    abstract: 'A deep Q-network learns control policies directly from high-dimensional Atari pixels using reinforcement learning and experience replay.',
    facts: {
      problem: 'Reinforcement learning agents needed to learn control directly from high-dimensional Atari pixels.',
      contribution: 'The deep Q-network combines Q-learning with convolutional neural networks and experience replay.',
      method: 'A neural network predicts action values from raw pixels while replay memory stabilizes reinforcement learning.',
      finding: 'The method learned to play Atari games from raw pixels with a single general architecture.',
      keywords: 'deep Q-network Atari pixels experience replay reinforcement learning Q-learning convolutional neural network plays Atari games from raw pixels',
    },
  },
  unet: {
    provider: 'arxiv',
    external_id: '1505.04597',
    title: 'U-Net: Convolutional Networks for Biomedical Image Segmentation',
    year: 2015,
    authors: ['Olaf Ronneberger', 'Philipp Fischer', 'Thomas Brox'],
    abstract: 'U-Net uses a contracting path and expansive path with skip connections for accurate biomedical image segmentation from limited data.',
    facts: {
      problem: 'Biomedical image segmentation needed accurate results from limited annotated training data.',
      contribution: 'U-Net uses a contracting path and expansive path with skip connections for precise localization.',
      method: 'The architecture combines downsampling, upsampling, copied feature maps, and data augmentation with elastic deformations.',
      finding: 'U-Net achieved accurate biomedical segmentation using comparatively few annotated examples.',
      keywords: 'U-Net biomedical image segmentation contracting expansive path skip connections data augmentation elastic deformations biomedical segmentation network',
    },
  },
  word2vec: {
    provider: 'arxiv',
    external_id: '1301.3781',
    title: 'Efficient Estimation of Word Representations in Vector Space',
    year: 2013,
    authors: ['Tomas Mikolov', 'Kai Chen', 'Greg Corrado', 'Jeffrey Dean'],
    abstract: 'The paper introduces efficient neural models for learning continuous vector representations of words from large datasets.',
    facts: {
      problem: 'Learning useful word representations from large datasets needed efficient neural estimation methods.',
      contribution: 'The paper introduced efficient CBOW and skip-gram models for continuous vector representations of words.',
      method: 'Simple neural language objectives learn vector space word representations at large scale.',
      finding: 'The models produced useful word embeddings while reducing computational cost.',
      keywords: 'efficient estimation word representations vector space skip gram CBOW continuous vector representations of words learned from large datasets',
    },
  },
  gcn: {
    provider: 'arxiv',
    external_id: '1609.02907',
    title: 'Semi-Supervised Classification with Graph Convolutional Networks',
    year: 2016,
    authors: ['Thomas N. Kipf', 'Max Welling'],
    abstract: 'Graph convolutional networks perform scalable semi-supervised classification on graph-structured data using localized spectral filters.',
    facts: {
      problem: 'Graph-structured data needed scalable neural models for semi-supervised classification.',
      contribution: 'Graph convolutional networks use localized spectral filters for graph learning.',
      method: 'A first-order approximation of spectral graph convolutions propagates features over citation networks and other graphs.',
      finding: 'The model performs scalable semi-supervised classification on graph structured data.',
      keywords: 'semi-supervised classification graph convolutional networks spectral filters localized first-order approximation graph convolutions citation networks scalable neural network model graph structured data classification',
    },
  },
  'doi-unpaywall-oa': {
    provider: 'crossref',
    external_id: '10.1371/journal.pone.0000308',
    title: 'Sharing Detailed Research Data Is Associated with Increased Citation Rate',
    year: 2007,
    authors: ['Heather A. Piwowar', 'Roger S. Day', 'Douglas B. Fridsma'],
    abstract: 'The study examines whether publicly available detailed research data is associated with increased citation rate for published articles.',
    facts: {
      problem: 'Research data sharing needed empirical evidence about whether publicly available datasets are associated with later scholarly impact.',
      contribution: 'The paper links detailed research data availability with subsequent citation rates for published studies.',
      method: 'The authors analyze a cohort of publications and compare citation outcomes based on whether detailed research data was shared.',
      finding: 'Articles with publicly available detailed research data were associated with increased citation rates.',
      keywords: 'research data sharing detailed research data increased citation rate published articles data availability citation outcomes open data reuse',
    },
  },
  'doi-unpaywall-alphafold': {
    provider: 'crossref',
    external_id: '10.1038/s41586-021-03819-2',
    title: 'Highly accurate protein structure prediction with AlphaFold',
    year: 2021,
    authors: ['John Jumper', 'Richard Evans', 'Alexander Pritzel', 'Tim Green', 'Michael Figurnov', 'Olaf Ronneberger', 'Kathryn Tunyasuvunakool', 'Russ Bates', 'Augustin Zidek', 'Anna Potapenko', 'Alex Bridgland', 'Clemens Meyer', 'Simon A. A. Kohl', 'Andrew J. Ballard', 'Andrew Cowie', 'Bernardino Romera-Paredes', 'Stanislav Nikolov', 'Rishub Jain', 'Jonas Adler', 'Trevor Back', 'Stig Petersen', 'David Reiman', 'Ellen Clancy', 'Michal Zielinski', 'Martin Steinegger', 'Michalina Pacholska', 'Tamas Berghammer', 'Sebastian Bodenstein', 'David Silver', 'Oriol Vinyals', 'Andrew W. Senior', 'Koray Kavukcuoglu', 'Pushmeet Kohli', 'Demis Hassabis'],
    abstract: 'AlphaFold predicts protein structures with high accuracy using deep learning and evolutionary sequence information.',
    facts: {
      problem: 'Protein structure prediction from amino acid sequences remained a central challenge for computational biology.',
      contribution: 'AlphaFold introduced a highly accurate deep learning system for predicting protein structures.',
      method: 'The system integrates sequence alignments, pair representations, attention-based networks, and structure refinement to predict atomic coordinates.',
      finding: 'AlphaFold achieved near-experimental accuracy for many protein targets in structure prediction benchmarks.',
      keywords: 'AlphaFold protein structure prediction deep learning amino acid sequence evolutionary information atomic accuracy attention network CASP benchmark',
    },
  },
  'doi-unpaywall-quantum-supremacy': {
    provider: 'crossref',
    external_id: '10.1038/s41586-019-1666-5',
    title: 'Quantum supremacy using a programmable superconducting processor',
    year: 2019,
    authors: ['Frank Arute', 'Kunal Arya', 'Ryan Babbush', 'Dave Bacon', 'Joseph C. Bardin', 'Rami Barends', 'Rupak Biswas', 'Sergio Boixo', 'Fernando G. S. L. Brandao', 'David A. Buell', 'Brian Burkett', 'Yu Chen', 'Zijun Chen', 'Ben Chiaro', 'Roberto Collins', 'William Courtney', 'Andrew Dunsworth', 'Edward Farhi', 'Brooks Foxen', 'Austin Fowler', 'Craig Gidney', 'Marissa Giustina', 'Rob Graff', 'Keith Guerin', 'Steve Habegger', 'Matthew P. Harrigan', 'Michael J. Hartmann', 'Alan Ho', 'Markus Hoffmann', 'Trent Huang', 'Travis S. Humble', 'Sergei V. Isakov', 'Evan Jeffrey', 'Zhang Jiang', 'Dvir Kafri', 'Kostyantyn Kechedzhi', 'Julian Kelly', 'Paul V. Klimov', 'Sergey Knysh', 'Alexander Korotkov', 'Fedor Kostritsa', 'David Landhuis', 'Mike Lindmark', 'Erik Lucero', 'Dmitry Lyakh', 'Salvatore Mandrà', 'Jarrod R. McClean', 'Matthew McEwen', 'Anthony Megrant', 'Xiao Mi', 'Kristel Michielsen', 'Masoud Mohseni', 'Josh Mutus', 'Ofer Naaman', 'Matthew Neeley', 'Charles Neill', 'Murphy Yuezhen Niu', 'Eric Ostby', 'Andre Petukhov', 'John C. Platt', 'Chris Quintana', 'Eleanor G. Rieffel', 'Pedram Roushan', 'Nicholas C. Rubin', 'Daniel Sank', 'Kevin J. Satzinger', 'Vadim Smelyanskiy', 'Kevin J. Sung', 'Matthew D. Trevithick', 'Amit Vainsencher', 'Benjamin Villalonga', 'Theodore White', 'Z. Jamie Yao', 'Ping Yeh', 'Adam Zalcman', 'Hartmut Neven', 'John M. Martinis'],
    abstract: 'A programmable superconducting processor performs a sampling task intended to demonstrate quantum computational advantage over classical methods.',
    facts: {
      problem: 'Quantum computing needed an experimental demonstration of a task beyond the practical reach of classical processors.',
      contribution: 'The work demonstrated quantum computational advantage using a programmable superconducting processor.',
      method: 'A superconducting quantum processor sampled from random quantum circuits and compared the task against classical simulation estimates.',
      finding: 'The sampling experiment was reported as evidence of quantum supremacy for the tested computational task.',
      keywords: 'quantum supremacy programmable superconducting processor random circuit sampling quantum computational advantage classical simulation Sycamore processor',
    },
  },
  'doi-unpaywall-git-github': {
    provider: 'crossref',
    external_id: '10.1371/journal.pcbi.1004668',
    title: 'A Quick Introduction to Version Control with Git and GitHub',
    year: 2016,
    authors: ['Blischak JD', 'Davenport ER', 'Wilson G'],
    abstract: 'The article introduces version control concepts using Git and GitHub for collaborative and reproducible computational work.',
    facts: {
      problem: 'Researchers needed practical guidance for tracking changes and collaborating on computational projects.',
      contribution: 'The paper gives an accessible introduction to version control with Git and GitHub.',
      method: 'It explains repositories, commits, branching, merging, remotes, and hosted collaboration workflows.',
      finding: 'Version control improves transparency, collaboration, and reproducibility in research software and analysis workflows.',
      keywords: 'Git GitHub version control commits branches merging repositories reproducible research collaboration computational workflow',
    },
  },
  'doi-unpaywall-financial-deep-learning': {
    provider: 'crossref',
    external_id: '10.1371/journal.pone.0180944',
    title: 'A deep learning framework for financial time series using stacked autoencoders and long-short term memory',
    year: 2017,
    authors: ['Wei Bao', 'Jun Yue', 'Yulei Rao'],
    abstract: 'The paper proposes a deep learning framework for financial time series forecasting using stacked autoencoders and LSTM networks.',
    facts: {
      problem: 'Financial time series forecasting must model noisy nonlinear temporal patterns in market data.',
      contribution: 'The paper combines stacked autoencoders and long short-term memory networks for financial time series prediction.',
      method: 'Stacked autoencoders learn deep representations, and LSTM layers model temporal dependencies for forecasting.',
      finding: 'The proposed deep learning framework improves financial time series prediction over baseline approaches in the reported experiments.',
      keywords: 'financial time series deep learning stacked autoencoders LSTM long short term memory forecasting nonlinear market prediction',
    },
  },
  'explicit-pdf': {
    provider: 'explicit_pdf',
    external_id: 'https://arxiv.org/pdf/2010.11929',
    title: 'An Image is Worth 16x16 Words: Transformers for Image Recognition at Scale',
    year: 2020,
    authors: ['Alexey Dosovitskiy', 'Lucas Beyer', 'Alexander Kolesnikov', 'Dirk Weissenborn', 'Xiaohua Zhai', 'Thomas Unterthiner', 'Mostafa Dehghani', 'Matthias Minderer', 'Georg Heigold', 'Sylvain Gelly', 'Jakob Uszkoreit', 'Neil Houlsby'],
    abstract: 'The paper introduces the Vision Transformer, applying a standard Transformer directly to image patches for image recognition at scale.',
    facts: {
      problem: 'Image recognition architectures were dominated by convolutional networks, while Transformer scalability for visual recognition needed direct evaluation.',
      contribution: 'The Vision Transformer represents images as sequences of fixed-size patches and applies a standard Transformer encoder.',
      method: 'Images are split into patches, linearly embedded with positional information, and processed by Transformer layers for classification.',
      finding: 'When pretrained at sufficient scale, the Vision Transformer achieved strong image recognition performance without convolutional inductive bias.',
      keywords: 'Vision Transformer image patches 16x16 Transformer encoder image recognition at scale patch embeddings positional information classification pretrained visual recognition',
    },
  },
};

function parseArgs(argv) {
  const args = {
    fixture: DEFAULT_FIXTURE_PATH,
    mode: 'light',
    sampleKeys: null,
    queryIds: null,
    runId: process.env.LITERATURE_E2E_RUN_ID ?? new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z'),
    evidenceDir: process.env.LITERATURE_E2E_DIR ?? null,
    repoRoot: process.env.LITERATURE_E2E_REPO_ROOT ? path.resolve(process.env.LITERATURE_E2E_REPO_ROOT) : process.cwd(),
    grobidEndpoint: process.env.LITERATURE_E2E_GROBID_ENDPOINT ?? DEFAULT_GROBID_ENDPOINT,
    rawFilesRoot: process.env.LITERATURE_E2E_RAW_FILES_ROOT ?? DEFAULT_RAW_FILES_ROOT,
    unpaywallEmail: process.env.LITERATURE_E2E_UNPAYWALL_EMAIL ?? process.env.UNPAYWALL_EMAIL ?? null,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];
    if (arg === '--fixture' && next) {
      args.fixture = next;
      index += 1;
    } else if (arg === '--mode' && next) {
      args.mode = next;
      index += 1;
    } else if (arg === '--sample-keys' && next) {
      args.sampleKeys = splitCsv(next);
      index += 1;
    } else if (arg === '--query-ids' && next) {
      args.queryIds = splitCsv(next);
      index += 1;
    } else if (arg === '--run-id' && next) {
      args.runId = next;
      index += 1;
    } else if (arg === '--evidence-dir' && next) {
      args.evidenceDir = next;
      index += 1;
    } else if (arg === '--grobid-endpoint' && next) {
      args.grobidEndpoint = next;
      index += 1;
    } else if (arg === '--raw-files-root' && next) {
      args.rawFilesRoot = next;
      index += 1;
    } else if (arg === '--unpaywall-email' && next) {
      args.unpaywallEmail = next;
      index += 1;
    } else if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    } else {
      throw new Error(`Unknown or incomplete argument: ${arg}`);
    }
  }
  if (!['light', 'duplicate-stress', 'current-arxiv', 'v2-smoke', 'full'].includes(args.mode)) {
    throw new Error(`Unsupported --mode "${args.mode}".`);
  }
  args.evidenceDir = path.resolve(args.evidenceDir ?? path.join(args.repoRoot, '.ai/.tmp/literature-e2e', args.runId));
  args.rawFilesRoot = path.resolve(args.rawFilesRoot);
  return args;
}

function printHelp() {
  console.log([
    'Usage:',
    '  pnpm --filter @paper-engineering-assistant/backend exec node --loader ts-node/esm .ai/scripts/literature-e2e-v2-runner.mjs [options]',
    '',
    'Options:',
    '  --mode <light|duplicate-stress|current-arxiv|v2-smoke|full>   Default: light',
    '  --sample-keys <csv>                          Override selected fixture sample keys',
    '  --query-ids <csv>                            Override selected fixture query ids',
    '  --run-id <id>                                Evidence run id',
    '  --evidence-dir <path>                        Evidence output directory',
    '  --fixture <path>                             Evaluator fixture path',
    '  --grobid-endpoint <url>                      Default: http://localhost:8070',
    '  --raw-files-root <path>                      Default: /Volumes/DataDisk/Paper/Auto',
    '  --unpaywall-email <email>                    Required for DOI/Unpaywall samples',
  ].join('\n'));
}

function splitCsv(value) {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

const args = parseArgs(process.argv.slice(2));
const fixturePath = path.isAbsolute(args.fixture) ? args.fixture : path.join(args.repoRoot, args.fixture);
const fixture = JSON.parse(await fs.readFile(fixturePath, 'utf8'));
const selectedSamples = selectSamples(fixture, args);
const selectedQueries = selectQueries(fixture, args, selectedSamples);
const processableCount = selectedSamples.filter((sample) => expectedOutcome(sample) === INDEXED_OUTCOME).length;
const expectedBlockerCount = selectedSamples.length - processableCount;

const report = {
  run_id: args.runId,
  fixture_id: readString(fixture.fixture_id),
  fixture_version: typeof fixture.version === 'number' ? fixture.version : null,
  started_at: new Date().toISOString(),
  finished_at: null,
  status: 'RUNNING',
  mode: args.mode,
  environment: {
    database_url_set: Boolean(process.env.DATABASE_URL?.trim()),
    postgres_schema: process.env.LITERATURE_E2E_SCHEMA ?? readSchemaFromDatabaseUrl(process.env.DATABASE_URL),
    openai_api_key_set: Boolean(process.env.OPENAI_API_KEY?.trim()),
    unpaywall_email_set: Boolean(args.unpaywallEmail?.trim()),
    grobid_endpoint_url: args.grobidEndpoint,
    raw_files_base_root: args.rawFilesRoot,
    storage_roots: null,
    host: os.hostname(),
  },
  key_content_method: 'codex_curated',
  samples: selectedSamples.map(toReportSample),
  golden_queries: selectedQueries,
  steps: [],
  per_literature: [],
  source_health: [],
  retrieval_results: [],
  telemetry: emptyReportTelemetry(),
  metrics: {
    sample_count: selectedSamples.length,
    query_count: selectedQueries.length,
    processable_sample_count: processableCount,
    expected_blocker_count: expectedBlockerCount,
    expected_blocker_success_count: 0,
    download_success_count: 0,
    parser_success_count: 0,
    parser_quality_score_avg: null,
    parser_quality_low_count: 0,
    key_content_success_count: 0,
    indexed_success_count: 0,
    recall_at_5_hits: 0,
    recall_at_5: 0,
    mrr_at_5: 0,
    ndcg_at_5: 0,
    blind_query_count: 0,
    blind_recall_at_5_hits: 0,
    blind_recall_at_5: 0,
    top5_canonical_diversity_avg: 0,
    top5_duplicate_work_count: 0,
    positive_query_count: 0,
    negative_query_count: 0,
    negative_query_success_count: 0,
    key_content_warning_count: 0,
    key_content_diagnostic_count: 0,
    key_content_warning_rate: 0,
    key_content_warning_counts_by_code: {},
    key_content_external_call_count: 0,
    degraded_retrieval_count: 0,
    duplicate_stress: {
      enabled: args.mode === 'duplicate-stress',
      import_attempt_count: 0,
      import_merged_count: 0,
      split_clone_count: 0,
      retrieval_duplicate_work_hit_count: 0,
      retrieval_clone_hit_count: 0,
    },
  },
  thresholds: {
    download_success_min: processableCount,
    parser_success_min: processableCount,
    indexed_success_min: processableCount,
    expected_blocker_success_min: expectedBlockerCount,
    recall_at_5_min: 0.75,
    key_content_warning_rate_max: 0.25,
  },
  failures: [],
};

try {
  await fs.mkdir(args.evidenceDir, { recursive: true });
  assertEnvironment();
  process.env.RESEARCH_LIFECYCLE_REPOSITORY = 'prisma';
  process.env.TITLE_CARD_REPOSITORY = 'prisma';
  process.env.AUTO_PULL_REPOSITORY = 'prisma';
  process.env.APPLICATION_SETTINGS_REPOSITORY = 'prisma';
  process.env.GOVERNANCE_DELIVERY_AUDIT_LOG_PATH = path.join(args.evidenceDir, 'governance-delivery-audit.jsonl');
  process.env.GOVERNANCE_EVENT_DELIVERY_MODE = 'in-process';

  await verifyGrobid();
  const { buildApp } = await import(pathToFileURL(path.join(args.repoRoot, 'apps/backend/src/app.ts')).href);
  const { getPrismaClient } = await import(pathToFileURL(path.join(args.repoRoot, 'apps/backend/src/repositories/prisma/prisma-client.ts')).href);
  const app = buildApp();
  await app.ready();
  const prisma = getPrismaClient();
  try {
    await runEvaluator(app, prisma);
  } finally {
    await app.close();
    await prisma.$disconnect();
  }
} catch (error) {
  const message = publicError(error);
  report.failures.push(message);
  report.status = 'FAIL';
  pushStep('evaluator:terminal', 'FAIL', { error: message });
} finally {
  await writeReport();
  console.log(JSON.stringify({
    status: report.status,
    mode: report.mode,
    metrics: report.metrics,
    telemetry: report.telemetry.llm.total,
    report_json: path.join(args.evidenceDir, 'report.json'),
    report_md: path.join(args.evidenceDir, 'report.md'),
  }, null, 2));
  process.exit(report.status === 'PASS' ? 0 : 1);
}

async function runEvaluator(app, prisma) {
  await configureSettings(app);
  const literatureByKey = await importLiteratures(app);
  await runDuplicateImportStress(app, literatureByKey);
  await markExpectedRightsBlockers(app, literatureByKey);
  await acquireProcessableFulltext(app, literatureByKey);
  await processParserEdgeSamples(app, literatureByKey);
  for (const sample of selectedSamples.filter((item) => expectedOutcome(item) === INDEXED_OUTCOME)) {
    await processIndexedSample(app, literatureByKey, sample);
    await writeReport();
  }
  await injectDuplicateRetrievalStressClone(prisma, literatureByKey);
  await runRetrievalQueries(app, literatureByKey);
  validateDuplicateStressResults();
  pushStep('retrieval:summary', report.metrics.recall_at_5 >= report.thresholds.recall_at_5_min ? 'PASS' : 'FAIL', {
    recall_at_5_hits: report.metrics.recall_at_5_hits,
    positive_query_count: report.metrics.positive_query_count,
    negative_query_success_count: report.metrics.negative_query_success_count,
    negative_query_count: report.metrics.negative_query_count,
    degraded_retrieval_count: report.metrics.degraded_retrieval_count,
  });
}

async function configureSettings(app) {
  const storageRoot = path.join(args.evidenceDir, 'storage');
  const rawFilesRoot = path.join(args.rawFilesRoot, args.runId);
  const roots = {
    raw_files: rawFilesRoot,
    normalized_text: path.join(storageRoot, 'normalized'),
    artifacts_cache: path.join(storageRoot, 'artifacts'),
    indexes: path.join(storageRoot, 'indexes'),
    exports: path.join(storageRoot, 'exports'),
  };
  await fs.mkdir(storageRoot, { recursive: true });
  await fs.mkdir(rawFilesRoot, { recursive: true });
  report.environment.storage_roots = roots;
  const contentSettings = await request(app, 'PATCH', '/settings/literature-content-processing', {
    providers: [{ provider: 'openai', api_key: process.env.OPENAI_API_KEY }],
    extraction: {
      active_profile_id: 'default',
      runtime: {
        preferred_key_content_method: 'codex_curated',
        section_concurrency: 3,
        request_timeout_ms: 120000,
        max_retries: 1,
        prompt_profile_id: 'literature_key_content_v2',
        diagnostic_policy: 'actionable_v1',
      },
    },
    storage_roots: roots,
    fulltext_parser: { grobid: { endpoint_url: args.grobidEndpoint } },
  });
  pushStep('settings:content-processing', 'PASS', {
    key_content_method: contentSettings.extraction?.runtime?.preferred_key_content_method,
    openai_api_key_set: contentSettings.providers?.find((item) => item.provider === 'openai')?.api_key_set ?? false,
  });

  const acquisitionPatch = {
    downloader: {
      max_byte_size: 100 * 1024 * 1024,
      timeout_ms: 180000,
      max_redirects: 5,
      require_pdf_signature: true,
    },
    source_throttle: {
      arxiv: { min_interval_ms: 3000, concurrency: 1 },
      unpaywall: { min_interval_ms: 1000, concurrency: 1 },
      download: { min_interval_ms: 500, concurrency: 2 },
    },
    quality_scorer: { enabled: false },
  };
  if (args.unpaywallEmail?.trim()) {
    acquisitionPatch.unpaywall = {
      enabled: true,
      email: args.unpaywallEmail.trim(),
    };
  }
  const acquisitionSettings = await request(app, 'PATCH', '/settings/literature-acquisition', acquisitionPatch);
  pushStep('settings:acquisition', 'PASS', {
    downloader: acquisitionSettings.downloader,
    unpaywall_enabled: acquisitionSettings.unpaywall?.enabled ?? false,
  });
}

async function importLiteratures(app) {
  const importItems = selectedSamples.map(toImportItem);
  const imported = await request(app, 'POST', '/literature/collections/import', { items: importItems });
  const literatureByKey = new Map();
  for (let index = 0; index < selectedSamples.length; index += 1) {
    const result = imported.results?.[index];
    if (result?.literature_id) {
      literatureByKey.set(selectedSamples[index].key, result.literature_id);
    }
  }
  pushStep('import:metadata', literatureByKey.size === selectedSamples.length ? 'PASS' : 'FAIL', {
    imported_count: literatureByKey.size,
    expected_count: selectedSamples.length,
  });
  for (const sample of selectedSamples) {
    report.per_literature.push({
      key: sample.key,
      literature_id: literatureByKey.get(sample.key) ?? null,
      title: sample.title,
      provider: readString(sample.provider),
      source_group: readString(sample.source_group),
      expected_pipeline_outcome: expectedOutcome(sample),
      rights_class: readString(sample.rights_class) || 'UNKNOWN',
      arxiv_id: readString(sample.arxiv_id) || null,
      doi: readString(sample.doi) || null,
      download_status: 'NOT_RUN',
      parser_status: 'NOT_RUN',
      parser_quality_score: null,
      parser_quality_bucket: null,
      key_content_status: 'NOT_RUN',
      indexed_status: 'NOT_RUN',
      expected_blocker_status: null,
      blocker_code: null,
      key_content_warning_count: 0,
      key_content_diagnostic_count: 0,
      parser_diagnostics: [],
      diagnostics: [],
      timings_ms: {},
      telemetry: {
        embedding: null,
        retrieval_query: [],
      },
      run_ids: [],
      error: null,
    });
  }
  recomputeMetrics();
  return literatureByKey;
}

async function runDuplicateImportStress(app, literatureByKey) {
  if (args.mode !== 'duplicate-stress') {
    return;
  }
  const targetSample = selectedSamples.find((sample) => readString(sample.key) === 'attention') ?? selectedSamples[0];
  const targetKey = readString(targetSample?.key);
  const targetLiteratureId = literatureByKey.get(targetKey);
  if (!targetSample || !targetLiteratureId) {
    throw new Error('Duplicate stress requires at least one imported target literature.');
  }
  const catalog = catalogFor(targetSample);
  const stressDoi = `10.5555/t041-duplicate-${targetKey}`;
  const duplicateItems = [
    {
      provider: 'crossref',
      external_id: stressDoi,
      title: readString(targetSample.title) || catalog.title,
      abstract: `${catalog.abstract} Duplicate DOI stress metadata.`,
      authors: catalog.authors,
      year: catalog.year,
      doi: stressDoi,
      source_url: `https://doi.org/${stressDoi}`,
      rights_class: 'OA',
      tags: ['duplicate-stress', 'doi-merge'],
    },
    {
      provider: 'web',
      external_id: `duplicate-web-${targetKey}`,
      title: readString(targetSample.title) || catalog.title,
      abstract: `${catalog.abstract} Duplicate web stress metadata.`,
      authors: [...catalog.authors].reverse(),
      year: catalog.year,
      doi: `https://doi.org/${stressDoi}`,
      source_url: `https://example.test/duplicate-stress/${targetKey}`,
      rights_class: 'OA',
      tags: ['duplicate-stress', 'web-merge'],
    },
    {
      provider: 'arxiv',
      external_id: `${readString(targetSample.arxiv_id) || catalog.external_id || targetKey}v9`,
      title: readString(targetSample.title) || catalog.title,
      abstract: `${catalog.abstract} Duplicate arXiv stress metadata.`,
      authors: catalog.authors,
      year: catalog.year,
      arxiv_id: `${readString(targetSample.arxiv_id) || catalog.external_id || targetKey}v9`,
      source_url: `https://arxiv.org/abs/${readString(targetSample.arxiv_id) || catalog.external_id || targetKey}`,
      rights_class: 'OA',
      tags: ['duplicate-stress', 'arxiv-merge'],
    },
  ];
  const imported = await request(app, 'POST', '/literature/collections/import', { items: duplicateItems });
  const results = imported.results ?? [];
  const mergedCount = results.filter((result) => result.literature_id === targetLiteratureId && result.is_new === false).length;
  report.metrics.duplicate_stress.import_attempt_count = results.length;
  report.metrics.duplicate_stress.import_merged_count = mergedCount;
  const canonicalKeys = [...new Set(results.map((result) => readString(result.canonical_work_key)).filter(Boolean))];
  pushStep('duplicate-stress:source-merge', mergedCount === duplicateItems.length ? 'PASS' : 'FAIL', {
    target_key: targetKey,
    target_literature_id: targetLiteratureId,
    duplicate_count: duplicateItems.length,
    merged_count: mergedCount,
    matched_by: results.map((result) => result.matched_by),
    canonical_work_keys: canonicalKeys,
  });
  if (mergedCount !== duplicateItems.length) {
    report.failures.push(`duplicate-stress source merge expected ${duplicateItems.length} merges, got ${mergedCount}.`);
  }
}

async function markExpectedRightsBlockers(app, literatureByKey) {
  for (const sample of selectedSamples.filter((item) => expectedOutcome(item) === RIGHTS_OUTCOME)) {
    const row = rowFor(sample.key);
    const literatureId = literatureByKey.get(sample.key);
    if (!literatureId) {
      row.error = 'Literature import failed.';
      continue;
    }
    const dryRun = await request(app, 'POST', '/literature/fulltext-acquisition/dry-runs', {
      workset: { literature_ids: [literatureId] },
    });
    const planItem = dryRun.estimate?.plan_items?.[0] ?? {};
    row.download_status = planItem.blocked ? 'BLOCKED' : 'UNEXPECTED_READY';
    row.blocker_code = planItem.blocker_code ?? null;
    row.expected_blocker_status = planItem.blocker_code === 'USER_AUTH_REQUIRED' ? 'PASSED' : 'FAILED';
    pushStep(`expected-blocker:${sample.key}`, row.expected_blocker_status === 'PASSED' ? 'PASS' : 'FAIL', {
      blocker_code: row.blocker_code,
      blocker_message: planItem.blocker_message ?? null,
    });
  }
  recomputeMetrics();
}

async function acquireProcessableFulltext(app, literatureByKey) {
  const processable = selectedSamples.filter((item) => expectedOutcome(item) === INDEXED_OUTCOME);
  if (processable.length === 0) {
    return;
  }
  const literatureIds = processable.map((sample) => literatureByKey.get(sample.key)).filter(Boolean);
  const explicitUrls = processable
    .filter((sample) => readString(sample.explicit_pdf_url))
    .map((sample) => ({
      literature_id: literatureByKey.get(sample.key),
      source_url: readString(sample.explicit_pdf_url),
    }))
    .filter((item) => item.literature_id && item.source_url);
  const started = Date.now();
  const created = await request(app, 'POST', '/literature/fulltext-acquisition/jobs', {
    workset: {
      literature_ids: literatureIds,
      ...(explicitUrls.length ? { explicit_urls: explicitUrls } : {}),
    },
    options: { max_parallel_downloads: 2, max_byte_size: 100 * 1024 * 1024 },
  }, [201]);
  const jobId = created.job?.job_id;
  const result = await poll(
    'fulltext acquisition job',
    1_200_000,
    5000,
    async () => request(app, 'GET', `/literature/fulltext-acquisition/jobs/${encodeURIComponent(jobId)}`),
    (body) => TERMINAL_ACQUISITION_STATUSES.has(body.job?.status),
  );
  const elapsed = Date.now() - started;
  addStageTiming('download', elapsed);
  const job = result.job;
  report.source_health = Array.isArray(job.source_health) ? job.source_health : [];
  const byLiterature = new Map((job.items ?? []).map((item) => [item.literature_id, item]));
  for (const sample of processable) {
    const row = rowFor(sample.key);
    const item = byLiterature.get(literatureByKey.get(sample.key));
    row.download_status = item?.status ?? 'NOT_RUN';
    row.blocker_code = item?.blocker_code ?? item?.error_code ?? null;
    row.timings_ms.download = elapsedBetween(item?.started_at, item?.finished_at);
  }
  pushStep('fulltext-acquisition:download', job.totals?.succeeded >= processable.length ? 'PASS' : 'FAIL', {
    job_id: jobId,
    status: job.status,
    totals: job.totals,
    source_health: report.source_health,
    elapsed_ms: elapsed,
  });
  recomputeMetrics();
}

async function processParserEdgeSamples(app, literatureByKey) {
  for (const sample of selectedSamples.filter((item) => expectedOutcome(item) === OCR_OUTCOME)) {
    const row = rowFor(sample.key);
    const literatureId = literatureByKey.get(sample.key);
    if (!literatureId) {
      row.error = 'Literature import failed.';
      continue;
    }
    const pdfPath = await writeBlankPdfFixture(sample.key);
    await request(app, 'POST', `/literature/${encodeURIComponent(literatureId)}/content-assets`, {
      local_path: pdfPath,
      mime_type: 'application/pdf',
    });
    const run = await triggerAndWaitForRun(app, literatureId, ['CITATION_NORMALIZED', 'ABSTRACT_READY', 'FULLTEXT_PREPROCESSED']);
    row.run_ids.push(run.run_id);
    mergeTimings(row, stageTimingsFromRun(run));
    const state = await request(app, 'GET', `/literature/${encodeURIComponent(literatureId)}/content-processing`);
    const fulltextStage = stageState(state, 'FULLTEXT_PREPROCESSED');
    const reasonCode = readString(fulltextStage?.detail?.reason_code);
    row.parser_status = isOcrRequiredReason(reasonCode) ? 'OCR_REQUIRED' : fulltextStage?.status ?? 'NOT_STARTED';
    row.parser_diagnostics = diagnosticsForStage(state, 'FULLTEXT_PREPROCESSED').map(toReportDiagnostic);
    row.expected_blocker_status = isOcrRequiredReason(reasonCode) ? 'PASSED' : 'FAILED';
    row.blocker_code = reasonCode || null;
    pushStep(`parser-edge:${sample.key}`, row.expected_blocker_status === 'PASSED' ? 'PASS' : 'FAIL', {
      parser_status: row.parser_status,
      blocker_code: row.blocker_code,
    });
  }
  recomputeMetrics();
}

async function processIndexedSample(app, literatureByKey, sample) {
  const row = rowFor(sample.key);
  const literatureId = literatureByKey.get(sample.key);
  if (!literatureId || row.download_status !== 'SUCCEEDED') {
    row.error = row.error ?? 'Download did not succeed.';
    return;
  }
  try {
    const prepRun = await triggerAndWaitForRun(app, literatureId, ['CITATION_NORMALIZED', 'ABSTRACT_READY', 'FULLTEXT_PREPROCESSED']);
    row.run_ids.push(prepRun.run_id);
    mergeTimings(row, stageTimingsFromRun(prepRun));
    const bundle = await request(app, 'GET', `/literature/${encodeURIComponent(literatureId)}/content-processing/key-content-curation-bundle`);
    const dossier = buildCodexDossier(sample, bundle);
    const dryRunStarted = Date.now();
    const dryRun = await request(app, 'POST', `/literature/${encodeURIComponent(literatureId)}/content-processing/key-content-dossier/dry-run`, {
      curation_source: 'codex_curated',
      curator: 'codex',
      dossier,
    });
    row.timings_ms.key_content_dry_run = Date.now() - dryRunStarted;
    if (!dryRun.valid) {
      throw new Error(`Curated dossier dry-run failed for ${sample.key}: ${JSON.stringify(dryRun.issues)}`);
    }
    await request(app, 'POST', `/literature/${encodeURIComponent(literatureId)}/content-processing/key-content-dossier`, {
      curation_source: 'codex_curated',
      curator: 'codex',
      dossier,
    });
    const finishRun = await triggerAndWaitForRun(app, literatureId, ['KEY_CONTENT_READY', 'CHUNKED', 'EMBEDDED', 'INDEXED']);
    row.run_ids.push(finishRun.run_id);
    mergeTimings(row, stageTimingsFromRun(finishRun));
    const state = await request(app, 'GET', `/literature/${encodeURIComponent(literatureId)}/content-processing`);
    const fulltextDiagnostics = diagnosticsForStage(state, 'FULLTEXT_PREPROCESSED');
    const parserQuality = extractParserQuality(fulltextDiagnostics);
    row.parser_status = stageState(state, 'FULLTEXT_PREPROCESSED')?.status ?? 'NOT_STARTED';
    row.parser_quality_score = parserQuality.score;
    row.parser_quality_bucket = parserQuality.bucket;
    row.parser_diagnostics = fulltextDiagnostics.map(toReportDiagnostic);
    row.key_content_status = stageState(state, 'KEY_CONTENT_READY')?.status ?? 'NOT_STARTED';
    row.indexed_status = stageState(state, 'INDEXED')?.status ?? 'NOT_STARTED';
    const keyDiagnostics = diagnosticsForStage(state, 'KEY_CONTENT_READY');
    row.key_content_diagnostic_count = keyDiagnostics.length;
    row.key_content_warning_count = keyDiagnostics.filter((item) => item?.severity === 'warning').length;
    row.diagnostics = keyDiagnostics.map(toReportDiagnostic);
    const embeddingTelemetry = stageState(state, 'EMBEDDED')?.detail?.telemetry ?? null;
    row.telemetry.embedding = enrichTelemetry(embeddingTelemetry);
    addTelemetry('embedding', row.telemetry.embedding);
    pushStep(`content-processing:${sample.key}`, row.indexed_status === 'SUCCEEDED' ? 'PASS' : 'FAIL', {
      literature_id: literatureId,
      parser_status: row.parser_status,
      parser_quality_score: row.parser_quality_score,
      parser_quality_bucket: row.parser_quality_bucket,
      key_content_status: row.key_content_status,
      indexed_status: row.indexed_status,
      timings_ms: row.timings_ms,
      embedding_telemetry: row.telemetry.embedding,
      key_content_warning_count: row.key_content_warning_count,
      key_content_diagnostic_count: row.key_content_diagnostic_count,
    });
  } catch (error) {
    row.error = publicError(error);
    report.failures.push(`${sample.key}: ${row.error}`);
    pushStep(`content-processing:${sample.key}`, 'FAIL', { error: row.error });
  }
  recomputeMetrics();
}

async function injectDuplicateRetrievalStressClone(prisma, literatureByKey) {
  if (args.mode !== 'duplicate-stress') {
    return;
  }
  const targetKey = literatureByKey.has('attention') ? 'attention' : selectedSamples[0]?.key;
  const targetLiteratureId = literatureByKey.get(targetKey);
  if (!targetLiteratureId) {
    throw new Error('Duplicate retrieval stress requires an indexed target literature.');
  }
  const original = await prisma.literatureRecord.findUnique({
    where: { id: targetLiteratureId },
  });
  if (!original?.activeEmbeddingVersionId) {
    throw new Error(`Duplicate retrieval stress target ${targetLiteratureId} has no active embedding version.`);
  }
  const activeVersion = await prisma.literatureEmbeddingVersion.findUnique({
    where: { id: original.activeEmbeddingVersionId },
  });
  if (!activeVersion) {
    throw new Error(`Active embedding version ${original.activeEmbeddingVersionId} not found.`);
  }
  const chunks = await prisma.literatureEmbeddingChunk.findMany({
    where: { embeddingVersionId: activeVersion.id },
    orderBy: { chunkIndex: 'asc' },
  });
  if (chunks.length === 0) {
    throw new Error(`Active embedding version ${activeVersion.id} has no chunks to clone.`);
  }

  const now = new Date();
  const safeRunId = args.runId.replace(/[^A-Za-z0-9_-]/gu, '_').slice(0, 48);
  const cloneLiteratureId = `ZZ-DUP-${safeRunId}-${targetKey}`;
  const cloneEmbeddingVersionId = `ZZ-EV-DUP-${safeRunId}-${targetKey}`;
  await prisma.literatureRecord.create({
    data: {
      id: cloneLiteratureId,
      title: original.title,
      abstractText: original.abstractText,
      keyContentDigest: original.keyContentDigest,
      authors: original.authors,
      year: original.year,
      doiNormalized: null,
      arxivId: null,
      normalizedTitle: original.normalizedTitle,
      titleAuthorsYearHash: null,
      rightsClass: original.rightsClass,
      tags: [...new Set([...original.tags, 'duplicate-stress', 'historical-split-clone'])],
      activeEmbeddingVersionId: null,
      createdAt: now,
      updatedAt: now,
    },
  });
  await prisma.literatureSource.create({
    data: {
      id: `ZZ-LSRC-DUP-${safeRunId}-${targetKey}`,
      literatureId: cloneLiteratureId,
      provider: 'manual',
      sourceItemId: `duplicate-stress:${safeRunId}:${targetKey}`,
      sourceUrl: `https://example.test/duplicate-stress/${targetKey}/historical-split`,
      rawPayload: {
        duplicate_stress: true,
        cloned_from_literature_id: targetLiteratureId,
      },
      fetchedAt: now,
    },
  });
  await prisma.literatureEmbeddingVersion.create({
    data: {
      id: cloneEmbeddingVersionId,
      literatureId: cloneLiteratureId,
      versionNo: 1,
      status: activeVersion.status,
      profileId: activeVersion.profileId,
      provider: activeVersion.provider,
      model: activeVersion.model,
      dimension: activeVersion.dimension,
      chunkCount: activeVersion.chunkCount,
      vectorCount: activeVersion.vectorCount,
      tokenCount: activeVersion.tokenCount,
      inputChecksum: `duplicate-stress:${activeVersion.inputChecksum ?? activeVersion.id}`,
      chunkArtifactChecksum: activeVersion.chunkArtifactChecksum,
      embeddingArtifactChecksum: activeVersion.embeddingArtifactChecksum,
      indexArtifactChecksum: activeVersion.indexArtifactChecksum,
      indexedAt: activeVersion.indexedAt,
      activatedAt: now,
      createdAt: now,
      updatedAt: now,
    },
  });
  await prisma.literatureEmbeddingChunk.createMany({
    data: chunks.map((chunk) => ({
      id: `${cloneEmbeddingVersionId}-chunk-${chunk.chunkIndex}`,
      embeddingVersionId: cloneEmbeddingVersionId,
      literatureId: cloneLiteratureId,
      chunkId: chunk.chunkId,
      chunkIndex: chunk.chunkIndex,
      text: chunk.text,
      startOffset: chunk.startOffset,
      endOffset: chunk.endOffset,
      chunkType: chunk.chunkType,
      sourceRefs: chunk.sourceRefs,
      metadata: {
        ...(isRecord(chunk.metadata) ? chunk.metadata : {}),
        duplicate_stress_clone: true,
        cloned_from_literature_id: targetLiteratureId,
      },
      contentChecksum: chunk.contentChecksum,
      createdAt: now,
      updatedAt: now,
    })),
  });
  for (const chunk of chunks) {
    await prisma.$executeRawUnsafe(`
      UPDATE "LiteratureEmbeddingChunk" AS clone
      SET "retrievalVector" = source."retrievalVector"
      FROM "LiteratureEmbeddingChunk" AS source
      WHERE clone."id" = ${sqlString(`${cloneEmbeddingVersionId}-chunk-${chunk.chunkIndex}`)}
        AND source."id" = ${sqlString(chunk.id)}
        AND source."retrievalVector" IS NOT NULL
    `);
  }
  await prisma.literatureRecord.update({
    where: { id: cloneLiteratureId },
    data: {
      activeEmbeddingVersionId: cloneEmbeddingVersionId,
      updatedAt: now,
    },
  });

  report.metrics.duplicate_stress.split_clone_count = 1;
  report.metrics.duplicate_stress.split_clone_literature_id = cloneLiteratureId;
  pushStep('duplicate-stress:historical-split-clone', 'PASS', {
    target_key: targetKey,
    original_literature_id: targetLiteratureId,
    clone_literature_id: cloneLiteratureId,
    cloned_chunk_count: chunks.length,
  });
}

function sqlString(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

async function runRetrievalQueries(app, literatureByKey) {
  const keyByLiteratureId = new Map([...literatureByKey.entries()].map(([key, literatureId]) => [literatureId, key]));
  for (const query of selectedQueries) {
    const expectedLiteratureId = literatureByKey.get(query.expected);
    const retrieved = await request(app, 'POST', '/literature/retrieve', {
      query: query.query,
      profile: 'paper_management',
      top_k: 5,
      evidence_per_literature: 2,
    });
    const queryTelemetry = enrichTelemetry(retrieved.meta?.query_embedding_telemetry ?? null);
    addTelemetry('retrieval_query', queryTelemetry);
    const expectedRow = rowFor(query.expected, false);
    if (expectedRow) {
      expectedRow.telemetry.retrieval_query.push(queryTelemetry);
    }
    const top5 = (retrieved.items ?? []).slice(0, 5).map((item, index) => ({
      rank: index + 1,
      literature_id: item.literature_id,
      canonical_work_key: item.canonical_work_key ?? null,
      key: keyByLiteratureId.get(item.literature_id) ?? null,
      title: item.title,
      score: Number(item.hybrid_score?.toFixed?.(6) ?? item.hybrid_score),
      is_stale: item.is_stale,
    }));
    const hit = top5.find((item) => item.literature_id === expectedLiteratureId);
    const negativeExpectation = Boolean(query.expect_no_auto_fulltext);
    const expectedAbsentAt5 = negativeExpectation ? !hit : null;
    const top5CanonicalKeys = top5.map((item) => item.canonical_work_key ?? item.literature_id);
    const top5CanonicalDiversity = top5.length > 0
      ? new Set(top5CanonicalKeys).size / top5.length
      : 1;
    const top5DuplicateWorkCount = top5CanonicalKeys.length - new Set(top5CanonicalKeys).size;
    const reciprocalRank = !negativeExpectation && hit ? 1 / hit.rank : 0;
    const ndcgAt5 = !negativeExpectation && hit ? 1 / Math.log2(hit.rank + 1) : 0;
    report.retrieval_results.push({
      id: query.id,
      query: query.query,
      query_set: query.query_set,
      expected_key: query.expected,
      expected_literature_id: expectedLiteratureId ?? null,
      negative_expectation: negativeExpectation,
      expected_absent_at_5: expectedAbsentAt5,
      hit_at_5: negativeExpectation ? false : Boolean(hit),
      rank: hit?.rank ?? null,
      reciprocal_rank: negativeExpectation ? null : reciprocalRank,
      ndcg_at_5: negativeExpectation ? null : ndcgAt5,
      top5_canonical_diversity: top5CanonicalDiversity,
      top5_duplicate_work_count: top5DuplicateWorkCount,
      top5,
      degraded_mode: retrieved.meta?.degraded_mode ?? null,
      query_embedding_telemetry: queryTelemetry,
    });
    console.log(`[QUERY] ${query.id} expected=${query.expected} negative=${negativeExpectation} hit=${Boolean(hit)} rank=${hit?.rank ?? 'NA'}`);
    recomputeMetrics();
    await writeReport();
  }
}

function validateDuplicateStressResults() {
  if (args.mode !== 'duplicate-stress') {
    return;
  }
  let duplicateWorkHitCount = 0;
  let cloneHitCount = 0;
  const cloneLiteratureId = report.metrics.duplicate_stress.split_clone_literature_id ?? null;
  for (const result of report.retrieval_results) {
    const workKeys = (result.top5 ?? [])
      .map((item) => readString(item.canonical_work_key))
      .filter(Boolean);
    duplicateWorkHitCount += workKeys.length - new Set(workKeys).size;
    if (cloneLiteratureId) {
      cloneHitCount += (result.top5 ?? []).filter((item) => item.literature_id === cloneLiteratureId).length;
    }
  }
  report.metrics.duplicate_stress.retrieval_duplicate_work_hit_count = duplicateWorkHitCount;
  report.metrics.duplicate_stress.retrieval_clone_hit_count = cloneHitCount;
  const pass = report.metrics.duplicate_stress.import_attempt_count > 0
    && report.metrics.duplicate_stress.import_merged_count === report.metrics.duplicate_stress.import_attempt_count
    && report.metrics.duplicate_stress.split_clone_count === 1
    && duplicateWorkHitCount === 0
    && cloneHitCount === 0;
  pushStep('duplicate-stress:retrieval-dedup', pass ? 'PASS' : 'FAIL', {
    duplicate_stress: report.metrics.duplicate_stress,
  });
  if (!pass) {
    report.failures.push(`duplicate-stress retrieval dedup failed: ${JSON.stringify(report.metrics.duplicate_stress)}`);
  }
  recomputeMetrics();
}

async function triggerAndWaitForRun(app, literatureId, requestedStages) {
  const created = await request(app, 'POST', `/literature/${encodeURIComponent(literatureId)}/content-processing/runs`, {
    requested_stages: requestedStages,
  });
  const runId = created.run?.run_id;
  const result = await poll(
    `content processing ${runId}`,
    1_200_000,
    5000,
    async () => request(app, 'GET', `/literature/${encodeURIComponent(literatureId)}/content-processing/runs?limit=20`),
    (body) => {
      const run = body.items?.find((item) => item.run_id === runId);
      return run && TERMINAL_PIPELINE_STATUSES.has(run.status);
    },
  );
  return result.items?.find((item) => item.run_id === runId) ?? created.run;
}

async function request(app, method, url, payload, expectedStatuses = [200]) {
  const res = await app.inject({ method, url, ...(payload === undefined ? {} : { payload }) });
  let body = null;
  try {
    body = res.json();
  } catch {
    body = res.body;
  }
  if (!expectedStatuses.includes(res.statusCode)) {
    throw new Error(`${method} ${url} returned ${res.statusCode}: ${JSON.stringify(body)}`);
  }
  return body;
}

async function poll(name, timeoutMs, intervalMs, load, isTerminal) {
  const started = Date.now();
  let last = null;
  while (Date.now() - started < timeoutMs) {
    last = await load();
    if (isTerminal(last)) {
      return last;
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }
  throw new Error(`${name} timed out after ${timeoutMs}ms. Last state: ${JSON.stringify(last)}`);
}

async function verifyGrobid() {
  const endpoint = args.grobidEndpoint.replace(/\/$/u, '');
  const [aliveRes, versionRes] = await Promise.all([
    fetch(`${endpoint}/api/isalive`),
    fetch(`${endpoint}/api/version`),
  ]);
  const aliveText = await aliveRes.text();
  const versionText = await versionRes.text();
  if (!aliveRes.ok || !aliveText.includes('true')) {
    throw new Error(`GROBID is not ready: ${aliveRes.status} ${aliveText}`);
  }
  pushStep('dependency:grobid', 'PASS', { version: versionText });
}

function assertEnvironment() {
  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error('DATABASE_URL is required and should point at a temporary Postgres schema.');
  }
  if (!process.env.OPENAI_API_KEY?.trim()) {
    throw new Error('OPENAI_API_KEY is required for embeddings and retrieval query embeddings.');
  }
  if (selectedSamples.some((sample) => readString(sample.source_group) === 'doi_unpaywall') && !args.unpaywallEmail?.trim()) {
    throw new Error('DOI/Unpaywall samples require --unpaywall-email or LITERATURE_E2E_UNPAYWALL_EMAIL.');
  }
}

function selectSamples(rawFixture, parsedArgs) {
  const samples = Array.isArray(rawFixture.samples) ? rawFixture.samples : [];
  const keys = parsedArgs.sampleKeys ?? defaultSampleKeysForMode(parsedArgs.mode, samples);
  const byKey = new Map(samples.map((sample) => [readString(sample.key), sample]));
  return keys.map((key) => {
    const sample = byKey.get(key);
    if (!sample) {
      throw new Error(`Fixture sample key not found: ${key}`);
    }
    return sample;
  });
}

function defaultSampleKeysForMode(mode, samples) {
  if (mode === 'light') {
    return ['attention', 'bert', 'resnet'];
  }
  if (mode === 'duplicate-stress') {
    return ['attention', 'bert', 'resnet'];
  }
  if (mode === 'current-arxiv') {
    return samples.filter((sample) => readString(sample.source_group) === 'arxiv').map((sample) => readString(sample.key));
  }
  if (mode === 'v2-smoke') {
    return ['attention', 'bert', 'resnet', 'explicit-pdf', 'parser-edge-scanned', 'rights-gated'];
  }
  return samples.map((sample) => readString(sample.key)).filter(Boolean);
}

function selectQueries(rawFixture, parsedArgs, samples) {
  const queries = Array.isArray(rawFixture.golden_queries) ? rawFixture.golden_queries : [];
  if (parsedArgs.queryIds) {
    const byId = new Map(queries.map((query) => [readString(query.id), query]));
    return parsedArgs.queryIds.map((id) => {
      const query = byId.get(id);
      if (!query) {
        throw new Error(`Fixture query id not found: ${id}`);
      }
      return query;
    });
  }
  const selectedKeys = new Set(samples.map((sample) => readString(sample.key)));
  if (parsedArgs.mode === 'light') {
    return queries.filter((query) => ['q01', 'q02', 'q03', 'q04', 'q05', 'q06', 'q07', 'q08', 'q09'].includes(readString(query.id)));
  }
  return queries.filter((query) => selectedKeys.has(readString(query.expected)));
}

function toReportSample(sample) {
  return {
    key: readString(sample.key),
    title: readString(sample.title),
    provider: readString(sample.provider),
    source_group: readString(sample.source_group),
    rights_class: readString(sample.rights_class) || 'UNKNOWN',
    expected_pipeline_outcome: expectedOutcome(sample),
    arxiv_id: readString(sample.arxiv_id) || null,
    doi: readString(sample.doi) || null,
    explicit_pdf_url: readString(sample.explicit_pdf_url) || null,
    tags: Array.isArray(sample.tags) ? sample.tags.map(readString).filter(Boolean) : [],
  };
}

function toImportItem(sample) {
  const catalog = catalogFor(sample);
  const provider = normalizeImportProvider(sample);
  const arxivId = readString(sample.arxiv_id);
  const doi = readString(sample.doi);
  const explicitUrl = readString(sample.explicit_pdf_url);
  return {
    provider,
    external_id: arxivId || doi || readString(sample.key),
    title: readString(sample.title) || catalog.title,
    abstract: catalog.abstract,
    authors: catalog.authors,
    year: catalog.year,
    ...(doi ? { doi } : {}),
    ...(arxivId ? { arxiv_id: arxivId } : {}),
    source_url: arxivId
      ? `https://arxiv.org/abs/${arxivId}`
      : doi
        ? `https://doi.org/${doi}`
        : explicitUrl || `https://example.test/literature/${readString(sample.key)}`,
    rights_class: readString(sample.rights_class) || 'UNKNOWN',
    tags: ['t041-evaluator-v2', args.runId, readString(sample.key), readString(sample.source_group)].filter(Boolean),
  };
}

function normalizeImportProvider(sample) {
  const provider = readString(sample.provider);
  if (['crossref', 'arxiv', 'manual', 'web', 'zotero'].includes(provider)) {
    return provider;
  }
  if (provider === 'doi') {
    return 'manual';
  }
  if (provider === 'explicit_pdf') {
    return 'manual';
  }
  return 'manual';
}

function catalogFor(sample) {
  const key = readString(sample.key);
  const catalog = SAMPLE_CATALOG[key];
  if (!catalog) {
    return {
      title: readString(sample.title),
      year: 2026,
      authors: ['T-041 Fixture'],
      abstract: `${readString(sample.title)} fixture for literature E2E evaluation.`,
      facts: null,
    };
  }
  return catalog;
}

function factsFor(sample) {
  return catalogFor(sample).facts;
}

function expectedOutcome(sample) {
  const explicit = readString(sample.expected_pipeline_outcome);
  if (explicit) {
    return explicit;
  }
  if (readString(sample.expected_parser_status) === 'OCR_REQUIRED' || readString(sample.source_group) === 'parser_edge') {
    return OCR_OUTCOME;
  }
  if (readString(sample.rights_class) && readString(sample.rights_class) !== 'OA') {
    return RIGHTS_OUTCOME;
  }
  return INDEXED_OUTCOME;
}

function isOcrRequiredReason(reasonCode) {
  return ['OCR_REQUIRED', 'FULLTEXT_OCR_REQUIRED'].includes(readString(reasonCode));
}

function buildCodexDossier(sample, bundle) {
  const refs = (Array.isArray(bundle.source_refs) ? bundle.source_refs : [])
    .filter((ref) => ref?.ref_type === 'abstract' || ref?.ref_type === 'paragraph')
    .slice(0, 2)
    .map((ref) => ({ ref_type: ref.ref_type, ref_id: ref.ref_id }));
  if (refs.length === 0) {
    throw new Error(`No resolvable source refs in curation bundle for ${readString(sample.key)}.`);
  }
  const facts = factsFor(sample);
  if (!facts) {
    throw new Error(`No curated facts are available for ${readString(sample.key)}.`);
  }
  const categories = Object.fromEntries(CATEGORY_KEYS.map((category) => [category, []]));
  categories.research_problem.push(dossierItem(sample, 'problem', '1', facts.problem, refs));
  categories.contributions.push(dossierItem(sample, 'contribution', '1', facts.contribution, refs));
  categories.method.push(dossierItem(sample, 'method', '1', facts.method, refs));
  categories.key_findings.push(dossierItem(sample, 'finding', '1', facts.finding, refs));
  categories.evidence_candidates.push(dossierItem(sample, 'evidence', '1', `${readString(sample.title)}: ${facts.keywords}`, refs));
  categories.claim_evidence_map.push(dossierItem(sample, 'claim_evidence', '1', `${facts.contribution} ${facts.finding}`, refs));
  categories.automation_signals.push(dossierItem(sample, 'automation', '1', facts.keywords, refs));
  return {
    schema_version: 'key_content.v1',
    extraction_profile: 'paper_semantic_dossier.v1',
    readiness_status: 'READY',
    input_refs: {
      fulltext_checksum: bundle.document?.normalized_text_checksum,
    },
    categories,
    quality_report: {
      completeness_score: 0.86,
      confidence: 0.9,
      blockers: [],
      warnings: [],
      conflicts: [],
      extraction_diagnostics: [{
        code: 'CODEX_CURATED_DOSSIER_BUILT',
        severity: 'info',
        message: 'Dossier was curated through Codex/manual import path with zero external key-content model calls.',
      }],
    },
    display_digest: `${readString(sample.title)}: ${facts.contribution}`,
    generated_at: new Date().toISOString(),
  };
}

function dossierItem(sample, category, suffix, statement, sourceRefs) {
  return {
    id: `${readString(sample.key)}-${category}-${suffix}`,
    type: category,
    statement,
    details: `${statement} Evidence keywords: ${factsFor(sample).keywords}.`,
    source_refs: sourceRefs,
    confidence: 0.9,
    evidence_strength: 'high',
    notes: null,
    provenance: 'user_edited',
  };
}

async function writeBlankPdfFixture(key) {
  const dir = path.join(args.evidenceDir, 'fixtures');
  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, `${key}.pdf`);
  const content = [
    '%PDF-1.4',
    '1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj',
    '2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj',
    '3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >> endobj',
    'xref',
    '0 4',
    '0000000000 65535 f ',
    '0000000009 00000 n ',
    '0000000058 00000 n ',
    '0000000115 00000 n ',
    'trailer << /Root 1 0 R /Size 4 >>',
    'startxref',
    '186',
    '%%EOF',
  ].join('\n');
  await fs.writeFile(filePath, content, 'utf8');
  return filePath;
}

function stageState(contentState, stageCode) {
  return contentState.stage_states?.find((stage) => stage.stage_code === stageCode) ?? null;
}

function diagnosticsForStage(contentState, stageCode) {
  const diagnostics = stageState(contentState, stageCode)?.detail?.diagnostics;
  return Array.isArray(diagnostics) ? diagnostics : [];
}

function toReportDiagnostic(item) {
  return {
    code: item?.code ?? null,
    severity: item?.severity ?? null,
    message: item?.message ?? null,
  };
}

function extractParserQuality(diagnostics) {
  const diagnostic = diagnostics.find((item) =>
    typeof item?.parser_quality_score === 'number'
    || typeof item?.parser_quality_bucket === 'string');
  return {
    score: readNullableNumber(diagnostic?.parser_quality_score),
    bucket: readString(diagnostic?.parser_quality_bucket) || null,
  };
}

function stageTimingsFromRun(run) {
  const timings = {};
  for (const step of Array.isArray(run.steps) ? run.steps : []) {
    const elapsed = elapsedBetween(step.started_at, step.finished_at);
    if (elapsed !== null) {
      timings[stageTimingKey(step.stage_code)] = elapsed;
      addStageTiming(stageTimingKey(step.stage_code), elapsed);
    }
  }
  return timings;
}

function stageTimingKey(stageCode) {
  const map = {
    CITATION_NORMALIZED: 'citation',
    ABSTRACT_READY: 'abstract',
    FULLTEXT_PREPROCESSED: 'parser',
    KEY_CONTENT_READY: 'key_content',
    CHUNKED: 'chunk',
    EMBEDDED: 'embedding',
    INDEXED: 'index',
  };
  return map[stageCode] ?? String(stageCode).toLowerCase();
}

function mergeTimings(row, timings) {
  row.timings_ms = {
    ...row.timings_ms,
    ...timings,
  };
}

function elapsedBetween(startedAt, finishedAt) {
  const started = Date.parse(readString(startedAt));
  const finished = Date.parse(readString(finishedAt));
  if (!Number.isFinite(started) || !Number.isFinite(finished) || finished < started) {
    return null;
  }
  return finished - started;
}

function rowFor(key, required = true) {
  const row = report.per_literature.find((item) => item.key === key);
  if (!row && required) {
    throw new Error(`Report row not found for ${key}.`);
  }
  return row ?? null;
}

function recomputeMetrics() {
  const rows = report.per_literature;
  const processableRows = rows.filter((item) => item.expected_pipeline_outcome === INDEXED_OUTCOME);
  const blockerRows = rows.filter((item) => item.expected_pipeline_outcome !== INDEXED_OUTCOME);
  const warningCountsByCode = new Map();
  report.metrics.processable_sample_count = processableRows.length;
  report.metrics.expected_blocker_count = blockerRows.length;
  report.metrics.expected_blocker_success_count = blockerRows.filter((item) => item.expected_blocker_status === 'PASSED').length;
  report.metrics.download_success_count = processableRows.filter((item) => item.download_status === 'SUCCEEDED').length;
  report.metrics.parser_success_count = processableRows.filter((item) => item.parser_status === 'SUCCEEDED').length;
  const parserQualityScores = processableRows
    .map((item) => readNullableNumber(item.parser_quality_score))
    .filter((value) => value !== null);
  report.metrics.parser_quality_score_avg = parserQualityScores.length > 0 ? average(parserQualityScores) : null;
  report.metrics.parser_quality_low_count = processableRows.filter((item) =>
    item.parser_quality_bucket === 'low'
    || (typeof item.parser_quality_score === 'number' && item.parser_quality_score < 0.55)).length;
  report.metrics.key_content_success_count = processableRows.filter((item) => item.key_content_status === 'SUCCEEDED').length;
  report.metrics.indexed_success_count = processableRows.filter((item) => item.indexed_status === 'SUCCEEDED').length;
  report.metrics.key_content_warning_count = rows.reduce((sum, item) => sum + (item.key_content_warning_count ?? 0), 0);
  report.metrics.key_content_diagnostic_count = rows.reduce((sum, item) => sum + (item.key_content_diagnostic_count ?? 0), 0);
  report.metrics.key_content_warning_rate = report.metrics.key_content_diagnostic_count > 0
    ? report.metrics.key_content_warning_count / report.metrics.key_content_diagnostic_count
    : 0;
  for (const item of rows) {
    for (const diagnostic of item.diagnostics ?? []) {
      if (diagnostic.severity !== 'warning') {
        continue;
      }
      const code = typeof diagnostic.code === 'string' ? diagnostic.code : 'UNKNOWN';
      warningCountsByCode.set(code, (warningCountsByCode.get(code) ?? 0) + 1);
    }
  }
  report.metrics.key_content_warning_counts_by_code = Object.fromEntries([...warningCountsByCode.entries()]);
  const positiveResults = report.retrieval_results.filter((item) => !item.negative_expectation);
  const negativeResults = report.retrieval_results.filter((item) => item.negative_expectation);
  report.metrics.positive_query_count = positiveResults.length;
  report.metrics.negative_query_count = negativeResults.length;
  report.metrics.recall_at_5_hits = positiveResults.filter((item) => item.hit_at_5).length;
  report.metrics.recall_at_5 = positiveResults.length > 0 ? report.metrics.recall_at_5_hits / positiveResults.length : 1;
  report.metrics.mrr_at_5 = average(positiveResults.map((item) => item.reciprocal_rank ?? 0), 1);
  report.metrics.ndcg_at_5 = average(positiveResults.map((item) => item.ndcg_at_5 ?? 0), 1);
  const blindResults = positiveResults.filter((item) => item.query_set === 'blind');
  report.metrics.blind_query_count = blindResults.length;
  report.metrics.blind_recall_at_5_hits = blindResults.filter((item) => item.hit_at_5).length;
  report.metrics.blind_recall_at_5 = blindResults.length > 0
    ? report.metrics.blind_recall_at_5_hits / blindResults.length
    : 1;
  report.metrics.top5_canonical_diversity_avg = average(
    report.retrieval_results.map((item) => item.top5_canonical_diversity ?? 1),
    1,
  );
  report.metrics.top5_duplicate_work_count = report.retrieval_results.reduce(
    (sum, item) => sum + (item.top5_duplicate_work_count ?? 0),
    0,
  );
  report.metrics.negative_query_success_count = negativeResults.filter((item) => item.expected_absent_at_5).length;
  report.metrics.degraded_retrieval_count = report.retrieval_results.filter((item) => item.degraded_mode).length;
  report.telemetry.llm.total = combineTelemetry([
    report.telemetry.llm.key_content,
    report.telemetry.llm.embedding,
    report.telemetry.llm.retrieval_query,
  ]);
  evaluateStatus();
}

function evaluateStatus() {
  const pass = report.metrics.download_success_count >= report.thresholds.download_success_min
    && report.metrics.parser_success_count >= report.thresholds.parser_success_min
    && report.metrics.key_content_success_count >= report.metrics.processable_sample_count
    && report.metrics.indexed_success_count >= report.thresholds.indexed_success_min
    && report.metrics.expected_blocker_success_count >= report.thresholds.expected_blocker_success_min
    && report.metrics.recall_at_5 >= report.thresholds.recall_at_5_min
    && report.metrics.negative_query_success_count >= report.metrics.negative_query_count
    && report.metrics.key_content_warning_rate <= report.thresholds.key_content_warning_rate_max
    && report.metrics.degraded_retrieval_count === 0
    && report.failures.length === 0;
  report.status = pass ? 'PASS' : 'FAIL';
}

function pushStep(name, status, detail = {}) {
  const step = { name, status, at: new Date().toISOString(), detail };
  report.steps.push(step);
  console.log(`[${status}] ${name} ${JSON.stringify(detail).slice(0, 500)}`);
}

async function writeReport() {
  recomputeMetrics();
  report.finished_at = new Date().toISOString();
  await fs.mkdir(args.evidenceDir, { recursive: true });
  await fs.writeFile(path.join(args.evidenceDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await fs.writeFile(path.join(args.evidenceDir, 'report.md'), renderMarkdownReport(), 'utf8');
}

function renderMarkdownReport() {
  const metric = (value) => typeof value === 'number' ? (Number.isInteger(value) ? String(value) : value.toFixed(4)) : String(value);
  return `${[
    '# Literature Evaluator v2 E2E Report',
    '',
    `- Run ID: \`${report.run_id}\``,
    `- Fixture: \`${report.fixture_id}@${report.fixture_version ?? 'unknown'}\``,
    `- Mode: \`${report.mode}\``,
    `- Status: \`${report.status}\``,
    `- Key-content method: \`${report.key_content_method}\``,
    `- Started: \`${report.started_at}\``,
    `- Finished: \`${report.finished_at ?? ''}\``,
    `- Postgres schema: \`${report.environment.postgres_schema ?? ''}\``,
    '',
    '## Metrics',
    '',
    `- processable_samples: \`${report.metrics.processable_sample_count}/${report.metrics.sample_count}\``,
    `- expected_blockers: \`${report.metrics.expected_blocker_success_count}/${report.metrics.expected_blocker_count}\``,
    `- download_success: \`${report.metrics.download_success_count}/${report.metrics.processable_sample_count}\``,
    `- parser_success: \`${report.metrics.parser_success_count}/${report.metrics.processable_sample_count}\``,
    `- parser_quality_avg: \`${metric(report.metrics.parser_quality_score_avg ?? 'n/a')}\``,
    `- parser_quality_low_count: \`${report.metrics.parser_quality_low_count}\``,
    `- key_content_success: \`${report.metrics.key_content_success_count}/${report.metrics.processable_sample_count}\``,
    `- indexed_success: \`${report.metrics.indexed_success_count}/${report.metrics.processable_sample_count}\``,
    `- recall@5: \`${report.metrics.recall_at_5_hits}/${report.metrics.positive_query_count}\` (${metric(report.metrics.recall_at_5)})`,
    `- mrr@5: \`${metric(report.metrics.mrr_at_5)}\``,
    `- ndcg@5: \`${metric(report.metrics.ndcg_at_5)}\``,
    `- blind_recall@5: \`${report.metrics.blind_recall_at_5_hits}/${report.metrics.blind_query_count}\` (${metric(report.metrics.blind_recall_at_5)})`,
    `- top5_canonical_diversity_avg: \`${metric(report.metrics.top5_canonical_diversity_avg)}\``,
    `- top5_duplicate_work_count: \`${report.metrics.top5_duplicate_work_count}\``,
    `- negative_query_success: \`${report.metrics.negative_query_success_count}/${report.metrics.negative_query_count}\``,
    `- key_content_warning_rate: \`${report.metrics.key_content_warning_count}/${report.metrics.key_content_diagnostic_count}\` (${metric(report.metrics.key_content_warning_rate)})`,
    `- key_content_external_call_count: \`${report.metrics.key_content_external_call_count}\``,
    `- degraded_retrieval_count: \`${report.metrics.degraded_retrieval_count}\``,
    `- duplicate_stress: \`${JSON.stringify(report.metrics.duplicate_stress)}\``,
    '',
    '## Telemetry',
    '',
    `- embedding_tokens: \`${metric(report.telemetry.llm.embedding.embedding_input_tokens ?? 0)}\``,
    `- query_embedding_tokens: \`${metric(report.telemetry.llm.retrieval_query.embedding_input_tokens ?? 0)}\``,
    `- estimated_llm_cost_usd: \`${metric(report.telemetry.llm.total.estimated_cost_usd ?? 0)}\``,
    `- llm_request_count: \`${metric(report.telemetry.llm.total.request_count ?? 0)}\``,
    `- llm_retry_count: \`${metric(report.telemetry.llm.total.retry_count ?? 0)}\``,
    '',
    '## Per Literature',
    '',
    '| Key | Group | Expected | Download | Parser | Parser Quality | Key Content | Indexed | Warnings | Timings |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    ...report.per_literature.map((item) =>
      `| ${item.key} | ${item.source_group} | ${item.expected_pipeline_outcome} | ${item.download_status ?? ''} | ${item.parser_status ?? ''} | ${metric(item.parser_quality_score ?? 'n/a')}/${item.parser_quality_bucket ?? 'n/a'} | ${item.key_content_status ?? ''} | ${item.indexed_status ?? ''} | ${item.key_content_warning_count ?? 0}/${item.key_content_diagnostic_count ?? 0} | ${JSON.stringify(item.timings_ms)} |`),
    '',
    '## Retrieval',
    '',
    '| Query | Set | Expected | Negative | Hit@5 | Rank | RR | nDCG@5 | Diversity | Top 5 |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
    ...report.retrieval_results.map((item) =>
      `| ${item.id} | ${item.query_set ?? ''} | ${item.expected_key} | ${item.negative_expectation} | ${item.hit_at_5} | ${item.rank ?? ''} | ${item.reciprocal_rank ?? ''} | ${item.ndcg_at_5 ?? ''} | ${metric(item.top5_canonical_diversity ?? 1)} | ${item.top5.map((hit) => `${hit.key ?? hit.literature_id}:${hit.canonical_work_key ?? ''}:${hit.score}`).join('<br>')} |`),
    '',
    '## Steps',
    '',
    ...report.steps.map((step) => `### ${step.name}\n\n- Status: \`${step.status}\`\n- At: \`${step.at}\`\n\n\`\`\`json\n${JSON.stringify(step.detail, null, 2)}\n\`\`\`\n`),
    report.failures.length ? `## Failures\n\n${report.failures.map((failure) => `- ${failure}`).join('\n')}\n` : '',
  ].join('\n')}\n`;
}

function emptyReportTelemetry() {
  return {
    pricing: {
      source_url: 'https://platform.openai.com/docs/pricing/',
      captured_at: '2026-05-10',
      embedding_prices_usd_per_1m_tokens: EMBEDDING_PRICES_USD_PER_1M_TOKENS,
      note: 'Cost values are estimates for embedding calls when provider telemetry does not return cost_usd.',
    },
    stage_timings_ms: {},
    llm: {
      key_content: emptyTelemetryAggregate(),
      embedding: emptyTelemetryAggregate(),
      retrieval_query: emptyTelemetryAggregate(),
      total: emptyTelemetryAggregate(),
    },
  };
}

function addStageTiming(stage, elapsedMs) {
  if (typeof elapsedMs !== 'number' || !Number.isFinite(elapsedMs)) {
    return;
  }
  const existing = report.telemetry.stage_timings_ms[stage] ?? {
    count: 0,
    elapsed_ms_total: 0,
    elapsed_ms_max: 0,
  };
  existing.count += 1;
  existing.elapsed_ms_total += elapsedMs;
  existing.elapsed_ms_max = Math.max(existing.elapsed_ms_max, elapsedMs);
  report.telemetry.stage_timings_ms[stage] = existing;
}

function addTelemetry(phase, telemetry) {
  if (!telemetry) {
    return;
  }
  report.telemetry.llm[phase] = combineTelemetry([report.telemetry.llm[phase], telemetry]);
}

function enrichTelemetry(raw) {
  if (!isRecord(raw)) {
    return null;
  }
  const telemetry = {
    provider_id: readString(raw.provider_id) || null,
    model_id: readString(raw.model_id) || null,
    profile_id: readString(raw.profile_id) || null,
    prompt_template_id: readString(raw.prompt_template_id) || null,
    prompt_template_version: readString(raw.prompt_template_version) || null,
    elapsed_ms: readNullableNumber(raw.elapsed_ms),
    request_count: readNullableNumber(raw.request_count),
    retry_count: readNullableNumber(raw.retry_count),
    timeout_count: readNullableNumber(raw.timeout_count),
    rate_limit_count: readNullableNumber(raw.rate_limit_count),
    input_tokens: readNullableNumber(raw.input_tokens),
    output_tokens: readNullableNumber(raw.output_tokens),
    embedding_input_tokens: readNullableNumber(raw.embedding_input_tokens),
    total_tokens: readNullableNumber(raw.total_tokens),
    cost_usd: readNullableNumber(raw.cost_usd),
    estimated_cost_usd: null,
  };
  if (telemetry.cost_usd === null && telemetry.embedding_input_tokens !== null && telemetry.model_id) {
    const price = EMBEDDING_PRICES_USD_PER_1M_TOKENS[telemetry.model_id];
    if (typeof price === 'number') {
      telemetry.estimated_cost_usd = telemetry.embedding_input_tokens * price / 1_000_000;
    }
  }
  return telemetry;
}

function emptyTelemetryAggregate() {
  return {
    request_count: 0,
    retry_count: 0,
    timeout_count: 0,
    rate_limit_count: 0,
    elapsed_ms: 0,
    input_tokens: 0,
    output_tokens: 0,
    embedding_input_tokens: 0,
    total_tokens: 0,
    cost_usd: null,
    estimated_cost_usd: 0,
    models: {},
  };
}

function combineTelemetry(items) {
  const aggregate = emptyTelemetryAggregate();
  let hasCost = false;
  let hasEstimate = false;
  for (const item of items) {
    if (!isRecord(item)) {
      continue;
    }
    aggregate.request_count += readNumber(item.request_count);
    aggregate.retry_count += readNumber(item.retry_count);
    aggregate.timeout_count += readNumber(item.timeout_count);
    aggregate.rate_limit_count += readNumber(item.rate_limit_count);
    aggregate.elapsed_ms += readNumber(item.elapsed_ms);
    aggregate.input_tokens += readNumber(item.input_tokens);
    aggregate.output_tokens += readNumber(item.output_tokens);
    aggregate.embedding_input_tokens += readNumber(item.embedding_input_tokens);
    aggregate.total_tokens += readNumber(item.total_tokens);
    const cost = readNullableNumber(item.cost_usd);
    if (cost !== null) {
      aggregate.cost_usd = (aggregate.cost_usd ?? 0) + cost;
      hasCost = true;
    }
    const estimate = readNullableNumber(item.estimated_cost_usd);
    if (estimate !== null) {
      aggregate.estimated_cost_usd += estimate;
      hasEstimate = true;
    }
    const model = readString(item.model_id);
    if (model) {
      aggregate.models[model] = (aggregate.models[model] ?? 0) + readNumber(item.request_count);
    }
    if (isRecord(item.models)) {
      for (const [modelId, count] of Object.entries(item.models)) {
        aggregate.models[modelId] = (aggregate.models[modelId] ?? 0) + readNumber(count);
      }
    }
  }
  if (!hasCost) {
    aggregate.cost_usd = null;
  }
  if (!hasEstimate) {
    aggregate.estimated_cost_usd = null;
  }
  return aggregate;
}

function average(values, fallback = 0) {
  const numericValues = values.filter((value) => typeof value === 'number' && Number.isFinite(value));
  if (numericValues.length === 0) {
    return fallback;
  }
  return numericValues.reduce((sum, value) => sum + value, 0) / numericValues.length;
}

function readSchemaFromDatabaseUrl(value) {
  if (!value) {
    return null;
  }
  try {
    return new URL(value).searchParams.get('schema');
  } catch {
    return null;
  }
}

function publicError(error) {
  return error instanceof Error ? error.message : String(error);
}

function readString(value) {
  return typeof value === 'string' ? value : '';
}

function readNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function readNullableNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function isRecord(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}
