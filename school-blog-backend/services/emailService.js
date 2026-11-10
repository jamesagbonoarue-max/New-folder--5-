const isEmailConfigured = () => {
  const senderEmail = String(process.env.EMAIL_FROM_EMAIL || '').trim();
  return Boolean(
    process.env.BREVO_API_KEY &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(senderEmail)
  );
};

const escapeHtml = (value) => String(value)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const sendBrevoEmail = async ({ email, subject, textContent, htmlContent }) => {
  if (!isEmailConfigured()) {
    throw new Error('Brevo email delivery is not configured correctly.');
  }

  let response;
  try {
    response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': process.env.BREVO_API_KEY,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        sender: {
          name: process.env.EMAIL_FROM_NAME || 'DE GENIUS TALENTS INTERNATIONAL SCHOOL',
          email: process.env.EMAIL_FROM_EMAIL.trim(),
        },
        to: [{ email }],
        subject,
        textContent,
        htmlContent,
      }),
      signal: AbortSignal.timeout(10000),
    });
  } catch (error) {
    throw new Error(`Could not connect to Brevo email delivery: ${error.message}`);
  }

  if (!response.ok) {
    let providerReason = '';
    try {
      const errorBody = await response.json();
      const message = typeof errorBody.message === 'string' ? errorBody.message : '';
      providerReason = message
        .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]')
        .replace(/[\r\n\t]+/g, ' ')
        .slice(0, 240);
    } catch {
      providerReason = '';
    }

    throw new Error(
      `Brevo email delivery failed with HTTP ${response.status}${providerReason ? `: ${providerReason}` : ''}.`
    );
  }
};

const sendPasswordResetEmail = async (email, code) => {
  const textContent = [
    'De Genius Talents International School password recovery',
    'A password reset was requested for your administrator account.',
    `Your verification code is: ${code}`,
    'This code expires in 10 minutes.',
    'If you did not request a password reset, ignore this message. Your password will remain unchanged.',
  ].join('\n\n');
  const htmlContent = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Password reset code</title>
  </head>
  <body style="margin:0;padding:24px;background:#f3f5f0;font-family:Arial,Helvetica,sans-serif;color:#18372f;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto;background:#fffefa;border:1px solid #e1e8df;border-radius:16px;overflow:hidden;">
      <tr><td style="padding:28px 32px;background:#18372f;color:#fffefa;font-size:20px;font-weight:700;">DE GENIUS TALENTS</td></tr>
      <tr><td style="padding:32px;">
        <p style="margin:0 0 12px;font-size:16px;">Hello,</p>
        <h1 style="margin:0 0 16px;font-size:25px;line-height:1.3;color:#18372f;">Password recovery</h1>
        <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#52645a;">A password reset was requested for your administrator account. Enter this verification code to continue:</p>
        <p style="margin:0 0 24px;padding:18px;text-align:center;background:#f1f5ed;border-radius:12px;color:#18372f;font-size:34px;font-weight:700;letter-spacing:10px;">${code}</p>
        <p style="margin:0 0 20px;font-size:14px;line-height:1.7;color:#52645a;">This code expires in <strong>10 minutes</strong>.</p>
        <p style="margin:0;padding-top:20px;border-top:1px solid #e6ebe3;font-size:13px;line-height:1.7;color:#68776e;"><strong>Security notice:</strong> If you did not request a password reset, ignore this message. Your password will remain unchanged.</p>
      </td></tr>
    </table>
  </body>
</html>`;

  await sendBrevoEmail({
    email,
    subject: 'De Genius Talents International School - Password Reset Code',
    textContent,
    htmlContent,
  });
};

const sendAdminWelcomeEmail = async ({ name, email, username }) => {
  const loginUrl = `${(process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/+$/, '')}/admin`;
  const fullName = String(name);
  const identifier = `${email} / ${username}`;
  const subject = 'De Genius Talents International School - Administrator Account';
  const textContent = [
    `Hello ${fullName},`,
    '',
    'Your administrator account has been successfully created.',
    '',
    'Your login details:',
    `Name: ${fullName}`,
    `Email/Username: ${identifier}`,
    `Admin Login: ${loginUrl}`,
    '',
    'For security, no password is included in this email. Use Forgot password on the sign-in page to set your password.',
    '',
    'DE GENIUS TALENTS Administration Team.',
  ].join('\n');
  const htmlContent = `<!doctype html>
<html lang="en">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Administrator account details</title></head>
  <body style="margin:0;padding:24px;background:#f3f5f0;font-family:Arial,Helvetica,sans-serif;color:#18372f;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;margin:0 auto;background:#fffefa;border:1px solid #e1e8df;border-radius:16px;overflow:hidden;">
      <tr><td style="padding:28px 32px;background:#18372f;color:#fffefa;font-size:20px;font-weight:700;">DE GENIUS TALENTS</td></tr>
      <tr><td style="padding:32px;">
        <p style="margin:0 0 16px;">Hello ${escapeHtml(fullName)},</p>
        <h1 style="margin:0 0 16px;font-size:25px;line-height:1.3;">Your administrator account is ready</h1>
        <p style="margin:0 0 20px;line-height:1.7;color:#52645a;">Your administrator account has been successfully created. Use the details below to sign in:</p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f1f5ed;border-radius:12px;">
          <tr><td style="padding:18px 20px;line-height:1.8;">
            <strong>Name:</strong> ${escapeHtml(fullName)}<br>
            <strong>Email/Username:</strong> ${escapeHtml(identifier)}
          </td></tr>
        </table>
        <p style="margin:24px 0;text-align:center;"><a href="${escapeHtml(loginUrl)}" style="display:inline-block;padding:13px 22px;background:#426d56;color:#fffefa;text-decoration:none;border-radius:10px;font-weight:700;">Sign in to the admin portal</a></p>
        <p style="margin:0 0 20px;line-height:1.7;color:#52645a;">For security, no password is included in this email. Use <strong>Forgot password?</strong> on the sign-in page to set your password.</p>
        <p style="margin:0;padding-top:20px;border-top:1px solid #e6ebe3;font-size:13px;line-height:1.7;color:#68776e;">DE GENIUS TALENTS Administration Team</p>
      </td></tr>
    </table>
  </body>
</html>`;

  await sendBrevoEmail({ email, subject, textContent, htmlContent });
};

module.exports = {
  sendPasswordResetEmail,
  sendAdminWelcomeEmail,
  isEmailConfigured,
};
