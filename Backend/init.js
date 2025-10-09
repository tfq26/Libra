
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .backend.env
dotenv.config({ path: path.resolve(__dirname, '.backend.env') });

// Chat Function

export { default as chat } from './api/conversation.js';

// History Function
export { default as history } from './api/history.js';
