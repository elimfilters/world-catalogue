const { JWT } = require('google-auth-library');
const { GoogleSpreadsheet } = require('google-spreadsheet');
require('dotenv').config();

async function diag() {
    const clientEmail = "elimfilters-writer@gen-lang-client-0000922456.iam.gserviceaccount.com";
    const spreadsheetId = "1ZYI5c0enkuvWAveu8HMaCUk1cek_VDrX8GtgKW7VP6U";
    const rawKey = "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCrmlPLx6LdRIpU\nQMc1MGoIhqWI0d1wlnH75crcFGx1V7115tw36U5mhMrXIILxE14zYgrZLMposFNx\nMbRrs2K6rsNotzhjcr7bL0pZE9rnNxHZqqymYGENuWW+UNOdUWgZv+GCkSpZaxRK\nf+0AQ2XBBJFvWucexaneR6iB7KPz2YW9ylxlNLHdUZlE0kUbDlyjDdCOvATincQ0\n3jOH5tAZlYKsTw1lR+KezrN8xR46F0l/V8XPtXlkgsAd+oS7ZMlHdYJgraMUXdFt\nMcJmHx19NCsnyZf++VOvw2a/pY3GNVH+1ztpPB7IjMS7E77VLhsQU7YGU4mIQ4J4\nh7NOQUo5AgMBAAECggEADOo1f522bS65C8mVnzQrQW8Ddaj4ddPCH7IrXVA62sNQ\nDVfi9Qudt0DWlJrsH+v+5/ZrWJhIDNmlvgbT9v3DjXHqX67XvexR3uR6lPpV5uw8\nb1mqsBmK1GHtUrB57K9xb+wCszVCWa53EtBOlvl7kVZLAnV19YPs2pTMDX3bglZE\nxEof7dSM5nrEv/ryt7GIpWueU0hbEdI36rIWTJT3FWN8IvwQS1PSEWuz6mMPxc9e\nzmEOXfVkhJwpbbeEHGN4VU1ZMC1B0ML9jBFcMadUuf0pLyiv9RcIV08u4QqdEZ83\n/Sr+mfrlm+R0+9qHTjFyIguuI+2EJFZaYAnTaznL3QKBgQDUX2oEntuMr/ah9ieL\nDWowlJYpYMYdEUZb9xuqFczPrx06TFiK1evF9b8AgW30Xu4HgAzyzdr0+0xXAcwe\nhLNsA+n6nRUZ5Sz2QXf8AzbhiCnLlFnMnwz0kAJneJcqUu3a3zLvORvUrSUT6vjk\nbJWhJIGcBgBeRh6n9WOb1rxGuwKBgQDO2tgNl150CF245iavd2w0I2wXjar5irjO\nmOZ8/S+yZ8+FTRypPdmKIJq+3N/8vgTpU4l7z3gELWK7td3+e6QXe/ZR7mjWhJkC\nHKTp9MKjGvPSR+zj+H/oY19yChjiZDH7ChpnpUvAzS9HeDCyISOOy4ehFsgnRP19\n6lRw5F11mwKBgEtTUFo1MjATVYoasenbJzf169DfV0WGFAuYeQJ52vwq41YDMECG\nIatEP6vhPGu5o/mbDHyuUSQlYe1WYNzOOolsVfgi8RIPPERX8kO7rCKQViq0AqnW\nHBU+YuvqVMuZQG4qTnmVKu7jPsxywjba4LOYLDR32HeXrVXrbpoerwbzAoGBAMNc\n3QC5HXPpEts2QwMlfwQfEE+OdRQJeFFnBwi09v9AHDaBhbgxuetCr+PjJ4jEzk6v\nnwFYCLmpQ76VHXzjuS6U3Sa0TD+OLBRaiUaM6+av5eeMFqeYYvVQJSzHbIkkqC+4\ncwfAjbMiFq0hTpxtv+91OjtiENdFyUPKtMWKaNpRAoGAVkD+pGwkDl/umJjN2bRK\nNfsYEOPHidYIRj5AGVwDHVejgx05dVrP0UAJ5OLl8PCBVT9Lhj9mNPhcRNjdCQKn\nn7cPqTHhMVhxCHjxYYYYDKdgQxYS97EpMvD2Ag1lRMDJWZFh2jYDbgEfEWqtLhyU\n2TG+LMB5VUJeIDGi9ErRWKI=\n-----END PRIVATE KEY-----\n";

    const auth = new JWT({ email: clientEmail, key: rawKey.replace(/\\n/g, '\n'), scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'] });
    const doc = new GoogleSpreadsheet(spreadsheetId, auth);
    await doc.loadInfo();
    const sheet = doc.sheetsByTitle['MASTER_KITS_V1'];
    await sheet.loadHeaderRow();
    console.log('--- COLUMNAS DETECTADAS ---');
    console.log(sheet.headerValues);
    process.exit(0);
}
diag();
