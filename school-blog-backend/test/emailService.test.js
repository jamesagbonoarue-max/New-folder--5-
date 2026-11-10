const test = require('node:test');
const assert = require('node:assert/strict');
const {
  sendPasswordResetEmail,
  sendAdminWelcomeEmail,
  isEmailConfigured,
} = require('../services/emailService');

test('Brevo email configuration requires an API key and verified sender', () => {
  const previousApiKey = process.env.BREVO_API_KEY;
  const previousSender = process.env.EMAIL_FROM_EMAIL;
  const previousLegacySender = process.env.EMAIL_FROM;
  delete process.env.BREVO_API_KEY;
  delete process.env.EMAIL_FROM_EMAIL;
  delete process.env.EMAIL_FROM;

  assert.equal(isEmailConfigured(), false);
  process.env.BREVO_API_KEY = 'test-api-key';
  assert.equal(isEmailConfigured(), false);
  process.env.EMAIL_FROM = 'school office';
  assert.equal(isEmailConfigured(), false);
  process.env.EMAIL_FROM_EMAIL = 'not-an-email';
  assert.equal(isEmailConfigured(), false);
  process.env.EMAIL_FROM_EMAIL = 'admin@example.com';
  assert.equal(isEmailConfigured(), true);

  if (previousApiKey === undefined) delete process.env.BREVO_API_KEY;
  else process.env.BREVO_API_KEY = previousApiKey;
  if (previousSender === undefined) delete process.env.EMAIL_FROM_EMAIL;
  else process.env.EMAIL_FROM_EMAIL = previousSender;
  if (previousLegacySender === undefined) delete process.env.EMAIL_FROM;
  else process.env.EMAIL_FROM = previousLegacySender;
});

test('password reset email is sent through the Brevo API', async () => {
  const previousApiKey = process.env.BREVO_API_KEY;
  const previousSender = process.env.EMAIL_FROM_EMAIL;
  const previousSenderName = process.env.EMAIL_FROM_NAME;
  const previousFetch = global.fetch;
  process.env.BREVO_API_KEY = 'test-api-key';
  process.env.EMAIL_FROM_EMAIL = 'admin@example.com';
  process.env.EMAIL_FROM_NAME = 'DE GENIUS TALENTS INTERNATIONAL SCHOOL';

  let request;
  global.fetch = async (url, options) => {
    request = { url, options };
    return { ok: true, status: 201 };
  };

  try {
    await sendPasswordResetEmail('recipient@example.com', '012345');

    assert.equal(request.url, 'https://api.brevo.com/v3/smtp/email');
    assert.equal(request.options.method, 'POST');
    assert.equal(request.options.headers['api-key'], 'test-api-key');
    const body = JSON.parse(request.options.body);
    assert.equal(body.sender.email, 'admin@example.com');
    assert.deepEqual(body.to, [{ email: 'recipient@example.com' }]);
    assert.equal(body.subject, 'De Genius Talents International School - Password Reset Code');
    assert.match(body.textContent, /012345/);
    assert.match(body.htmlContent, /012345/);
  } finally {
    global.fetch = previousFetch;
    if (previousApiKey === undefined) delete process.env.BREVO_API_KEY;
    else process.env.BREVO_API_KEY = previousApiKey;
    if (previousSender === undefined) delete process.env.EMAIL_FROM_EMAIL;
    else process.env.EMAIL_FROM_EMAIL = previousSender;
    if (previousSenderName === undefined) delete process.env.EMAIL_FROM_NAME;
    else process.env.EMAIL_FROM_NAME = previousSenderName;
  }
});

test('administrator welcome email provides secure onboarding without emailing a password', async () => {
  const previousApiKey = process.env.BREVO_API_KEY;
  const previousSender = process.env.EMAIL_FROM_EMAIL;
  const previousSenderName = process.env.EMAIL_FROM_NAME;
  const previousClientUrl = process.env.CLIENT_URL;
  const previousFetch = global.fetch;
  process.env.BREVO_API_KEY = 'test-api-key';
  process.env.EMAIL_FROM_EMAIL = 'admin@example.com';
  process.env.EMAIL_FROM_NAME = 'DE GUNIUS TALENT';
  process.env.CLIENT_URL = 'https://school.example';

  let request;
  global.fetch = async (url, options) => {
    request = { url, options };
    return { ok: true, status: 201 };
  };

  try {
    await sendAdminWelcomeEmail({
      name: 'Jordan <Admin>',
      email: 'jordan@example.com',
      username: 'jordan',
      password: 'temporary-password-for-test',
    });

    const body = JSON.parse(request.options.body);
    assert.equal(request.url, 'https://api.brevo.com/v3/smtp/email');
    assert.equal(body.sender.name, 'DE GUNIUS TALENT');
    assert.deepEqual(body.to, [{ email: 'jordan@example.com' }]);
    assert.equal(body.subject, 'De Genius Talents International School - Administrator Account');
    assert.match(body.textContent, /Jordan <Admin>/);
    assert.match(body.textContent, /jordan@example\.com \/ jordan/);
    assert.match(body.textContent, /no password is included/i);
    assert.doesNotMatch(body.textContent, /Temporary Password:/);
    assert.doesNotMatch(body.textContent, /temporary-password-for-test/);
    assert.doesNotMatch(body.htmlContent, /temporary-password-for-test/);
    assert.match(body.textContent, /https:\/\/school\.example\/admin/);
    assert.match(body.htmlContent, /Jordan &lt;Admin&gt;/);
    assert.match(body.htmlContent, /DE GENIUS TALENTS Administration Team/);
    assert.match(body.htmlContent, /Forgot password\?/);
  } finally {
    global.fetch = previousFetch;
    if (previousApiKey === undefined) delete process.env.BREVO_API_KEY;
    else process.env.BREVO_API_KEY = previousApiKey;
    if (previousSender === undefined) delete process.env.EMAIL_FROM_EMAIL;
    else process.env.EMAIL_FROM_EMAIL = previousSender;
    if (previousSenderName === undefined) delete process.env.EMAIL_FROM_NAME;
    else process.env.EMAIL_FROM_NAME = previousSenderName;
    if (previousClientUrl === undefined) delete process.env.CLIENT_URL;
    else process.env.CLIENT_URL = previousClientUrl;
  }
});

test('Brevo API errors are surfaced without returning message content', async () => {
  const previousApiKey = process.env.BREVO_API_KEY;
  const previousSender = process.env.EMAIL_FROM_EMAIL;
  const previousFetch = global.fetch;
  process.env.BREVO_API_KEY = 'test-api-key';
  process.env.EMAIL_FROM_EMAIL = 'admin@example.com';
  global.fetch = async () => ({
    ok: false,
    status: 401,
    json: async () => ({ message: 'Sender sender@example.com is not authorized.' }),
  });

  try {
    await assert.rejects(
      sendPasswordResetEmail('recipient@example.com', '012345'),
      (error) => error.message.includes('HTTP 401') &&
        error.message.includes('[email]') &&
        !error.message.includes('sender@example.com')
    );
  } finally {
    global.fetch = previousFetch;
    if (previousApiKey === undefined) delete process.env.BREVO_API_KEY;
    else process.env.BREVO_API_KEY = previousApiKey;
    if (previousSender === undefined) delete process.env.EMAIL_FROM_EMAIL;
    else process.env.EMAIL_FROM_EMAIL = previousSender;
  }
});
