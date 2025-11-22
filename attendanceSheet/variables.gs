// --- CHANGE THESE AS NEEDED ---
const MASTER_ID = "";
const MASTER_SHEET_NAME = "Sheet1";
const ATTENDANCE_SHEET_NAME = "Attendance";
const TEAMS_SHEET_NAME = "Teams";
const ATTENDANCE_DATE_RANGE = "E2:2";

// --- SETUP REFERENCES ---
const masterSS = SpreadsheetApp.openById(MASTER_ID);
const masterSheet = masterSS.getSheetByName(MASTER_SHEET_NAME);
const ss = SpreadsheetApp.getActive();
const attendanceSheet = ss.getSheetByName(ATTENDANCE_SHEET_NAME);
const teamsSheet = ss.getSheetByName(TEAMS_SHEET_NAME);
const ui = SpreadsheetApp.getUi();
const timeZone = ss.getSpreadsheetTimeZone();
