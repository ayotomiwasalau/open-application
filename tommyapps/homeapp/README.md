# HomeApp

A simple Flask app that showcases Tommy's wall of vibecoded games with links to games and platform backoffice UIs.

## Run locally

```bash
pip install -r requirements.txt
python app.py
```

## Configure backoffice links
Set environment variables before running to wire external UIs:

- `ARGOCD_URL`
- `GRAFANA_URL`
- `JAEGER_URL`
- `LOKI_URL`
- `PROMETHEUS_URL` 