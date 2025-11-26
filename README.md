# Uber Arcade - Frontend

This repository contains the frontend for Uber Arcade, including:
- Static HTML pages
- CSS stylesheets
- JavaScript files
- Unity WebGL games (Snake, Brick Breaker, Meteors)
- Images and fonts

## 🚀 Deployment

This frontend is designed to be deployed to **AWS S3 + CloudFront** for static hosting.

### Frontend Structure

```
/
├── index.html              # Landing page
├── games.html              # Game selection page
├── nice-work-player.html   # Results/voucher page
├── alternative-page.html   # Session expired page
├── try-again.html          # Try again page
├── 404.html / 403.html     # Error pages
├── css/                    # Stylesheets
├── js/                     # JavaScript files
│   ├── arcade-api.js       # API client
│   ├── session-timer.js    # Timer functionality
│   └── game-result-handler.js
├── games/                  # Unity WebGL games
│   ├── Snake/
│   ├── BrickBreaker/
│   └── Asteroid/
├── images/                 # Image assets
├── fonts/                  # Font files
└── nginx.conf             # Routing rules (for reference)
```

## 🔧 Local Development

To test locally with live API:

```bash
# Serve static files (requires Python 3)
python -m http.server 8080

# Or use any static file server
npx serve -p 8080
```

Then update `js/arcade-api.js` to point to your backend API URL.

## 🌐 API Integration

The frontend connects to the backend API. Update the API base URL in `js/arcade-api.js`:

```javascript
const API_BASE_URL = 'https://your-api-domain.com/api';
```

## 📦 Build for Production

This is a static site - no build step required. Simply:

1. Update API URL in `arcade-api.js`
2. Upload all files to S3
3. Configure CloudFront with routing rules from `nginx.conf`

## 🎮 Games Included

- **Snake** - Classic snake game
- **Brick Breaker** - Breakout-style game
- **Meteors (Asteroids)** - Space shooter

All games are built with Unity WebGL.

## 📄 Environment Variables

Set these in your deployment pipeline:

- `API_BASE_URL` - Backend API URL (e.g., `https://api.uberarcade.com`)

## 🔗 Related Repositories

- **Backend API**: [uberplaynow-backend](../uberplaynow-backend)

## 📝 License

Proprietary - Uber Arcade


