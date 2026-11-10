const multer = require('multer');

const isSupportedImage = (buffer) => {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return true;
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return true;
  if (buffer.length >= 6 && ['GIF87a', 'GIF89a'].includes(buffer.subarray(0, 6).toString())) return true;
  return buffer.length >= 12
    && buffer.subarray(0, 4).toString() === 'RIFF'
    && buffer.subarray(8, 12).toString() === 'WEBP';
};

const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter(req, file, callback) {
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.mimetype)) {
      const error = new Error('Only JPEG, PNG, GIF, and WebP images are allowed.');
      error.statusCode = 400;
      return callback(error);
    }
    return callback(null, true);
  },
});

const validateImageSignature = (req, res, next) => {
  if (!req.file || !isSupportedImage(req.file.buffer)) {
    return res.status(400).json({ message: 'Upload a valid JPEG, PNG, GIF, or WebP image.' });
  }
  return next();
};

module.exports = { uploadImage, validateImageSignature, isSupportedImage };
