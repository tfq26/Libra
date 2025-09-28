# Project Structure

## Root Level
- **Monorepo**: Uses npm workspaces with `frontend` and `Backend` as separate packages
- **Package Management**: Mixed approach - npm for backend, Bun for frontend
- **Environment**: `.env` for secrets, `.env.example` for template

## Backend Structure (`/Backend`)
```
Backend/
├── src/functions/          # Azure Functions
│   └── libra2.js          # Main chat API endpoints
├── scripts/               # Development utilities
│   └── testScript.js      # Interactive testing tool
├── package.json           # Backend dependencies
├── host.json             # Azure Functions configuration
├── local.settings.json   # Local development settings
└── tsconfig.json         # TypeScript configuration
```

## Key Conventions

### API Endpoints
- **Chat**: `/api/chat` - Handles both GET (fetch conversation) and POST (send message)
- **History**: `/api/history` - GET endpoint for conversation list

### Data Models
- **Conversations**: Stored in Cosmos DB with `/userId` partition key
- **Messages**: Array within conversation documents with role/content/timestamp
- **IDs**: UUID v4 for conversation IDs

### File Organization
- Single function file (`libra2.js`) contains all HTTP triggers
- Utility functions defined inline within main file
- Configuration via environment variables
- Test scripts in dedicated `/scripts` folder

### Environment Variables
Required for backend operation:
- `CosmosDBConnectionString`
- `AzureOpenAIApiKey`
- `AzureOpenAIEndpoint` 
- `AzureOpenAIDeploymentName`

### Development Patterns
- Functions use ES6 imports
- Async/await for all database and API operations
- Error handling with try/catch blocks
- Token counting for OpenAI context management
- Exponential backoff in test utilities