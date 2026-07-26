# T-132 M7-L1 offline compatibility fixture. The live route uses a PAI
# official image plus content-addressed OSS code/data/output mounts; this
# image is retained only for network-disabled local verification.
FROM python:3.11-slim@sha256:00af38ae2ed311628970782e8a2d7f014d8909dbc63cb97bc0a158187f4db045
COPY entrypoint.py /workload/entrypoint.py
COPY cells /workload/cells
WORKDIR /workload
ENTRYPOINT ["python3", "/workload/entrypoint.py"]
