import multer from 'multer';
import path from 'path';
import { uploadImageBuffer } from '../services/r2Service.js';

// Files are held in memory, validated, then handed to r2Service (R2 or local disk).
const storage = multer.memoryStorage();

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// Safe extensions per detected image type (SVG/HTML/GIF etc. are never accepted)
const TYPES = {
  png: { mime: 'image/png', exts: ['.png'], ext: 'png' },
  jpeg: { mime: 'image/jpeg', exts: ['.jpg', '.jpeg'], ext: 'jpg' },
  webp: { mime: 'image/webp', exts: ['.webp'], ext: 'webp' },
};

function badRequest(message) {
  const err = new Error(message);
  err.status = 400;
  return err;
}

// Detect the real image type from magic bytes; returns a key of TYPES or null
function detectImageType(buf) {
  if (!Buffer.isBuffer(buf) || buf.length < 12) return null;
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'png';
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg';
  if (buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  return null;
}

// Throws a 400 error unless the file is a genuine PNG/JPEG/WebP with a matching extension
function validateImageFile(file) {
  const ext = path.extname(file.originalname || '').toLowerCase();
  const type = detectImageType(file.buffer);
  if (!type) {
    throw badRequest('Only JPEG, PNG, and WEBP images are allowed');
  }
  if (!TYPES[type].exts.includes(ext)) {
    throw badRequest('File extension does not match the image content');
  }
  if (file.mimetype !== TYPES[type].mime) {
    throw badRequest('File type does not match the image content');
  }
  return TYPES[type];
}

// Cheap early rejection by extension/mime; magic bytes are verified after buffering
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname || '').toLowerCase();
  const allowedExts = Object.values(TYPES).flatMap((t) => t.exts);
  const allowedMimes = Object.values(TYPES).map((t) => t.mime);
  if (allowedExts.includes(ext) && allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(badRequest('Only JPEG, PNG, and WEBP images are allowed'), false);
  }
};

const multerInstance = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
});

/**
 * Validates every buffered file, then uploads them via r2Service.
 * Sets `url` on each file and `req.files.uploadedUrls` (array, in images-then-image order).
 * Nothing is uploaded unless all files pass validation.
 */
export async function processUploadedFiles(req, res, next) {
  try {
    const groups = req.files && !Array.isArray(req.files) ? Object.values(req.files) : [req.files || []];
    const files = groups.flat().filter((f) => f && f.buffer);

    const validated = files.map((file) => ({ file, type: validateImageFile(file) }));

    const urls = await Promise.all(
      validated.map(({ file, type }) =>
        uploadImageBuffer({ buffer: file.buffer, contentType: type.mime, ext: type.ext })
      )
    );
    validated.forEach(({ file }, i) => {
      file.url = urls[i];
      file.filename = urls[i].split('/').pop();
      delete file.buffer; // free memory once stored
    });

    if (req.files && !Array.isArray(req.files)) {
      const ordered = [...(req.files.images || []), ...(req.files.image || [])];
      req.files.uploadedUrls = ordered.map((f) => f.url);
    } else if (Array.isArray(req.files)) {
      req.files.uploadedUrls = req.files.map((f) => f.url);
    }
    next();
  } catch (err) {
    next(err);
  }
}

function withProcessing(parser) {
  return (req, res, next) => {
    parser(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError && !err.status) err.status = 400;
        return next(err);
      }
      processUploadedFiles(req, res, next);
    });
  };
}

// Same API surface as multer (fields/array), but each returned middleware
// also validates magic bytes and stores the files via r2Service.
export const upload = {
  fields: (spec) => withProcessing(multerInstance.fields(spec)),
  array: (name, max) => withProcessing(multerInstance.array(name, max)),
};
