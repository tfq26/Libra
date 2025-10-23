
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .backend.env
dotenv.config({ path: path.resolve(__dirname, '.backend.env') });
console.log('[Backend Init] ✅ Environment variables loaded from .backend.env');

// Chat Function

export { default as chat } from './api/conversation.js';

// History Function
export { default as history } from './api/history.js';

// Warmup helper: initialize any heavy services (Firebase, Cosmos, AI client)
export async function warmUp(options = { pingAI: false }) {
	// Import lazily to avoid loading heavy modules at top-level during some serverless cold starts
	try {
		// Ensure environment loaded (already done at top of file)
		console.log('[Backend Init] 🔥 warmUp starting, options:', options);

		// Touch Firebase admin and Cosmos by requiring the modules used in handlers
		// This mirrors the initialization logic in the API files and will throw early if misconfigured
			const adminModule = await import('firebase-admin');
			// Handle CommonJS default export interop
			const admin = adminModule && (adminModule.default || adminModule);
			if (!admin || !admin.apps || !admin.apps.length) {
				if (!process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) {
					console.warn('[warmUp] FIREBASE_SERVICE_ACCOUNT_BASE64 not set; skipping Firebase init');
				} else {
										const base64 = (process.env.FIREBASE_SERVICE_ACCOUNT_BASE64 || '').trim();
										if (!base64) {
											throw new Error('FIREBASE_SERVICE_ACCOUNT_BASE64 is empty');
										}
										const serviceAccountJson = Buffer.from(base64, 'base64').toString('utf8');
										if (!serviceAccountJson) {
											throw new Error('Decoded FIREBASE_SERVICE_ACCOUNT_BASE64 is empty');
										}
										let serviceAccount;
										try {
											serviceAccount = JSON.parse(serviceAccountJson);
										} catch (e) {
											console.error('[warmUp] Decoded FIREBASE_SERVICE_ACCOUNT_BASE64 is not valid JSON');
											throw e;
										}
					// initialize on the resolved admin object
					admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
					console.log('[warmUp] ✅ Firebase Admin initialized');
				}
			} else {
				console.log('[warmUp] Firebase Admin already initialized');
			}

		// Cosmos client touch
		try {
			const { CosmosClient } = await import('@azure/cosmos');
			if (!process.env.COSMOSDB_CONNECTION_STRING) {
				console.warn('[warmUp] COSMOSDB_CONNECTION_STRING not set; skipping Cosmos initialization');
			} else {
				const client = new CosmosClient(process.env.COSMOSDB_CONNECTION_STRING);
				// perform a quick read to validate connectivity (no-op if database/container missing)
				try {
					const db = client.database('libraapp');
					const container = db.container('Conversations');
					await container.items.query({ query: 'SELECT TOP 1 c.id FROM c' }).fetchAll();
					console.log('[warmUp] ✅ CosmosDB connectivity verified');
				} catch (e) {
					console.warn('[warmUp] CosmosDB verification warning:', e.message);
				}
			}
		} catch (e) {
			console.warn('[warmUp] CosmosDB client import failed (maybe not installed):', e.message);
		}

		// Optionally ping AI endpoint with a lightweight health prompt to warm model
		if (options.pingAI) {
			try {
				const { callOpenAI } = await import('./lib/ai-service.js');
				// send a very short prompt that's cheap
				await callOpenAI('Say OK in one word.', []);
				console.log('[warmUp] ✅ AI endpoint ping succeeded');
			} catch (e) {
				console.warn('[warmUp] AI ping failed:', e.message);
			}
		}

		return { success: true };
	} catch (err) {
		console.error('[warmUp] Error during warmUp:', err);
		return { success: false, error: err.message };
	}
}

console.log('[Backend Init] ✅ Backend services initialized successfully');

//dummy
