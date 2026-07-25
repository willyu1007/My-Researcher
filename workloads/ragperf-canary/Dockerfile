# T-132 M7-L1 canary workload image. CPU-only, stdlib-only, no runtime network.
# Build (owner side), then push to ACR cn-shanghai and record BOTH digests in
# 18-m7-l1-authorization-materials.md:
#   docker build -t <acr>/pea/ragperf-canary:v1 workloads/ragperf-canary
#   docker push  <acr>/pea/ragperf-canary:v1        # record RepoDigest sha256
#   shasum -a 256 workloads/ragperf-canary/entrypoint.py   # code digest
FROM python:3.11-slim@sha256:00af38ae2ed311628970782e8a2d7f014d8909dbc63cb97bc0a158187f4db045
COPY entrypoint.py /workload/entrypoint.py
COPY cells /workload/cells
WORKDIR /workload
ENTRYPOINT ["python3", "/workload/entrypoint.py"]
