/**
 * REELHOUSE access-code checker
 * -----------------------------
 * Paste this whole file into the Apps Script editor attached to your
 * Google Sheet (Extensions > Apps Script). See SETUP-INSTRUCTIONS.md
 * for the full walkthrough.
 *
 * Expects a Sheet named "Codes" with valid access codes listed one per
 * row in column A, starting at row 1 (no header needed, but a header
 * like "code" in A1 is fine too — non-digit rows are ignored).
 */

const SHEET_NAME = "Codes";

function doGet(e) {
  const code = (e.parameter.code || "").trim();
  const callback = e.parameter.callback;

  const valid = isValidCode(code);
  const payload = JSON.stringify({ valid: valid });

  // JSONP response so the browser can call this cross-origin with no
  // server-side CORS configuration needed.
  const body = callback ? `${callback}(${payload})` : payload;
  const mime = callback ? ContentService.MimeType.JAVASCRIPT : ContentService.MimeType.JSON;

  return ContentService.createTextOutput(body).setMimeType(mime);
}

function isValidCode(code) {
  if (!code) return false;
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  if (!sheet) return false;

  const values = sheet.getRange(1, 1, sheet.getLastRow() || 1, 1).getValues();
  return values.some((row) => String(row[0]).trim() === code);
}
