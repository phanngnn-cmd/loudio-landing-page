/*
  Loudio.vn Lead Capture - Google Apps Script
  
  Instructions:
  1. Create a new Google Sheet.
  2. Go to Extensions > Apps Script.
  3. Paste the code below.
  4. Change 'RECIPIENT_EMAIL' to 'phananh.nguyen@loudio.vn'.
  5. Click 'Deploy' > 'New Deployment'.
  6. Select 'Web App'.
  7. Set 'Execute as' to 'Me' and 'Who has access' to 'Anyone'.
  8. Copy the Web App URL and paste it into main.js as 'SCRIPT_URL'.
*/

const ADMIN_TOKEN = 'loudio-internal-2026'; // Simple security token

function doGet(e) {
    if (!e || !e.parameter) {
        return ContentService.createTextOutput("No parameters provided or invalid request").setMimeType(ContentService.MimeType.TEXT);
    }

    const action = e.parameter.action;

    if (action === 'get_articles') {
        return getArticles();
    }

    return ContentService.createTextOutput("Loudio Backend Active").setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
    var lock = LockService.getScriptLock();
    lock.tryLock(10000);

    try {
        var data = JSON.parse(e.postData.contents);
        var action = data.action || 'capture_lead';

        if (action === 'capture_lead') {
            return handleLead(data);
        } else if (action === 'save_article') {
            if (data.token !== ADMIN_TOKEN) {
                throw new Error('Unauthorized');
            }
            return saveArticle(data.article);
        } else if (action === 'delete_article') {
            if (data.token !== ADMIN_TOKEN) {
                throw new Error('Unauthorized');
            }
            return deleteArticle(data.id);
        }

        throw new Error('Invalid action');

    } catch (error) {
        return ContentService
            .createTextOutput(JSON.stringify({ 'result': 'error', 'error': error.toString() }))
            .setMimeType(ContentService.MimeType.JSON);
    } finally {
        lock.releaseLock();
    }
}

function handleLead(data) {
    var doc = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = doc.getSheetByName('Leads') || doc.getSheets()[0];

    var headers = sheet.getRange(1, 1, 1, Math.max(1, sheet.getLastColumn())).getValues()[0];
    if (sheet.getLastRow() == 0 || headers[0] === '') {
        headers = ['Timestamp', 'Venue Name', 'Contact Info', 'Client IP', 'Source', 'Notes'];
        sheet.appendRow(headers);
    }

    var rowData = {
        'Timestamp': new Date(),
        'Venue Name': data.venue_name || 'N/A',
        'Contact Info': data.contact_info || data.email || 'N/A',
        'Client IP': data.ip || 'N/A',
        'Source': data.source || 'Loudio Landing Page',
        'Notes': data.notes || '',
        'Email': data.email || '' // Helper for scripts
    };

    var newRow = headers.map(h => rowData[h] || '');
    sheet.appendRow(newRow);

    // 1. Send internal notification (to you)
    sendNotification(rowData);

    // 2. Send Auto-Reply to Customer (NEW)
    // Pass the explicit email if available, otherwise try to extract from Contact Info
    var replyEmail = data.email;
    
    // Robust fallback: Extract email from "Phone: ..., Email: ..." string if needed
    if (!replyEmail && rowData['Contact Info']) {
        var emailMatch = rowData['Contact Info'].toString().match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/);
        if (emailMatch) {
            replyEmail = emailMatch[0];
        }
    }
    
    console.log("Processing lead. Contact Info: " + rowData['Contact Info'] + ", Extracted Email: " + replyEmail);
    
    if (replyEmail) {
        sendAutoReplyToCustomer(rowData, replyEmail);
    } else {
        console.warn("No email address found to send auto-reply.");
    }

    return ContentService
        .createTextOutput(JSON.stringify({ 'result': 'success' }))
        .setMimeType(ContentService.MimeType.JSON);
}

// Lark Webhook URL - USER MUST UPDATE THIS
const LARK_WEBHOOK_URL = 'YOUR_LARK_WEBHOOK_URL_HERE';

