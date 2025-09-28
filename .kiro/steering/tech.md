# Technology Stack

## Backend
- **Runtime**: Node.js with Azure Functions v4
- **Package Manager**: npm
- **Key Dependencies**:
  - `@azure/functions` - Azure Functions runtime
  - `@azure/cosmos` - Cosmos DB integration
  - `@azure/storage-blob` - Blob storage for file uploads
  - `axios` - HTTP client for OpenAI API calls
  - `stytch` - Authentication (alternative to Clerk)
  - `tiktoken` - Token counting for OpenAI models
  - `busboy` - File upload handling
  - `uuid` - Unique ID generation

## Frontend
- **Package Manager**: Bun (referenced in scripts)
- **Authentication**: Clerk (based on .env.example)

## Infrastructure
- **Cloud Platform**: Microsoft Azure
- **Database**: Azure Cosmos DB with partition key `/userId`
- **AI Service**: Azure OpenAI (GPT-4o model)
- **Storage**: Azure Blob Storage
- **Compute**: Azure Functions (serverless)

## Development Tools
- **Concurrency**: `concurrently` for running frontend/backend together
- **Testing**: Basic test script in `Backend/scripts/testScript.js`

## Common Commands

### Setup
```bash
# Install all dependencies
npm run install:all

# Start both frontend and backend
npm start

# Start backend only
cd Backend && npm start

# Start frontend only (when present)
npm run start:frontend
```

### Backend Development
```bash
cd Backend
npm install
func start  # Starts Azure Functions locally on port 7071
```

### Testing
```bash
# Run the interactive test script
cd Backend && node scripts/testScript.js
```