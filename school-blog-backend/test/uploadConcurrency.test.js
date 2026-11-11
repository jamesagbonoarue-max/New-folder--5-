const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { limitConcurrentUploads, MAX_ACTIVE_IMAGE_UPLOADS } = require('../middleware/uploadConcurrency');

const createResponse = () => {
  const response = new EventEmitter();
  response.headers = {};
  response.status = function status(code) {
    this.statusCode = code;
    return this;
  };
  response.set = function set(name, value) {
    this.headers[name] = value;
    return this;
  };
  response.json = function json(body) {
    this.body = body;
    return this;
  };
  return response;
};

test('caps in-flight image uploads and releases capacity when responses close', () => {
  const activeResponses = [];

  for (let index = 0; index < MAX_ACTIVE_IMAGE_UPLOADS; index += 1) {
    const response = createResponse();
    let continued = false;
    limitConcurrentUploads({}, response, () => { continued = true; });
    assert.equal(continued, true);
    activeResponses.push(response);
  }

  const overloadedResponse = createResponse();
  let overloadedContinued = false;
  limitConcurrentUploads({}, overloadedResponse, () => { overloadedContinued = true; });
  assert.equal(overloadedContinued, false);
  assert.equal(overloadedResponse.statusCode, 503);
  assert.equal(overloadedResponse.headers['Retry-After'], '5');

  activeResponses[0].emit('finish');
  const retriedResponse = createResponse();
  let retried = false;
  limitConcurrentUploads({}, retriedResponse, () => { retried = true; });
  assert.equal(retried, true);

  for (const response of activeResponses.slice(1)) response.emit('close');
  retriedResponse.emit('finish');
});