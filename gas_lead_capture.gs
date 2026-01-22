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

// NEW FUNCTION: Sends the welcome email to the customer
function sendAutoReplyToCustomer(data, emailAddress) {
    var recipient = emailAddress;

    // Basic check to see if it's an email address
    if (recipient && recipient.includes('@')) {
        var venueName = data['Venue Name'] !== 'N/A' ? data['Venue Name'] : 'venue của bạn';
        var emailSubject = "Chào mừng đến với Loudio - Nâng tầm trải nghiệm âm nhạc tại venue!";
        var emailBody = `
        <div style="font-family: 'Be Vietnam Pro', Arial, sans-serif; max-width: 600px; color: #333; line-height: 1.6;">
          <h2 style="color: #7B2CBF;">Chào bạn,</h2>
          <p>Cảm ơn bạn đã quan tâm đến giải pháp âm nhạc tương tác từ <strong>Loudio</strong>!</p>
          <p>Chúng tôi đã nhận được thông tin đăng ký cho <strong>${venueName}</strong>. Đội ngũ Loudio đang xử lý yêu cầu của bạn và sẽ liên hệ trong vòng 24 giờ tới!</p>
          
          <div style="background: #f8f4ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; font-weight: bold;">Thông tin đã nhận:</p>
            <p style="margin: 5px 0;">📍 Venue: ${venueName}</p>
            <p style="margin: 5px 0;">📧 Liên hệ: ${recipient}</p>
          </div>
          
          <br>
          <p>Trân trọng,</p>
          <p><strong>Đội ngũ Loudio</strong></p>
          <p style="font-size: 12px; color: #999;">Email này được gửi tự động từ hệ thống chăm sóc khách hàng của Loudio.</p>
        </div>`;

        try {
            console.log("Attempting to send email via alias no-reply@loudio.vn to " + recipient);
            // Try sending with the alias
            GmailApp.sendEmail(recipient, emailSubject, "", {
                from: "no-reply@loudio.vn",
                name: "Loudio Support",
                replyTo: "support@loudio.vn",
                htmlBody: emailBody
            });
            console.log("Email sent successfully via alias.");
        } catch (e) {
            console.error("Failed to send via alias: " + e.toString());
            console.log("Falling back to default sender...");
            
            // Fallback: Send as primary user (no alias)
            try {
                GmailApp.sendEmail(recipient, emailSubject, "", {
                    name: "Loudio Support (via fallback)",
                    htmlBody: emailBody
                });
                console.log("Email sent successfully via default sender.");
            } catch (e2) {
                console.error("Failed to send via default sender: " + e2.toString());
            }
        }
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
