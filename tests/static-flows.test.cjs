const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));

const index = read('index.html');
const main = read('main.js');
const gas = read('gas_lead_capture.gs');
const admin = read('admin.html');
const article = read('article.html');

assert.ok(exists('trial.html'), 'trial.html should exist for free-trial signup');

const trial = exists('trial.html') ? read('trial.html') : '';
assert.match(index, /href="trial\.html\?plan=pro[^"]*"/, 'Pro pricing CTA should route to trial page');
assert.match(index, /href="trial\.html\?source=hero[^"]*"/, 'Hero free-trial CTA should route to trial page');

assert.match(trial, /id="trial-form"/, 'trial page should expose an email form');
assert.match(trial, /id="trial-email-help"/, 'trial page should explain the email field before the submit button');
assert.match(trial, /lead_type:\s*['"]trial_request['"]/, 'trial form should submit a trial_request lead');
assert.match(trial, /trial account details will be sent/i, 'trial page should show the requested confirmation message');

assert.match(main, /lead_type:\s*['"]contact['"]/, 'main contact form should mark contact leads');
assert.match(main, /LOUDIO_GAS_WEB_APP_URL/, 'frontend should use one shared GAS URL constant');
assert.doesNotMatch(main, /localhost:5678/, 'frontend should not call localhost n8n in production');

assert.match(gas, /function sendCustomerEmail/, 'GAS should send customer emails directly');
assert.match(gas, /phananh\.nguyen@loudio\.vn/, 'GAS should notify Loudio admin email');
assert.match(gas, /action === 'upload_image'/, 'GAS should support authenticated blog image upload');
assert.match(gas, /BLOG_IMAGE_FOLDER_ID/, 'GAS image upload should support a Drive folder property');

assert.match(admin, /id="art-image-file"/, 'admin should include an image upload control');
assert.match(admin, /function uploadFeaturedImage/, 'admin should upload featured images');
assert.match(admin, /id="preview-pane"/, 'admin should include an article preview pane');

assert.match(article, /function sanitizeArticleHtml/, 'article page should sanitize article HTML');
assert.doesNotMatch(article, /\$\{art\.content\}/, 'article page should not inject raw article content');
assert.match(article, /src="\$\{escapeHtml\(safeImage\)\}"/, 'article hero image URL should be escaped before attribute injection');

assert.match(gas, /!ADMIN_TOKEN \|\| e\.parameter\.token !== ADMIN_TOKEN/, 'draft article reads should reject missing or invalid admin tokens');
assert.match(gas, /function isRateLimitedLead/, 'lead endpoint should include basic rate limiting');
assert.match(gas, /data\.website/, 'lead endpoint should include a honeypot field check');
assert.match(gas, /function hasValidImageSignature/, 'image upload should validate image magic bytes');

console.log('static flow checks passed');
