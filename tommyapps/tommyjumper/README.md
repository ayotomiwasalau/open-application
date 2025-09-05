# TommyJumper Game

A fun and addictive TommyJumper game built with Flask and HTML5 Canvas. Jump on platforms, avoid enemies, and compete for high scores!

## Features

- 🎮 **Endless Gameplay**: Jump on platforms to climb higher and higher
- 🏆 **Leaderboard System**: Save and view top scores
- 🎯 **Progressive Difficulty**: Game gets harder as you level up
- 📱 **Responsive Design**: Works on desktop and mobile devices
- 🎨 **Modern UI**: Beautiful gradient backgrounds and smooth animations
- 📊 **Score Tracking**: Track score, level, and game duration
- 💾 **Simple Storage**: Uses JSON file for score persistence
- 📁 **Modular Code**: Separated JavaScript files for better organization

## Game Mechanics

- **Blue Platforms**: Regular platforms to jump on
- **Orange Platforms**: Moving platforms that slide back and forth
- **Red Enemies**: Avoid these enemies or you'll lose!
- **Screen Wrapping**: Move off one side and appear on the other
- **Progressive Difficulty**: Gravity increases with each level

## Controls

- **A/D** or **←/→** - Move left and right
- **Space** - Jump (optional)

## Setup

### Prerequisites

- Python 3.8+
- Docker (optional)

### Installation

1. **Clone the repository** (if not already done)
2. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the application**:
   ```bash
   python app.py
   ```

The game will be available at `http://localhost:3112`

### Docker Setup

1. **Build the Docker image**:
   ```bash
   docker build -t tommyjumper .
   ```

2. **Run the container**:
   ```bash
   docker run -p 3112:3112 tommyjumper
   ```

## Data Storage

The game uses a simple JSON file (`scores.json`) to store high scores. This file is automatically created when the first score is submitted and persists between application restarts.

## API Endpoints

- `GET /` - Main game page
- `GET /leaderboard` - Leaderboard page
- `GET /about` - About page
- `POST /submit-score` - Submit game score
- `GET /api/scores` - Get top scores (JSON)
- `GET /healthz` - Health check
- `GET /metrics` - Application metrics

## Project Structure

```
tommyjumper/
├── app.py              # Main Flask application
├── config.py           # Flask configuration
├── models.py           # Mock database implementation
├── requirements.txt    # Python dependencies
├── Dockerfile          # Docker configuration
├── README.md           # This file
├── scores.json         # Score storage (created automatically)
├── static/
│   ├── css/
│   │   └── main.css    # Game styles
│   └── js/
│       ├── game.js     # Main game logic
│       └── leaderboard.js # Leaderboard functionality
└── templates/
    ├── base.html       # Base template
    ├── index.html      # Game page
    ├── leaderboard.html # Leaderboard page
    ├── about.html      # About page
    └── 404.html        # Error page
```

## Technologies Used

- **Backend**: Flask (Python web framework)
- **Frontend**: HTML5 Canvas, JavaScript (modular)
- **Storage**: JSON file (mock database)
- **Styling**: CSS3 with gradients and animations

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is part of the open-post-software collection.

## Game Tips

- Plan your jumps ahead - look for the best platform to land on
- Use screen wrapping to your advantage
- Be careful with moving platforms - they can be tricky to land on
- Avoid enemies at all costs
- Try to stay in the center of the screen when possible

Enjoy playing TommyJumper! 🎮
