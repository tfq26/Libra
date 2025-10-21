import { spawnSync } from 'child_process';
import axios from 'axios';

// This integration test requires Azure env vars to be set in the environment.
const key = process.env.AzureOpenAIApiKey || process.env.AZURE_OPENAI_API_KEY;
const endpoint = process.env.AzureOpenAIEndpoint || process.env.AZURE_OPENAI_ENDPOINT;
const deployment = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;

if (!key || !endpoint || !deployment) {
    console.warn('Skipping Azure integration test: missing Azure environment variables.');
    process.exit(0);
}

test('azure deployment returns a valid completion', async () => {
    const urlBase = endpoint.replace(/\/$/, '');
    const url = /\/openai\//i.test(urlBase) ? urlBase : `${urlBase}/openai/deployments/${encodeURIComponent(deployment)}/chat/completions?api-version=2025-01-01-preview`;

    const resp = await axios.post(url, {
        messages: [{ role: 'user', content: 'Say hello in one word.' }],
        max_tokens: 10
    }, {
        headers: { 'api-key': key, 'Content-Type': 'application/json' },
        timeout: 120000
    });

    expect(resp.status).toBe(200);
    expect(resp.data).toBeDefined();
    expect(resp.data.choices && resp.data.choices.length).toBeGreaterThan(0);
});
