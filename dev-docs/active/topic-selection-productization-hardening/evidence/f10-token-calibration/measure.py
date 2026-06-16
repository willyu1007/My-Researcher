#!/usr/bin/env python3
"""F-10 per-provider token calibration — reproducible measurement harness (T-123 Phase 5.2).

Measures real chars/token and CJK tokens/char ratios for the three providers/models in use,
over representative topic-selection payloads, and validates that the chosen per-provider
calibration NEVER underestimates the real tokenizer count once the profile safety margin (1.25)
is applied — including newline-dense CJK content (the case an adversarial review surfaced where
CJK tightening would otherwise erase the buffer that hid the under-counted newline tokens).

Provider -> model -> tokenizer mapping (verified 2026-06-15):
  openai    / gpt-5.5         -> tiktoken o200k_base   (GPT-4o/o-series/GPT-5 generation encoding)
  dashscope / qwen3.6-plus    -> Qwen BBPE             (Qwen2.5/Qwen3 share one 151,643-token vocab)
  deepseek  / deepseek-v4-pro -> DeepSeek-V3 BBPE      (DeepSeek-V3 tokenizer.json)

Tokenizer-version caveat: gpt-5.5 / qwen3.6-plus / deepseek-v4-pro are post-knowledge-cutoff
releases; their exact tokenizers are not independently verifiable here. We measure with the
stable family tokenizer (providers change tokenizers at most once per major generation) and
choose calibration ratios ABOVE the measured mean so modest tokenizer drift cannot cause
underestimation; the unchanged 1.25 profile safety margin is a second conservatism layer.

Calibration under test (must match PROVIDER_TOKEN_CALIBRATIONS in the service):
  cjk_tokens_per_char: openai 0.90, dashscope 0.95, deepseek 0.85   (default/unknown = 1.0)
  newline_divisor:     all providers 1                              (default/unknown = 8)
  latin_chars_per_token 4, latin_words_multiplier 1.15              (unchanged for all)
dashscope is the LEAST tightened despite the lowest raw CJK mean (0.73): its Latin/structure
tokenization is the least efficient, so its whole-input safety margin is the thinnest — the
calibration value is bounded by full-input worst-case headroom, not by the raw CJK ratio.

Run:  pip install tiktoken tokenizers huggingface_hub && python3 measure.py
Requires network (HuggingFace) on first run. Corpora are re-derived from this repo's
dev-docs (technical Chinese, same domain/author) and backend source (Latin/code).
"""
import re, math, json, random, statistics, glob, os, shutil, sys
import tiktoken
from tokenizers import Tokenizer
from huggingface_hub import hf_hub_download

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", ".."))
SAFETY = 1.25  # profile token_estimate_safety_margin (unchanged by this calibration)

# final calibration under test: {cjk_tokens_per_char, newline_divisor}; latin stays at default 4 / 1.15
FINAL = {"o200k": {"cjk": 0.90, "nl": 1}, "qwen": {"cjk": 0.95, "nl": 1}, "deepseek": {"cjk": 0.85, "nl": 1}}

# ---------------------------------------------------------------- tokenizers
o200k = tiktoken.get_encoding("o200k_base")
def _hf(repo, name):
    dst = os.path.join(os.path.dirname(__file__), f"{name}.tokenizer.json")
    if not os.path.exists(dst):
        shutil.copy(hf_hub_download(repo_id=repo, filename="tokenizer.json"), dst)
    return Tokenizer.from_file(dst)
qwen = _hf("Qwen/Qwen2.5-7B-Instruct", "qwen")
deepseek = _hf("deepseek-ai/DeepSeek-V3", "deepseek")
def enc_len(p, s):
    if not s: return 0
    if p == "o200k": return len(o200k.encode(s))
    if p == "qwen": return len(qwen.encode(s, add_special_tokens=False).ids)
    return len(deepseek.encode(s, add_special_tokens=False).ids)

# ---------------------------------------------------------------- corpora (re-derived from repo)
CJK = re.compile(r'[　-〿㐀-䶿一-鿿豈-﫿＀-￯]')
def build_cjk_corpus():
    docs = []
    for pat in ["topic-selection-productization-hardening", "topic-selection-v1b-human-review-path",
                "paper-implementation-runtime-orchestration-hardening", "topic-selection-agent-workflow-review"]:
        docs += glob.glob(os.path.join(REPO, "dev-docs/active", pat, "*.md"))
    out = []
    for d in sorted(docs):
        try: t = open(d, encoding='utf-8').read()
        except Exception: continue
        out += [ln for ln in t.splitlines() if len(CJK.findall(ln)) >= 8]
    return "\n".join(out)

cjk_corpus = build_cjk_corpus()
cjk_lines = [l.strip() for l in cjk_corpus.splitlines() if len(l.strip()) >= 12]

# ---------------------------------------------------------------- faithful estimator port (newline-aware)
WORD = re.compile(r"[A-Za-z]+(?:'[A-Za-z]+)?|\d+(?:\.\d+)?")
STRUCT = re.compile(r'[{}\[\]:,"]')
def stable(v):
    if v is None: return 'null'
    if isinstance(v, bool): return 'true' if v else 'false'
    if isinstance(v, (int, float)): return json.dumps(v)
    if isinstance(v, str): return json.dumps(v, ensure_ascii=False)
    if isinstance(v, list): return '[' + ','.join(stable(x) for x in v) + ']'
    return '{' + ','.join(json.dumps(k, ensure_ascii=False) + ':' + stable(v[k]) for k in sorted(v)) + '}'
