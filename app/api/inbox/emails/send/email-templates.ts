/**
 * Email template generation helpers
 */

interface MessageData {
  body: string;
  date: any;
  type?: string;
  from?: string;
}

/**
 * Formats a Firebase timestamp to a readable date string
 */
export function formatTimestamp(timestamp: any): string {
  if (!timestamp) return '';

  let milliseconds: number;

  // Handle different timestamp formats
  if (timestamp.seconds !== undefined) {
    milliseconds = timestamp.seconds * 1000 + Math.floor((timestamp.nanoseconds || 0) / 1000000);
  } else if (timestamp._seconds !== undefined) {
    milliseconds = timestamp._seconds * 1000 + Math.floor((timestamp._nanoseconds || 0) / 1000000);
  } else if (timestamp instanceof Date) {
    milliseconds = timestamp.getTime();
  } else if (typeof timestamp === 'number') {
    milliseconds = timestamp;
  } else {
    return '';
  }

  const date = new Date(milliseconds);

  const dateOptions: Intl.DateTimeFormatOptions = { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  };
  const formattedDate = date.toLocaleDateString('en-US', dateOptions);

  const timeOptions: Intl.DateTimeFormatOptions = { 
    hour: '2-digit', 
    minute: '2-digit' 
  };
  const formattedTime = date.toLocaleTimeString('en-US', timeOptions);

  return `${formattedDate} ${formattedTime}`;
}

/**
 * Gets current date and time formatted
 */
export function getCurrentDateTime(): string {
  const date = new Date();
  const options: Intl.DateTimeFormatOptions = {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  };
  return date.toLocaleString('en-US', options);
}

/**
 * Simple markdown to HTML converter (basic implementation)
 */
export function parseMarkdown(text: string): string {
  if (!text) return '';
  
  // Basic markdown parsing
  let html = text;
  
  // Code blocks
  html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
  
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  
  // Bold
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/__([^_]+)__/g, '<strong>$1</strong>');
  
  // Italic
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  html = html.replace(/_([^_]+)_/g, '<em>$1</em>');
  
  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  
  // Line breaks
  html = html.replace(/\n/g, '<br>');
  
  return html;
}

/**
 * Generates HTML email template for message responses
 */
export function generateMessageResponseHtml(
  messageList: MessageData[],
  customerEmail: string,
  newMessage: string,
  subdomain: string,
  companyName: string,
  senderName: string = 'Support'
): string {
  const previousMessage = messageList.length > 0 ? messageList[0] : null;
  const previousMessageDate = previousMessage ? formatTimestamp(previousMessage.date) : null;
  const previousActualMessage = previousMessage ? previousMessage.body : '';
  const currentDT = getCurrentDateTime();

  const showEarlierMessageBlock = messageList.length >= 3;

  let previousMessageName = 'Support';
  if (previousMessage?.type) {
    if (previousMessage.type.includes('AI')) {
      previousMessageName = 'Charlie AI';
    } else if (previousMessage.type.includes('Receiver')) {
      previousMessageName = customerEmail;
    }
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Message in Ticket Thread</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 0;
            background-color: #f4f4f4;
            color: #333333;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            padding: 5px 0;
        }
        .header img {
            max-width: 150px;
        }
        .header h1 {
            font-size: 24px;
            color: #2c3e50;
        }
        .content {
            padding: 20px;
            line-height: 1.6;
        }
        .content h2 {
            color: #2c3e50;
            font-size: 22px;
            margin-bottom: 10px;
        }
        .message-thread {
            margin-top: 20px;
            border-left: 3px solid #ecf0f1;
            padding-left: 15px;
        }
        .previous-messages-indicator {
            text-align: center;
            color: #7f8c8d;
            font-size: 12px;
            margin-bottom: 15px;
        }
        .previous-messages-indicator hr {
            border: none;
            border-top: 1px dashed #bdc3c7;
            margin: 10px 0;
        }
        .message {
            margin-bottom: 15px;
            padding: 10px;
            border-radius: 8px;
            background-color: #ecf0f1;
        }
        .message .meta {
            font-size: 12px;
            color: #7f8c8d;
            margin-bottom: 5px;
        }
        .message p {
            margin: 5px 0;
        }
        .message div {
            margin: 5px 0;
            line-height: 1.6;
        }
        .message.new {
            background-color: #dff9fb;
            border: 1px solid #3498db;
            padding: 15px;
        }
        .cta {
            text-align: center;
            margin-top: 30px;
        }
        .cta a {
            background-color: #3498db;
            color: #ffffff;
            text-decoration: none;
            padding: 12px 25px;
            border-radius: 5px;
            font-weight: bold;
            display: inline-block;
        }
        .footer {
            text-align: center;
            padding: 20px;
            font-size: 12px;
            color: #7f8c8d;
        }
        .footer a {
            color: #3498db;
            text-decoration: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${companyName}</h1>
            <p>New Message!</p>
            <br>
            <hr>
        </div>
        <div class="content">
            <h2>Hello ${customerEmail},</h2>
            <p>There's a new message in your ticket conversation. Please find the details below:</p>

            <div class="message-thread">
                <div class="message new">
                    <div class="meta">${currentDT} - ${senderName}</div>
                    <div>${parseMarkdown(newMessage || '')}</div>
                </div>
                ${previousMessage ? `
                <div class="message">
                    <div class="meta">${previousMessageDate || ''} - ${previousMessageName}</div>
                    <div>${parseMarkdown(previousActualMessage || '')}</div>
                </div>` : ''}
                ${showEarlierMessageBlock ? `
                <div class="previous-messages-indicator">
                    <hr>
                    <span>Earlier Messages</span>
                    <hr>
                </div>` : ''}
            </div>

            <div class="cta">
                <a href="https://${subdomain}.ourkd.help">Help Center</a>
            </div>

            <p>If you have any further questions, feel free to reply to this email or contact our support team directly.</p>
        </div>
        <div class="footer">
            <p>Thank you for your patience. We're committed to resolving your issue as quickly as possible.</p>
            <br>
            <hr>
            <p style="margin-top: 40px; font-size: 17px; font-weight: bold; color: #2c3e50;">
                Powered By <a href="https://evidah.com" style="color: #e74c3c; text-decoration: none;">Evidah</a>
            </p>
        </div>
    </div>
</body>
</html>`;
}

