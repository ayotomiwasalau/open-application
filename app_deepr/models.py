from datetime import datetime

from config import db

class posts(db.Model):
    __tablename__ = "posts"

    id = db.Column(db.Integer, primary_key=True)
    created = db.Column(db.DateTime, default=datetime.now())
    title = db.Column(db.String(256))
    content = db.Column(db.String(2046))
    name = db.Column(db.String(100))