def est_text(value, cjk_pc, nl_div):
    if not value: return 0
    cjk = len(CJK.findall(value)); noncjk = CJK.sub(' ', value)
    words = len(WORD.findall(noncjk)); nch = len(re.sub(r'\s+', '', noncjk))
    latin = max(math.ceil(nch / 4), math.ceil(words * 1.15))
    return max(1, math.ceil(cjk * cjk_pc) + latin + math.ceil(value.count(chr(10)) / nl_div))
def ck(v): return (len(v) + sum(ck(x) for x in v.values())) if isinstance(v, dict) else (sum(ck(x) for x in v) if isinstance(v, list) else 0)
def est_payload(v, c, nl): s = stable(v); return est_text(s, c, nl) + math.ceil(len(STRUCT.findall(s)) / 12) + ck(v)
def est_input(inp, c, nl):
    mt = sum(4 + est_text(m['role'], c, nl) + est_text(m['content'], c, nl) for m in inp.get('messages', []))
    ct = sum(est_payload(p, c, nl) for p in inp.get('context_payloads', []))
    sc = math.ceil(est_payload(inp['schema'], c, nl) * 1.2) if inp.get('schema') else 0
    return math.ceil((mt + ct + sc) * SAFETY)
def actual(p, inp):
    t = sum(enc_len(p, m['content']) + enc_len(p, m['role']) + 4 for m in inp.get('messages', []))
    t += sum(enc_len(p, stable(pl)) for pl in inp.get('context_payloads', []))
    if inp.get('schema'): t += enc_len(p, stable(inp['schema']))
    return t

# ---------------------------------------------------------------- (0) DEFAULT byte-identity guard
# default calibration (cjk=1.0, nl_div=8) must reproduce the original heuristic exactly.
s_nl = "阻断项\n" * 8
assert est_text(s_nl, 1.0, 8) == 25, "default byte-identity broken"
print("# default byte-identity (cjk=1.0, nl_div=8): OK\n")

# ---------------------------------------------------------------- (1) raw CJK ratio on pure-CJK runs
runs = [m.group(0) for m in re.finditer(r'[　-〿㐀-䶿一-鿿豈-﫿＀-￯]{4,}', cjk_corpus)]
print(f"# pure-CJK runs={len(runs)} cjk-chars={sum(len(r) for r in runs)}")
print("## CJK tokens-per-char (pure-CJK runs)")
for p in ["o200k", "qwen", "deepseek"]:
    tc = sum(len(r) for r in runs); tt = sum(enc_len(p, r) for r in runs)
    print(f"  {p:9s} mean={tt/tc:.3f} tok/char")

# ---------------------------------------------------------------- (2) pathological newline-dense CJK
print("\n## pathological '阻断项\\n'*8 (newline every 3 chars) x1.25")
for p in ["o200k", "qwen", "deepseek"]:
    act = enc_len(p, s_nl); cal = math.ceil(est_text(s_nl, FINAL[p]["cjk"], FINAL[p]["nl"]) * SAFETY)
    print(f"  {p:9s} actual={act} calib={cal} -> {'UNDER' if cal < act else 'safe'}")

# ---------------------------------------------------------------- (3) full-input validation
en = ["long-context reasoning", "residual risk", "method-family gap", "loopback budget",
      "compression strategy", "provider override", "human_delegated", "value assessment"]
keys = ["need_statement", "residual_risks", "method_family_gaps", "blockers", "rationale",
        "scope", "topic_question", "claim_ceiling", "target_community", "non_goals", "recheck_hints"]
SCHEMA = {"type": "object", "required": ["candidates"], "properties": {"candidates": {"type": "array", "items": {
    "type": "object", "required": ["need_statement", "rationale"], "properties": {
        "need_statement": {"type": "string"}, "rationale": {"type": "string"},
        "residual_risks": {"type": "array", "items": {"type": "string"}}}}}}}
def mk(rnd, heavy, newliney):
    def val():
        r = rnd.random()
        if heavy or r < 0.7: return rnd.choice(cjk_lines)
        if r < 0.85: return rnd.choice(cjk_lines)[:30] + " " + rnd.choice(en)
        return [rnd.choice(en) for _ in range(rnd.randint(1, 4))]
    if newliney:  # multi-line CJK message content (vertical bullet lists)
        user = "\n".join(rnd.sample(cjk_lines, min(rnd.randint(4, 10), len(cjk_lines))))
        sys_c = "请基于上下文生成有据的研究需求候选：\n保留阻断项、残余风险、方法族缺口。"
    else:
        user = rnd.choice(cjk_lines) + " " + rnd.choice(cjk_lines)
        sys_c = "You generate grounded research need candidates preserving blockers and residual risks."
    return {"messages": [{"role": "system", "content": sys_c}, {"role": "user", "content": user}],
            "context_payloads": [{k: val() for k in rnd.sample(keys, rnd.randint(4, 9))} for _ in range(rnd.randint(2, 5))],
            "schema": SCHEMA}
inputs = []
for seed in range(12):
    rnd = random.Random(seed * 101 + 7)
    for i in range(100):
        inputs.append(mk(rnd, heavy=(i % 4 == 0), newliney=(i % 3 == 0)))  # 25% CJK-heavy, 33% newline-heavy
print(f"\n## full-input validation: {len(inputs)} inputs (33% newline-heavy msg content + 25% CJK-heavy), x{SAFETY}")
print("provider   est/actual min   mean   underestimates")
ok = True
for p in ["o200k", "qwen", "deepseek"]:
    rs = [est_input(i, FINAL[p]["cjk"], FINAL[p]["nl"]) / actual(p, i) for i in inputs]
    under = sum(1 for r in rs if r < 1.0)
    if under > 0: ok = False
    print(f"  {p:9s} min={min(rs):.3f} mean={statistics.mean(rs):.3f} under={under}/{len(inputs)}")
print(f"\nRESULT: {'PASS — calibration never underestimates' if ok else 'FAIL'}")
sys.exit(0 if ok else 1)
