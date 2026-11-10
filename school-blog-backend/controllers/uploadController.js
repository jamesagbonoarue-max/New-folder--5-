const { Readable } = require('node:stream');
const { cloudinary, isConfigured } = require('../config/cloudinary');

const uploadImage = async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Select an image to upload.' });
  if (!isConfigured) {
    return res.status(503).json({ message: 'Image uploads are not configured. Set the Cloudinary credentials.' });
  }

  try {
    const category = req.query.category;
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: `dgtis/${category}`,
          resource_type: 'image',
          allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        },
        (error, uploadResult) => (error ? reject(error) : resolve(uploadResult))
      );
      Readable.from(req.file.buffer).pipe(stream);
    });

    return res.status(201).json({
      image: result.secure_url,
      imagePublicId: result.public_id,
    });
  } catch (error) {
    console.error('Cloudinary image upload failed:', error);
    const cloudinaryMessage = String(error.error?.message || error.message || '');
    if (error.http_code === 403) {
      return res.status(502).json({
        message: 'Cloudinary denied the upload. Check that the cloud name, API key, and API secret are from the same active account and that uploads are enabled for that account.',
      });
    }
    if (/invalid cloud_name/i.test(cloudinaryMessage)) {
      return res.status(502).json({
        message: 'Cloudinary rejected the configured cloud name. Verify CLOUDINARY_CLOUD_NAME in the backend .env file.',
      });
    }
    if (/api.?key|api.?secret|authorization|credentials/i.test(cloudinaryMessage)) {
      return res.status(502).json({
        message: 'Cloudinary rejected its API credentials. Verify the Cloudinary API key and secret in the backend .env file.',
      });
    }
    return res.status(502).json({ message: 'Cloudinary could not store the image. Please check the server logs and try again.' });
  }
};

module.exports = { uploadImage };
