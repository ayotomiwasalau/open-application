import os

# Expose URLs via Flask template config mapping by importing in app.py
ARGOCD_URL = os.getenv('ARGOCD_URL', '#')
GRAFANA_URL = os.getenv('GRAFANA_URL', '#')
JAEGER_URL = os.getenv('JAEGER_URL', '#')
LOKI_URL = os.getenv('LOKI_URL', '#')
PROMETHEUS_URL = os.getenv('PROMETHEUS_URL', '#') 