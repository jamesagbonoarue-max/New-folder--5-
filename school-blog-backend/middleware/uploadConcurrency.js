const MAX_ACTIVE_IMAGE_UPLOADS = 8;
let activeImageUploads = 0;

const limitConcurrentUploads = (req, res, next) => {
  if (activeImageUploads >= MAX_ACTIVE_IMAGE_UPLOADS) {
    res.set('Retry-After', '5');
    return res.status(503).json({ message: 'Image uploads are busy. Please retry shortly.' });
  }

  activeImageUploads += 1;
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    activeImageUploads -= 1;
  };

  res.once('finish', release);
  res.once('close', release);
  return next();
};

module.exports = { limitConcurrentUploads, MAX_ACTIVE_IMAGE_UPLOADS };