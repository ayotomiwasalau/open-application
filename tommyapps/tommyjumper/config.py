from flask import Flask
import os

from flask_sqlalchemy import SQLAlchemy


app = Flask(__name__)

# Database configuration via environment variables
db_user = os.getenv('DB_USERNAME', 'postgres')
db_password = os.getenv('DB_PASSWORD', 'password')
db_host = os.getenv('DB_HOST', 'localhost')
db_port = os.getenv('DB_PORT', '5432')
db_name = os.getenv('DB_NAME', 'postgres')

database_url = os.getenv(
    'DATABASE_URL',
    f'postgresql+psycopg2://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}'
)

app.config['SQLALCHEMY_DATABASE_URI'] = database_url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)
