// --- CHANGE THESE AS NEEDED ---
const ATTENDANCE_ID = "";
const ATTENDANCE_SHEET_NAME = "Attendance";
const ATTENDANCE_FIRST_NAME = "A3";
const MASTER_SHEET_NAME = "Sheet1";

function syncPlayers() {
  const attendanceSS = SpreadsheetApp.openById(ATTENDANCE_ID);
  const attendanceSheet = attendanceSS.getSheetByName(ATTENDANCE_SHEET_NAME);

  const masterSS = SpreadsheetApp.getActive();
  const masterSheet = masterSS.getSheetByName(MASTER_SHEET_NAME);

  // --- ADD HEADER IF SHEET IS EMPTY ---
  if (masterSheet.getLastRow() === 0) {
    const headerRange = masterSheet.getRange(1, 1, 1, 2);
    headerRange.setValues([["Player", "Skill (1-10)"]]);
    headerRange.setFontWeight("bold");
  }

  // --- GET ATTENDEES ---
  const attendeeData = attendanceSheet.getRange(`${ATTENDANCE_FIRST_NAME}:A`).getValues().flat().filter(x => x);
  
  // --- GET EXISTING MASTER PLAYERS ---
  const masterData = masterSheet.getLastRow() > 1 ? masterSheet.getRange(2, 1, masterSheet.getLastRow()-1, 2).getValues() : [];
  const masterNames = masterData.map(r => r[0]);
  const masterNameSet = new Set(masterNames);

  // --- ADD MISSING PLAYERS TO MASTER SHEET ---
  const rowsToAdd = [];
  attendeeData.forEach(name => {
    if (!masterNameSet.has(name)) {
      rowsToAdd.push([name, "NEW"]);
      masterNameSet.add(name);
    }
  });
  if (rowsToAdd.length > 0) {
    const startRow = masterSheet.getLastRow() + 1;
    const range = masterSheet.getRange(startRow, 1, rowsToAdd.length, 2);
    range.setValues(rowsToAdd);
  }

  // --- RELOAD MASTER DATA AFTER ADDING ---
  if (masterSheet.getLastRow() >= 2) {
    const skillRange = masterSheet.getRange(2, 2, masterSheet.getLastRow() - 1, 1); // column B only
    const skillValues = skillRange.getValues();
    const backgrounds = [];

    for (let i = 0; i < skillValues.length; i++) {
      const skill = skillValues[i][0];
      if (skill == "NEW") {
        backgrounds.push(["#fff178"]);  // missing → highlight yellow
      } else {
        backgrounds.push([null]);       // skill exists → remove highlight
      }
    }
    skillRange.setBackgrounds(backgrounds);
  }

  // --- SORT ROWS & APPLY FILTER ---
  if (masterSheet.getLastRow() > 2) { // only sort if there is data
    masterSheet.getRange(2, 1, masterSheet.getLastRow() - 1, 2).sort([{column: 2, ascending: false}]);
  }
  if (masterSheet.getFilter()) masterSheet.getFilter().remove();
  masterSheet.getRange(1, 1, masterSheet.getLastRow(), 2).createFilter();

  SpreadsheetApp.flush();
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Sync Players")
    .addItem("Sync Now", "syncPlayers")
    .addToUi();
}
