const { google } = require('googleapis');

const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
console.log('[DEBUG] Private key first 100 chars:', credentials.private_key.substring(0, 100));
console.log('[DEBUG] Contains \\n literal?', credentials.private_key.includes('\\n'));
console.log('[DEBUG] Contains real newline?', credentials.private_key.includes('\n'));

// Fix: convert literal \n to actual newlines
credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');

const auth = new google.auth.GoogleAuth({
  credentials: credentials,
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly']
});