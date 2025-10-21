# Deployment Guide

## Turborepo + Vercel Setup

This project is configured as a monorepo using **Turborepo** with Vercel deployment support.

### Project Structure

```
Libra/
├── apps/
│   ├── Frontend/          # Vue 3 + Vite application
│   └── Backend/           # Node.js serverless functions
├── api/                   # Vercel serverless function wrappers
│   ├── chat.js           # Wraps Backend conversation handler
│   └── history.js        # Wraps Backend history handler
├── turbo.json            # Turborepo pipeline configuration
├── vercel.json           # Vercel deployment configuration
└── package.json          # Root workspace configuration
```

---

## Local Development

### Prerequisites
- Node.js >= 20.0.0
- Bun (package manager)

### Installation

```bash
# Install dependencies
bun install

# Build all workspaces
bun run build

# Run development servers (Frontend + Backend)
bun run dev

# Run only Frontend dev server
bun run dev:frontend

# Run only Backend dev server
bun run dev:backend
```

### Turborepo Commands

```bash
# Build all packages
turbo run build

# Run tests
turbo run test

# Lint all packages
turbo run lint

# Format code
turbo run format

# Clean build artifacts and cache
bun run clean
```

---

## Vercel Deployment

### Step 1: Import Project to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **Add New** → **Project**
3. Import your Git repository (GitHub, GitLab, or Bitbucket)
4. Select the `Libra` repository

### Step 2: Configure Build Settings

Vercel should auto-detect the configuration from `vercel.json`, but verify these settings:

- **Framework Preset**: Other
- **Root Directory**: `./` (leave as root)
- **Build Command**: `turbo run build`
- **Output Directory**: `apps/Frontend/dist`
- **Install Command**: `bun install`

### Step 3: Configure Environment Variables

Add the following environment variables in **Project Settings → Environment Variables**:

#### Required Environment Variables

| Variable Name | Description | Example |
|--------------|-------------|---------|
| `FIREBASE_SERVICE_ACCOUNT_BASE64` | Base64-encoded Firebase service account JSON | See below for encoding |
| `COSMOSDB_CONNECTION_STRING` | Azure Cosmos DB connection string | `AccountEndpoint=https://...` |
| `OPENAI_API_KEY` | Azure OpenAI API Key | `sk-...` or Azure key |
| `OPENAI_ENDPOINT` | Azure OpenAI Endpoint URL | `https://your-resource.openai.azure.com` |
| `AZURE_OPENAI_DEPLOYMENT_NAME` | Azure OpenAI deployment name | `gpt-4o` |
| `NODE_ENV` | Environment mode | `production` |

#### How to Encode Firebase Service Account

```bash
# In your terminal, run:
cat path/to/firebase-service-account.json | base64
```

Copy the output and paste it as the value for `FIREBASE_SERVICE_ACCOUNT_BASE64`.

### Step 4: Deploy

Click **Deploy** and wait for the build to complete.

Your app will be available at: `https://your-project.vercel.app`

---

## Vercel Serverless Functions

The backend API is exposed as Vercel serverless functions:

- **POST/GET** `/api/chat` - Conversation endpoint
- **GET/PUT/DELETE** `/api/history` - History management endpoint

These functions automatically scale and are deployed to Vercel's Edge Network.

---

## Turborepo Caching

Turborepo intelligently caches task outputs to speed up builds:

- **Local caching**: Enabled by default (stored in `.turbo/`)
- **Remote caching** (Optional): Link to Vercel for team caching

### Enable Remote Caching (Optional)

```bash
# Link your local project to Vercel
npx turbo login
npx turbo link
```

This enables shared caching across your team and CI/CD.

---

## CI/CD with GitHub Actions (Optional)

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]

jobs:
  build:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Bun
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest
      
      - name: Install dependencies
        run: bun install
      
      - name: Build
        run: bun run build
      
      - name: Lint
        run: bun run lint
      
      - name: Test
        run: bun run test
```

---

## Troubleshooting

### Build Fails on Vercel

1. Check environment variables are set correctly
2. Verify `FIREBASE_SERVICE_ACCOUNT_BASE64` is properly base64 encoded
3. Check build logs for specific errors

### Functions Timeout

- Default timeout is 10s on Hobby plan, 60s on Pro
- Check Azure OpenAI response times
- Consider upgrading Vercel plan if needed

### CORS Errors

API endpoints already have CORS headers configured:
- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS`

If issues persist, check your Frontend's API base URL configuration.

---

## Performance Optimization

### Frontend
- Code splitting is configured in Vite
- Consider lazy-loading routes
- Use `bun run build` to check bundle sizes

### Backend
- Firebase Admin SDK is initialized once per cold start
- CosmosDB client is reused across invocations
- Consider implementing response caching

---

## Monitoring

### Vercel Analytics
Enable in Project Settings → Analytics

### Vercel Logs
View real-time logs: Project → Deployments → [Select deployment] → Functions

### Azure Monitoring
- Monitor Cosmos DB through Azure Portal
- Track OpenAI API usage and costs

---

## Support

For issues or questions:
- Check Vercel documentation: https://vercel.com/docs
- Check Turborepo documentation: https://turbo.build/repo/docs

