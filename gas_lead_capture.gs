/*
  Loudio.vn Lead Capture + Blog CMS - Google Apps Script

  Deploy this file as a Google Apps Script Web App:
  1. Create/open the Loudio leads Google Sheet.
  2. Extensions > Apps Script, then paste this file.
  3. Project Settings > Script Properties:
     - ADMIN_TOKEN: strong private passkey for admin.html
     - BLOG_IMAGE_FOLDER_ID: optional Drive folder id for uploaded blog images
  4. Deploy > New deployment > Web app.
  5. Execute as: Me. Access: Anyone.
  6. Copy the Web App URL into LOUDIO_GAS_WEB_APP_URL in the static site.
*/

const ADMIN_EMAIL = 'phan.ngnn@gmail.com';
const ADMIN_TOKEN = PropertiesService.getScriptProperties().getProperty('ADMIN_TOKEN') || '';
const BLOG_IMAGE_FOLDER_ID_PROP = 'BLOG_IMAGE_FOLDER_ID';
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const BACKEND_VERSION = '2026-05-07-email-trial-v2';

function doGet(e) {
  if (!e || !e.parameter) {
    return textResponse('Loudio Backend Active');
  }

  const action = e.parameter.action;

  if (action === 'health') {
    return jsonResponse({
      result: 'success',
      version: BACKEND_VERSION,
      admin_email: ADMIN_EMAIL,
      admin_token_configured: Boolean(ADMIN_TOKEN)
    });
  }

  if (action === 'get_articles') {
    if (e.parameter.include_drafts === 'true') {
      if (!ADMIN_TOKEN || e.parameter.token !== ADMIN_TOKEN) {
        return jsonResponse({ result: 'error', error: 'Unauthorized.' });
      }
      return getArticles(true);
    }
    return getArticles(false);
  }

  return textResponse('Loudio Backend Active');
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  let locked = false;

  try {
    locked = lock.tryLock(10000);
    if (!locked) throw new Error('Backend busy. Please try again.');

    const data = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const action = data.action || 'capture_lead';

    if (action === 'capture_lead') {
      return handleLead(data);
    }

    if (action === 'save_article') {
      requireAdmin(data.token);
      return saveArticle(data.article);
    }

    if (action === 'delete_article') {
      requireAdmin(data.token);
      return deleteArticle(data.id);
    }

    if (action === 'upload_image') {
      requireAdmin(data.token);
      return uploadImage(data);
    }

    throw new Error('Invalid action');
  } catch (error) {
    return jsonResponse({ result: 'error', error: String(error && error.message ? error.message : error) });
  } finally {
    if (locked) lock.releaseLock();
  }
}

function handleLead(data) {
  if (cleanText(data.website)) {
    return jsonResponse({ result: 'success' });
  }

  const replyEmail = sanitizeEmail(data.email || extractEmail(data.contact_info));
  if (replyEmail && isRateLimitedLead(replyEmail)) {
    throw new Error('Too many requests. Please try again later.');
  }

  const sheet = getOrCreateSheet('Leads');
  const headers = ensureHeaders(sheet, [
    'Timestamp',
    'Name',
    'Venue Name',
    'Contact Info',
    'Email',
    'Lead Type',
    'Plan',
    'Client IP',
    'Source',
    'Notes'
  ]);

  const leadType = String(data.lead_type || 'contact');
  const rowData = {
    'Timestamp': new Date(),
    'Name': cleanText(data.name),
    'Venue Name': cleanText(data.venue_name) || 'N/A',
    'Contact Info': cleanText(data.contact_info || replyEmail) || 'N/A',
    'Email': replyEmail,
    'Lead Type': leadType,
    'Plan': cleanText(data.plan),
    'Client IP': cleanText(data.ip) || 'N/A',
    'Source': cleanText(data.source) || 'Loudio Landing Page',
    'Notes': cleanText(data.notes)
  };

  sheet.appendRow(headers.map(function (header) {
    return rowData[header] || '';
  }));

  sendAdminNotification(rowData);

  if (replyEmail) {
    sendCustomerEmail(rowData, replyEmail);
  }

  return jsonResponse({ result: 'success' });
}

