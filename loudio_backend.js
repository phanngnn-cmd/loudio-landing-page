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
        'Notes': data.notes || ''
    };

    var newRow = headers.map(h => rowData[h] || '');
    sheet.appendRow(newRow);

    // 1. Send internal notification (to you)
    sendNotification(rowData);

    // 2. Send Auto-Reply to Customer (NEW)
    sendAutoReplyToCustomer(rowData);

    return ContentService
        .createTextOutput(JSON.stringify({ 'result': 'success' }))
        .setMimeType(ContentService.MimeType.JSON);
}

// NEW FUNCTION: Sends the welcome email to the customer
function sendAutoReplyToCustomer(data) {
    var rawContact = data['Contact Info']; // Likely "Phone: ..., Email: ..."
    var recipient = '';

    // Extract email address if present
    var emailMatch = rawContact.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi);
    if (emailMatch && emailMatch.length > 0) {
        recipient = emailMatch[0];
    } else if (rawContact.includes('@')) {
        // Fallback: assume the whole field is the email if no pattern match but has @
        recipient = rawContact;
    }

    // Basic check to see if it's an email address
    if (recipient && recipient.includes('@')) {
        var venueName = data['Venue Name'] !== 'N/A' ? data['Venue Name'] : 'venue của bạn';

        // To send via 'no-reply@loudio.vn', you MUST have it set up as an alias in your Gmail settings.
        // We use GmailApp here as it handles headers/aliases more reliably than MailApp.
        GmailApp.sendEmail(recipient, "Chào mừng đến với Loudio - Nâng tầm trải nghiệm âm nhạc tại venue!", "", {
            from: "no-reply@loudio.vn", // <--- THIS forces the sender address
            name: "Loudio Support",
            replyTo: "support@loudio.vn",
            htmlBody: `
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
        </div>`
        });
    }
}

// Keep your existing functions below...
function saveArticle(article) { /* ... */ }
function getArticles() { /* ... */ }
function deleteArticle(id) { /* ... */ }

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
