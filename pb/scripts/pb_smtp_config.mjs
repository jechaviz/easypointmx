/**
 * Configure PocketBase SMTP for password reset and email notifications.
 * Uses Mailtrap for dev/testing. Replace with your production SMTP for live.
 *
 * For yopmail.com to RECEIVE password reset emails, configure a real
 * outbound SMTP provider below (Mailgun, Brevo/Sendinblue, Postmark, etc.)
 *
 * Usage: node pb_smtp_config.mjs
 */

import { WEB_URL, adminHeaders, pbApi } from './_shared.mjs';

// ── SMTP CONFIGURATION ──────────────────────────────────────────────────────
// Option A: Mailtrap (dev testing) — sign up free at mailtrap.io
// Option B: Brevo (free 300/day) — brevo.com
// Option C: Mailgun, Postmark, etc.
// Replace the values below with your real SMTP credentials.
const SMTP_CONFIG = {
  enabled: true,
  host: "smtp.brevo.com",        // ← replace with your SMTP host
  port: 587,
  username: "your@email.com",    // ← replace with your SMTP username
  password: "your-smtp-key",     // ← replace with your SMTP password/API key
  tls: false,
  authMethod: "PLAIN",
  localName: ""
};

const FROM_CONFIG = {
  name: "Easypoint",
  address: "noreply@easypoint.mx"
};

const APP_URL = process.env.PB_APP_URL || WEB_URL;
const PB_PANEL_URL = process.env.PB_PANEL_URL || pbApi('/_/');

async function configureSmtp() {
  console.log('Authenticating with PocketBase admin...');
  const H = await adminHeaders({ allowDemoFallback: false });

  console.log('Fetching current settings...');
  const settingsRes = await fetch(pbApi('/api/settings'), { headers: H });
  const settings = await settingsRes.json();

  const updatedSettings = {
    ...settings,
    smtp: SMTP_CONFIG,
    meta: {
      ...settings.meta,
      senderName:    FROM_CONFIG.name,
      senderAddress: FROM_CONFIG.address,
      appName: "Easypoint.mx",
      appUrl: APP_URL
    }
  };

  console.log('Applying SMTP settings...');
  const res = await fetch(pbApi('/api/settings'), {
    method: 'PATCH',
    headers: H,
    body: JSON.stringify(updatedSettings)
  });
  const result = await res.json();

  if (result.smtp?.enabled) {
    console.log('\n✅ SMTP configured successfully!');
    console.log(`   Host:   ${SMTP_CONFIG.host}:${SMTP_CONFIG.port}`);
    console.log(`   From:   ${FROM_CONFIG.name} <${FROM_CONFIG.address}>\n`);
    console.log('You can test by sending a password reset from the login page.');
  } else {
    console.log('\n⚠️  Settings applied – verify SMTP credentials are correct.');
    console.log(`    Check the PocketBase admin panel: ${PB_PANEL_URL}`);
  }

  // Test: send password reset to admin (requires real SMTP)
  // await fetch(pbApi('/api/collections/users/request-password-reset'), {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ email: 'admin@yopmail.com' })
  // });
}

configureSmtp().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
