import { BlobServiceClient, StorageSharedKeyCredential, BlobSASPermissions, generateBlobSASQueryParameters } from '@azure/storage-blob';
import { v4 as uuidv4 } from 'uuid';

let containerClientPromise = null;
let sharedKeyCredential = null;

const DEFAULT_CONTAINER = process.env.AZURE_STORAGE_CONTAINER || process.env.AZURE_STORAGE_MEDIA_CONTAINER || 'conversation-attachments';

function parseConnectionString(connectionString) {
  const segments = connectionString.split(';').filter(Boolean);
  const map = Object.create(null);
  for (const segment of segments) {
    const [key, value] = segment.split('=');
    if (key && value) {
      map[key.trim().toLowerCase()] = value;
    }
  }
  const accountName = map['accountname'];
  const accountKey = map['accountkey'];
  if (!accountName || !accountKey) {
    throw new Error('AZURE_STORAGE_CONNECTION_STRING must contain AccountName and AccountKey.');
  }
  return { accountName, accountKey };
}

function ensureBlobClients() {
  if (containerClientPromise) {
    return containerClientPromise;
  }

  containerClientPromise = (async () => {
    let blobServiceClient;
    let accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
    let accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;

    if (connectionString) {
      const creds = parseConnectionString(connectionString);
      accountName = creds.accountName;
      accountKey = creds.accountKey;
      blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    } else {
      if (!accountName || !accountKey) {
        throw new Error('Azure Storage credentials are missing. Set AZURE_STORAGE_CONNECTION_STRING or AZURE_STORAGE_ACCOUNT_NAME/AZURE_STORAGE_ACCOUNT_KEY.');
      }
      const url = process.env.AZURE_STORAGE_BLOB_URL || `https://${accountName}.blob.core.windows.net`;
      sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
      blobServiceClient = new BlobServiceClient(url, sharedKeyCredential);
    }

    if (!sharedKeyCredential) {
      if (!accountName || !accountKey) {
        throw new Error('Unable to derive StorageSharedKeyCredential for SAS generation.');
      }
      sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);
    }

    const containerName = DEFAULT_CONTAINER;
    const containerClient = blobServiceClient.getContainerClient(containerName);
  // Azure Blob Storage valid access values: 'container' or 'blob'
  await containerClient.createIfNotExists();
    return containerClient;
  })();

  return containerClientPromise;
}

export async function uploadAttachment(buffer, { userId, conversationId, mimeType, fileName }) {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    throw new Error('Attachment buffer is required.');
  }
  if (!mimeType || !mimeType.startsWith('image/')) {
    throw new Error('Only image uploads are supported.');
  }

  const containerClient = await ensureBlobClients();
  const normalizedConversation = conversationId || 'unassigned';
  const normalizedUser = userId || 'anonymous';
  const extension = (() => {
    try {
      const pieces = fileName ? fileName.split('.') : [];
      const ext = pieces.length > 1 ? pieces.pop() : null;
      return ext ? `.${ext.toLowerCase()}` : '';
    } catch (_) {
      return '';
    }
  })();

  const blobName = `${normalizedUser}/${normalizedConversation}/${uuidv4()}${extension}`;
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  await blockBlobClient.uploadData(buffer, { blobHTTPHeaders: { blobContentType: mimeType } });

  return {
    blobName,
    size: buffer.length,
    mimeType,
    originalFileName: fileName || null,
    uploadedAt: new Date().toISOString(),
  };
}

export async function generateBlobSASUrl(blobName, expiresInSeconds = 900) {
  if (!blobName) {
    throw new Error('blobName is required to generate a SAS URL.');
  }
  const containerClient = await ensureBlobClients();
  if (!sharedKeyCredential) {
    throw new Error('Shared key credential unavailable. Cannot generate SAS URL.');
  }

  const expiresOn = new Date(Date.now() + Math.max(expiresInSeconds, 60) * 1000);
  const sas = generateBlobSASQueryParameters({
    containerName: containerClient.containerName,
    blobName,
    expiresOn,
    permissions: BlobSASPermissions.parse('r'),
  }, sharedKeyCredential).toString();

  const blobUrl = containerClient.getBlockBlobClient(blobName).url;
  return `${blobUrl}?${sas}`;
}

export async function deleteBlobIfExists(blobName) {
  if (!blobName) return false;
  const containerClient = await ensureBlobClients();
  const blockBlobClient = containerClient.getBlockBlobClient(blobName);
  const response = await blockBlobClient.deleteIfExists();
  return response.succeeded || response === true;
}

export function stripEphemeralAttachmentFields(message) {
  if (!message || !message.content || !Array.isArray(message.content.attachments)) {
    return;
  }
  for (const attachment of message.content.attachments) {
    if (attachment && typeof attachment === 'object') {
      delete attachment.signedUrl;
      delete attachment.tempUrl;
      delete attachment.previewUrl;
      delete attachment.status;
    }
  }
}

export async function enrichAttachmentsWithSignedUrls(message, { expiresInSeconds = 900 } = {}) {
  if (!message || !message.content || !Array.isArray(message.content.attachments)) {
    return;
  }
  for (const attachment of message.content.attachments) {
    if (!attachment || typeof attachment !== 'object') continue;
    if (!attachment.blobName) continue;
    try {
      attachment.signedUrl = await generateBlobSASUrl(attachment.blobName, expiresInSeconds);
    } catch (err) {
      console.warn('[Blob] Failed to generate SAS URL for attachment', attachment.blobName, err.message || err);
    }
  }
}