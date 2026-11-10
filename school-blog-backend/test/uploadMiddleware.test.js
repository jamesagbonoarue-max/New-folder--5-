const test = require('node:test');
const assert = require('node:assert/strict');
const { isSupportedImage } = require('../middleware/uploadMiddleware');
const { getAllNews } = require('../controllers/newsController');

test('accepts supported image signatures', () => {
  const images = [
    Buffer.from([0xff, 0xd8, 0xff, 0x00]),
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    Buffer.from('GIF89a'),
    Buffer.from('RIFF0000WEBP'),
  ];

  for (const image of images) assert.equal(isSupportedImage(image), true);
});

test('rejects unsupported and truncated image signatures', () => {
  assert.equal(isSupportedImage(Buffer.from('not an image')), false);
  assert.equal(isSupportedImage(Buffer.from([0xff, 0xd8])), false);
});

test('news pagination returns a bounded page response', async () => {
  const response = {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };

  await getAllNews({ query: { page: '1', limit: '6' } }, response);

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body.items, []);
  assert.equal(response.body.page, 1);
  assert.equal(response.body.pages, 0);
});

test('news pagination rejects invalid limits', async () => {
  const response = {
    statusCode: 200,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };

  await getAllNews({ query: { page: '1', limit: '500' } }, response);

  assert.equal(response.statusCode, 400);
});