function sendCustomerEmail(data, emailAddress) {
  const recipient = sanitizeEmail(emailAddress);
  if (!recipient) return;

  const isTrial = data['Lead Type'] === 'trial_request';
  const venueName = data['Venue Name'] && data['Venue Name'] !== 'N/A' ? data['Venue Name'] : 'your venue';
  const subject = isTrial
    ? 'Your Loudio trial account request'
    : 'Thanks for contacting Loudio';
  const leadLine = isTrial
    ? 'Your trial account details will be sent to this email after our team prepares your setup.'
    : 'We received your request and a Loudio specialist will contact you soon.';

  const htmlBody =
    '<div style="font-family:Arial,sans-serif;max-width:620px;color:#172033;line-height:1.6">' +
    '<h2 style="color:#1f6feb;margin-bottom:12px">Thanks for reaching out to Loudio</h2>' +
    '<p>Hello,</p>' +
    '<p>' + leadLine + '</p>' +
    '<div style="background:#f4f8ff;border:1px solid #dbe8ff;border-radius:12px;padding:16px;margin:20px 0">' +
    '<p style="margin:0 0 8px"><strong>Venue:</strong> ' + escapeHtml(venueName) + '</p>' +
    '<p style="margin:0 0 8px"><strong>Email:</strong> ' + escapeHtml(recipient) + '</p>' +
    '<p style="margin:0"><strong>Request:</strong> ' + escapeHtml(isTrial ? 'Free trial account' : 'Contact request') + '</p>' +
    '</div>' +
    '<p>Warmly,<br><strong>The Loudio Team</strong></p>' +
    '<p style="font-size:12px;color:#667085">This email was sent automatically after a request on loudio.vn.</p>' +
    '</div>';

  const plainBody = 'Thanks for reaching out to Loudio.\n\n' +
    leadLine + '\n\n' +
    'Venue: ' + venueName + '\n' +
    'Email: ' + recipient + '\n\n' +
    'The Loudio Team';

  MailApp.sendEmail(recipient, subject, plainBody, {
    name: 'Loudio',
    replyTo: ADMIN_EMAIL,
    htmlBody: htmlBody
  });
}

function sendAdminNotification(data) {
  const isTrial = data['Lead Type'] === 'trial_request';
  const label = isTrial ? 'New trial request' : 'New lead captured';
  const subject = '[Loudio] ' + label + ': ' + (data['Venue Name'] !== 'N/A' ? data['Venue Name'] : data['Contact Info']);
  const body = [
    label + ' from the Loudio website.',
    '',
    'Name: ' + (data['Name'] || 'N/A'),
    'Venue: ' + data['Venue Name'],
    'Email: ' + (data['Email'] || 'N/A'),
    'Contact: ' + data['Contact Info'],
    'Lead type: ' + data['Lead Type'],
    'Plan: ' + (data['Plan'] || 'N/A'),
    'Source: ' + data['Source'],
    'IP Address: ' + data['Client IP'],
    'Time: ' + data['Timestamp'],
    '',
    'Notes:',
    data['Notes'] || 'N/A'
  ].join('\n');

  MailApp.sendEmail(ADMIN_EMAIL, subject, body);
}

function uploadImage(data) {
  const image = data.image || {};
  const mimeType = String(image.mimeType || '').toLowerCase();
  if (ALLOWED_IMAGE_TYPES.indexOf(mimeType) === -1) {
    throw new Error('Unsupported image type. Use JPG, PNG, or WebP.');
  }

  let base64 = String(image.data || '');
  base64 = base64.replace(/^data:image\/[a-z0-9.+-]+;base64,/i, '');
  if (!base64) throw new Error('Missing image data.');
  if (base64.length > Math.ceil(MAX_IMAGE_BYTES * 1.4)) {
    throw new Error('Image is too large. Maximum upload size is 2MB.');
  }

  const bytes = Utilities.base64Decode(base64);
  if (bytes.length > MAX_IMAGE_BYTES) {
    throw new Error('Image is too large. Maximum upload size is 2MB.');
  }
  if (!hasValidImageSignature(bytes, mimeType)) {
    throw new Error('Uploaded file does not match the selected image type.');
  }

  const extension = mimeType === 'image/png' ? 'png' : (mimeType === 'image/webp' ? 'webp' : 'jpg');
  const safeName = sanitizeFilename(image.name || ('loudio-blog-image.' + extension));
  const folder = getBlogImageFolder();
  const blob = Utilities.newBlob(bytes, mimeType, safeName);
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  return jsonResponse({
    result: 'success',
    id: file.getId(),
    url: 'https://drive.google.com/uc?export=view&id=' + file.getId()
  });
}

function saveArticle(article) {
  if (!article) throw new Error('Missing article payload.');
  if (!cleanText(article.title)) throw new Error('Article title is required.');

  const sheet = getOrCreateSheet('Articles');
  const headers = ensureHeaders(sheet, [
    'id',
    'title',
    'excerpt',
    'content',
    'author',
    'date',
    'image',
    'image_alt',
    'category',
    'published'
  ]);

  const data = sheet.getDataRange().getValues();
  const idIndex = headers.indexOf('id');
  let rowIndex = -1;

  if (article.id) {
    for (let i = 1; i < data.length; i++) {
      if (data[i][idIndex] == article.id) {
        rowIndex = i + 1;
        break;
      }
    }
  }

  const articleId = article.id || Utilities.getUuid();
  const rowData = {
    id: articleId,
    title: cleanText(article.title),
    excerpt: cleanText(article.excerpt),
    content: String(article.content || ''),
    author: cleanText(article.author) || 'Loudio Team',
    date: article.date || new Date().toISOString(),
    image: cleanUrl(article.image),
    image_alt: cleanText(article.image_alt || article.title),
    category: cleanText(article.category) || 'Insights',
    published: article.published ? 'TRUE' : 'FALSE'
  };

  const row = headers.map(function (header) {
    return rowData[header] || '';
  });

  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, row.length).setValues([row]);
  } else {
    sheet.appendRow(row);
  }

  return jsonResponse({ result: 'success', id: articleId });
}

