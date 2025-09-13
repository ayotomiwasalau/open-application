from flask import Flask, render_template
import os

app = Flask(__name__)

# Backoffice and games URLs from environment
app.config['TOMMYJUMPER_URL'] = os.getenv('TOMMYJUMPER_URL', '#')
app.config['ARGOCD_URL'] = os.getenv('ARGOCD_URL', '#')
app.config['GRAFANA_URL'] = os.getenv('GRAFANA_URL', '#')
app.config['JAEGER_URL'] = os.getenv('JAEGER_URL', '#')
app.config['LOKI_URL'] = os.getenv('LOKI_URL', '#')
app.config['PROMETHEUS_URL'] = os.getenv('PROMETHEUS_URL', '#')


@app.context_processor
def inject_config():
    return dict(config=app.config)


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/about')
def about():
    return render_template('about.html')


@app.route('/backoffice')
def backoffice():
    return render_template('backoffice.html')


@app.route('/healthz')
def healthz():
    return {"result": "OK - healthy"}, 200


@app.route('/metrics')
def metrics():
    return {"status": "ok"}, 200


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=3113, debug=True) 