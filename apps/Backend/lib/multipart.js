import Busboy from 'busboy';

function normalizeFileMeta({ fieldname, filename, encoding, mimetype, size, buffer }) {
  const meta = typeof filename === 'object' ? filename : null;
  const normalizedName = meta?.filename || filename || 'unnamed';
  const normalizedEncoding = meta?.encoding || encoding || '7bit';
  const normalizedMime = meta?.mimeType || mimetype || meta?.contentType || '';

  return {
    fieldname,
    originalName: normalizedName,
    encoding: normalizedEncoding,
    mimeType: typeof normalizedMime === 'string' ? normalizedMime : '',
    size,
    buffer,
  };
}

export async function parseMultipartRequest(req, { maxFiles, maxFileSize }) {
  return new Promise((resolve, reject) => {
    try {
      const busboy = Busboy({
        headers: req.headers,
        limits: {
          files: maxFiles,
          fileSize: maxFileSize,
        },
      });

      const fields = {};
      const files = [];

      busboy.on('field', (name, value) => {
        fields[name] = value;
      });

      busboy.on('file', (fieldname, fileStream, filename, encoding, mimetype) => {
        const chunks = [];
        let size = 0;

        let trueFilename = filename;
        let trueEncoding = encoding;
        let trueMimeType = mimetype;
        if (filename && typeof filename === 'object') {
          trueFilename = filename.filename || filename.name || 'unnamed';
          trueEncoding = filename.encoding || encoding || '7bit';
          trueMimeType = filename.mimeType || filename.mimetype || mimetype || '';
        }

        fileStream.on('data', (chunk) => {
          size += chunk.length;
          chunks.push(chunk);
        });

        fileStream.on('limit', () => {
          reject(Object.assign(new Error(`File ${trueFilename} exceeds the allowed size limit.`), { statusCode: 413 }));
        });

        fileStream.on('error', (err) => {
          reject(err);
        });

        fileStream.on('end', () => {
          const buffer = Buffer.concat(chunks);
          files.push(
            normalizeFileMeta({
              fieldname,
              filename: trueFilename,
              encoding: trueEncoding,
              mimetype: trueMimeType,
              size,
              buffer,
            })
          );
        });
      });

      busboy.on('error', (err) => reject(err));
      busboy.on('finish', () => resolve({ fields, files }));

      req.pipe(busboy);
    } catch (err) {
      reject(err);
    }
  });
}
