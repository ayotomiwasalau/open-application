from flask import Flask, jsonify, json, render_template, request, url_for, redirect, flash
from werkzeug.exceptions import abort
import logging
import sys
import os

# Add current directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import Flask configuration and mock database
from config import app, db
from models import add_score as db_add_score, get_top_scores, get_score_count

#connection count
db_connection_count = 0

# Configure logging
def configure_logging(log_level=logging.INFO, log_format='%(asctime)s - %(levelname)s - %(message)s'):
    """Configures logging to both stdout and stderr.

    Args:
        log_level (int, optional): The minimum severity level for logging. Defaults to logging.INFO.
        log_format (str, optional): The format string for log messages. Defaults to '%(asctime)s - %(levelname)s - %(message)s'.
    """

    stdout_handler = logging.StreamHandler(sys.stdout)
    stderr_handler = logging.StreamHandler(sys.stderr)

    formatter = logging.Formatter(log_format)
    stderr_handler.setFormatter(formatter)

    root_logger = logging.getLogger()
    root_logger.setLevel(log_level)
    root_logger.addHandler(stdout_handler)
    root_logger.addHandler(stderr_handler)

# Define the Flask application
app.config['SECRET_KEY'] = 'tommyjumper-secret-key-2024'
configure_logging()

# Ensure database tables exist at startup
with app.app_context():
    try:
        db.create_all()
    except Exception as e:
        logging.error("Failed to initialize database tables: {}".format(str(e)))

# Define the main route - TommyJumper game
@app.route('/')
def index():
    logging.info("TommyJumper game page loaded.")
    return render_template('index.html')

# Define the leaderboard page
@app.route('/leaderboard')
def leaderboard():
    # Get top 10 scores
    top_scores = get_top_scores(10)
    
    logging.info("Leaderboard page loaded with {} scores.".format(len(top_scores)))
    return render_template('leaderboard.html', scores=top_scores)

# Define the About page
@app.route('/about')
def about():
    try:
        logging.info("About page retrieved")
        return render_template('about.html')
    except Exception as e:
        logging.error("Error loading about page: {}".format(str(e)))
        raise

# API endpoint to submit game score
@app.route('/submit-score', methods=['POST'])
def submit_score():
    try:
        data = request.get_json()
        player_name = data.get('player_name', 'Anonymous')
        score = data.get('score', 0)
        level = data.get('level', 1)
        game_duration = data.get('game_duration', 0)

        if not player_name or score < 0:
            return jsonify({"error": "Invalid data provided"}), 400

        new_score = db_add_score(player_name, score, level, game_duration)
        
        logging.info("New score submitted: {} by {} (Level: {}, Duration: {}s)".format(
            score, player_name, level, game_duration))

        return jsonify({"success": True, "message": "Score submitted successfully"}), 200

    except Exception as e:
        logging.error("Error submitting score: {}".format(str(e)))
        return jsonify({"error": "Internal server error"}), 500

# API endpoint to get top scores
@app.route('/api/scores')
def get_scores():
    try:
        limit = request.args.get('limit', 10, type=int)
        top_scores = mock_db.get_top_scores(limit)
        
        return jsonify({"scores": top_scores}), 200

    except Exception as e:
        logging.error("Error getting scores: {}".format(str(e)))
        return jsonify({"error": "Internal server error"}), 500

@app.route('/healthz')
def health():
    return jsonify({"result": "OK - healthy"}), 200

@app.route('/metrics')
def metrics():
    score_count = get_score_count()
    
    response = {
        'score_count': score_count,
        'db_connection_count': db_connection_count
    }
    return jsonify(response), 200

# start the application on port 3112
if __name__ == "__main__":
   app.run(host='0.0.0.0', port='3112', debug=True)
