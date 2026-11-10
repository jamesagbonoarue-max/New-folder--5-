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
  delete process.env.BREVO_API_KEY;
  delete process.env.EMAIL_FROM_EMAIL;

  assert.equal(isEmailConfigured(), false);
  process.env.BREVO_API_KEY = 'test-api-key';
  assert.equal(isEmailConfigured(), false);
  process.env.EMAIL_FROM_EMAIL = 'admin@example.com';
  assert.equal(isEmailConfigured(), true);

  if (previousApiKey === undefined) delete process.env.BREVO_API_KEY;
  else process.env.BREVO_API_KEY = previousApiKey;
  if (previousSender === undefined) delete process.env.EMAIL_FROM_EMAIL;
  else process.env.EMAIL_FROM_EMAIL = previousSender;
});

test('password reset email is sent through the Brevo API', async () => {
  const previousApiKey = process.env.BREVO_API_KEY;
  const previousSender = process.env.EMAIL_FROM_EMAIL;
  const previousSenderName = process.env.EMAIL_FROM;
  const previousFetch = global.fetch;
  process.env.BREVO_API_KEY = 'test-api-key';
  process.env.EMAIL_FROM_EMAIL = 'admin@example.com';
  process.env.EMAIL_FROM = 'THE JUNIOR TALENT';

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
    assert.equal(body.subject, 'THE JUNIOR TALENT - Password Reset Verification Code');
    assert.match(body.textContent, /012345/);
    assert.match(body.htmlContent, /012345/);
  } finally {
    global.fetch = previousFetch;
    if (previousApiKey === undefined) delete process.env.BREVO_API_KEY;
    else process.env.BREVO_API_KEY = previousApiKey;
    if (previousSender === undefined) delete process.env.EMAIL_FROM_EMAIL;
    else process.env.EMAIL_FROM_EMAIL = previousSender;
    if (previousSenderName === undefined) delete process.env.EMAIL_FROM;
    else process.env.EMAIL_FROM = previousSenderName;
  }
});

test('administrator welcome email contains account details and uses DE GUNIUS TALENT branding', async () => {
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
      password: 'secure-Temp-Password_42',
    });

    const body = JSON.parse(request.options.body);
    assert.equal(request.url, 'https://api.brevo.com/v3/smtp/email');
    assert.equal(body.sender.name, 'DE GUNIUS TALENT');
    assert.deepEqual(body.to, [{ email: 'jordan@example.com' }]);
    assert.equal(body.subject, 'Your THE JUNIOR TALENT Administrator Account Details');
    assert.match(body.textContent, /Jordan <Admin>/);
    assert.match(body.textContent, /jordan@example\.com \/ jordan/);
    assert.match(body.textContent, /secure-Temp-Password_42/);
    assert.match(body.textContent, /https:\/\/school\.example\/admin/);
    assert.match(body.htmlContent, /Jordan &lt;Admin&gt;/);
    assert.match(body.htmlContent, /DE GUNIUS TALENT Administration Team/);
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
