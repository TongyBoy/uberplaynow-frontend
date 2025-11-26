# Docker Setup Guide - Uber Arcade

This guide explains how to run both the frontend and backend together using Docker.

## Prerequisites

- Docker installed ([Download](https://www.docker.com/products/docker-desktop))
- Docker Compose installed (included with Docker Desktop)
- The backend repository (`uberplaynow-backend`) in a sibling folder

## Folder Structure

Your folders should be organized like this:

```
parent-folder/
├── uberplaynow-frontend/  (this repository)
│   ├── docker-compose.yml
│   ├── Dockerfile
│   ├── nginx.conf
│   └── ...
└── uberplaynow-backend/   (backend repository)
    ├── Dockerfile         (must exist in backend)
    └── ...
```

## Quick Start

### 1. Build and Run

From the `uberplaynow-frontend` directory, run:

```bash
docker-compose up --build
```

This will:
- Build the backend API container (port 3000)
- Build the frontend nginx container (port 8080)
- Start both services with proper networking

### 2. Access the Application

- **Frontend**: http://localhost:8080
- **Backend API**: http://localhost:3000 (proxied through frontend at http://localhost:8080/api)

### 3. Stop the Services

Press `Ctrl+C` or run:

```bash
docker-compose down
```

## Configuration

### Backend Location

If your backend is in a different location, update `docker-compose.yml`:

```yaml
api:
  build: ../path-to-your-backend  # Change this path
```

### Backend Port

If your backend uses a different port, update:
1. `docker-compose.yml` - ports section for the `api` service
2. `nginx.conf` - line 49, change `http://api:3000/` to your port

### Environment Variables

Add backend environment variables in `docker-compose.yml` under the `api` service:

```yaml
environment:
  - DATABASE_URL=postgresql://user:pass@host:5432/db
  - JWT_SECRET=your_secret_key
  - STRIPE_KEY=your_stripe_key
```

## Database Setup

If your backend requires a database, uncomment the `postgres` section in `docker-compose.yml` and update the connection details.

## Development Mode

For development with hot-reload:

1. **Backend**: Modify the backend's Dockerfile to support hot-reload (e.g., nodemon)
2. **Frontend**: Changes to static files require rebuilding:
   ```bash
   docker-compose restart frontend
   ```

## Troubleshooting

### Backend connection errors
- Check that the backend is healthy: `docker-compose logs api`
- Verify the backend Dockerfile exists and is properly configured

### Port conflicts
- If port 8080 or 3000 is already in use, change the ports in `docker-compose.yml`:
  ```yaml
  ports:
    - "9090:80"  # Change 8080 to 9090 (or any free port)
  ```

### CORS errors
- The nginx configuration handles CORS for Unity WebGL games
- Backend should not need additional CORS configuration when using this setup

## Alternative: Run Without Docker

If you prefer not to use Docker:

### Backend
```bash
cd ../uberplaynow-backend
npm install
npm run dev  # or your backend start command
```

### Frontend (with nginx)
```bash
# Install nginx, then:
nginx -c $(pwd)/nginx.conf

# Or use a simple static server (limited - no API proxy):
python -m http.server 8080
# Then manually update js/arcade-api.js to point to backend:
# this.baseURL = 'http://localhost:3000';
```

## Production Deployment

This Docker setup is for **local development only**. For production:
- Use the `deploy.ps1` script to deploy to AWS S3 + CloudFront
- Deploy the backend separately (e.g., AWS ECS, Lambda, or EC2)
- Update the API endpoint in the deployment script

See `README.md` for production deployment instructions.