// Sends lead data to Lark webhook for auto-reply email
function sendAutoReplyToCustomer(data, emailAddress) {
    var recipient = emailAddress;

    if (!recipient || !recipient.includes('@')) {
        console.warn("No valid email address for auto-reply.");
        return;
    }

    var venueName = data['Venue Name'] !== 'N/A' ? data['Venue Name'] : 'your venue';

    // If webhook URL is not configured, skip
    if (LARK_WEBHOOK_URL === 'YOUR_LARK_WEBHOOK_URL_HERE') {
        console.warn("Lark webhook URL not configured. Skipping auto-reply.");
        return;
    }

    try {
        var payload = {
            venue_name: venueName,
            email: recipient,
            timestamp: new Date().toISOString()
        };

        var options = {
            method: 'post',
            contentType: 'application/json',
            payload: JSON.stringify(payload),
            muteHttpExceptions: true
        };

        var response = UrlFetchApp.fetch(LARK_WEBHOOK_URL, options);
        console.log("Lark webhook response: " + response.getContentText());
    } catch (e) {
        console.error("Failed to send to Lark webhook: " + e.toString());
        // Notify admin of failure
        MailApp.sendEmail(
            'phananh.nguyen@loudio.vn',
            '⚠️ DEBUG: Lark Webhook Failed',
            'Could not send lead to Lark.\n\nEmail: ' + recipient + '\nVenue: ' + venueName + '\n\nError: ' + e.toString()
        );
    }
}

function saveArticle(article) {
  var doc = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = doc.getSheetByName('Articles');
  if (!sheet) {
    sheet = doc.insertSheet('Articles');
    sheet.appendRow(['id', 'title', 'excerpt', 'content', 'author', 'date', 'image', 'published']);
  }

  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var idIndex = headers.indexOf('id');
  
  var rowIndex = -1;
  if (article.id) {
    for (var i = 1; i < data.length; i++) {
      if (data[i][idIndex] == article.id) {
        rowIndex = i + 1;
        break;
      }
    }
  }

  var articleId = article.id || Utilities.getUuid();
  var rowData = [
    articleId,
    article.title,
    article.excerpt,
    article.content,
    article.author || 'Loudio Team',
    article.date || new Date().toISOString(),
    article.image || '',
    article.published ? 'TRUE' : 'FALSE'
  ];

  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }

  return ContentService
    .createTextOutput(JSON.stringify({ 'result': 'success', 'id': articleId }))
    .setMimeType(ContentService.MimeType.JSON);
}

function getArticles() {
  var doc = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = doc.getSheetByName('Articles');
  if (!sheet) return ContentService.createTextOutput(JSON.stringify([])).setMimeType(ContentService.MimeType.JSON);

  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var articles = [];

  for (var i = 1; i < data.length; i++) {
    var article = {};
    for (var j = 0; j < headers.length; j++) {
      var val = data[i][j];
      if (headers[j] === 'published') val = (val === 'TRUE' || val === true);
      article[headers[j]] = val;
    }
    if (article.published) articles.push(article);
  }

  return ContentService
    .createTextOutput(JSON.stringify(articles.reverse()))
    .setMimeType(ContentService.MimeType.JSON);
}

function deleteArticle(id) {
  var doc = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = doc.getSheetByName('Articles');
  if (!sheet) throw new Error('Sheet not found');

  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] == id) {
      sheet.deleteRow(i + 1);
      return ContentService.createTextOutput(JSON.stringify({ 'result': 'success' })).setMimeType(ContentService.MimeType.JSON);
    }
  }
  throw new Error('Article not found');
}

function sendNotification(data) {
  var recipient = 'phananh.nguyen@loudio.vn';
  var subject = '🚀 New Lead Captured: ' + (data['Venue Name'] !== 'N/A' ? data['Venue Name'] : data['Contact Info']);
  
  var body = 'You have a new lead from the Loudio landing page!\n\n' +
             '📍 Venue: ' + data['Venue Name'] + '\n' +
             '📧 Contact: ' + data['Contact Info'] + '\n' +
             '🌐 IP Address: ' + data['Client IP'] + '\n' +
             '⏰ Time: ' + data['Timestamp'] + '\n\n' +
             'Check the Google Sheet for more details.';

  MailApp.sendEmail(recipient, subject, body);
}