function getArticles(includeDrafts) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Articles');
  if (!sheet) return jsonResponse([]);

  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return jsonResponse([]);

  const headers = data[0];
  const articles = [];

  for (let i = 1; i < data.length; i++) {
    const article = {};
    for (let j = 0; j < headers.length; j++) {
      let value = data[i][j];
      if (headers[j] === 'published') value = (value === 'TRUE' || value === true);
      article[headers[j]] = value;
    }
    if (includeDrafts || article.published) articles.push(article);
  }

  articles.sort(function (a, b) {
    return new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime();
  });

  return jsonResponse(articles);
}

function deleteArticle(id) {
  if (!id) throw new Error('Missing article id.');
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Articles');
  if (!sheet) throw new Error('Sheet not found.');

  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] == id) {
      sheet.deleteRow(i + 1);
      return jsonResponse({ result: 'success' });
    }
  }

  throw new Error('Article not found.');
}

function requireAdmin(token) {
  if (!ADMIN_TOKEN) throw new Error('ADMIN_TOKEN is not configured in Script Properties.');
  if (token !== ADMIN_TOKEN) throw new Error('Unauthorized.');
}

function isRateLimitedLead(email) {
  const cache = CacheService.getScriptCache();
  const key = 'lead:' + Utilities.base64EncodeWebSafe(String(email || '').toLowerCase()).slice(0, 80);
  const count = Number(cache.get(key) || '0');
  if (count >= 5) return true;
  cache.put(key, String(count + 1), 60 * 60);
  return false;
}

function hasValidImageSignature(bytes, mimeType) {
  if (!bytes || bytes.length < 12) return false;

  if (mimeType === 'image/jpeg') {
    return bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[bytes.length - 2] === 0xFF && bytes[bytes.length - 1] === 0xD9;
  }

  if (mimeType === 'image/png') {
    return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47 &&
      bytes[4] === 0x0D && bytes[5] === 0x0A && bytes[6] === 0x1A && bytes[7] === 0x0A;
  }

  if (mimeType === 'image/webp') {
    return bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
  }

  return false;
}

function getOrCreateSheet(name) {
  const doc = SpreadsheetApp.getActiveSpreadsheet();
  return doc.getSheetByName(name) || doc.insertSheet(name);
}

function ensureHeaders(sheet, requiredHeaders) {
  let headers = [];
  if (sheet.getLastRow() > 0 && sheet.getLastColumn() > 0) {
    headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  }

  if (!headers.length || headers[0] === '') {
    sheet.getRange(1, 1, 1, requiredHeaders.length).setValues([requiredHeaders]);
    return requiredHeaders.slice();
  }

  let changed = false;
  requiredHeaders.forEach(function (header) {
    if (headers.indexOf(header) === -1) {
      headers.push(header);
      changed = true;
    }
  });

  if (changed) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }

  return headers;
}

function getBlogImageFolder() {
  const props = PropertiesService.getScriptProperties();
  const configuredId = props.getProperty(BLOG_IMAGE_FOLDER_ID_PROP);
  if (configuredId) return DriveApp.getFolderById(configuredId);

  const folder = DriveApp.createFolder('Loudio Blog Images');
  props.setProperty(BLOG_IMAGE_FOLDER_ID_PROP, folder.getId());
  return folder;
}

function extractEmail(value) {
  const match = String(value || '').match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  return match ? match[0] : '';
}

function sanitizeEmail(value) {
  const email = extractEmail(value);
  return email ? email.toLowerCase() : '';
}

function cleanText(value) {
  return String(value || '').replace(/[\u0000-\u001F\u007F]/g, ' ').trim().slice(0, 2000);
}

function cleanUrl(value) {
  const url = cleanText(value);
  if (!url) return '';
  if (/^data:image\/(?:png|jpe?g|webp);base64,[a-z0-9+/=]+$/i.test(url)) return url;
  if (/^https?:\/\/[^\s"'<>]+$/i.test(url)) return url;
  return '';
}

function sanitizeFilename(value) {
  const name = cleanText(value).replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-');
  return name.slice(0, 90) || 'loudio-blog-image.jpg';
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function textResponse(payload) {
  return ContentService
    .createTextOutput(payload)
    .setMimeType(ContentService.MimeType.TEXT);
}
