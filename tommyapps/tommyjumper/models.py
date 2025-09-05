from datetime import datetime
from typing import List, Optional

from config import db


class Score(db.Model):
    __tablename__ = 'scores'

    id = db.Column(db.Integer, primary_key=True)
    created = db.Column(db.DateTime, default=datetime.now)
    player_name = db.Column(db.String(100), nullable=False)
    score = db.Column(db.Integer, nullable=False)
    level = db.Column(db.Integer, nullable=False)
    game_duration = db.Column(db.Integer, nullable=False)

    def to_dict(self) -> dict:
        return {
            'id': self.id,
            'created': self.created.isoformat() if self.created else None,
            'player_name': self.player_name,
            'score': self.score,
            'level': self.level,
            'game_duration': self.game_duration,
        }


def add_score(player_name: str, score: int, level: int, game_duration: int) -> Score:
    new_score = Score(
        player_name=player_name,
        score=int(score),
        level=int(level),
        game_duration=int(game_duration),
    )
    db.session.add(new_score)
    db.session.commit()
    return new_score


def get_top_scores(limit: int = 10) -> List[dict]:
    rows: List[Score] = (
        Score.query.order_by(Score.score.desc(), Score.created.desc()).limit(limit).all()
    )
    return [row.to_dict() for row in rows]


def get_score_count() -> int:
    return db.session.query(Score).count()


# Lightweight in-memory cache retained for unit tests compatibility
class InMemoryScoreCache:
    def __init__(self, max_entries: Optional[int] = None):
        self.max_entries = max_entries or 1000
        self.scores: List[dict] = []
        self.next_id: int = 1

    def add_score(self, player_name: str, score: int, level: int, game_duration: int) -> dict:
        new_score = {
            'id': self.next_id,
            'created': datetime.now().isoformat(),
            'player_name': player_name,
            'score': int(score),
            'level': int(level),
            'game_duration': int(game_duration),
        }
        self.scores.append(new_score)
        self.next_id += 1
        if len(self.scores) > self.max_entries:
            over = len(self.scores) - self.max_entries
            if over > 0:
                self.scores = self.scores[over:]
        return new_score

    def get_top_scores(self, limit: int = 10) -> List[dict]:
        return sorted(self.scores, key=lambda x: x['score'], reverse=True)[:limit]

    def get_score_count(self) -> int:
        return len(self.scores)
