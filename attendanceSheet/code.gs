// --- CHANGE THESE AS NEEDED ---
const MASTER_ID = "";
const MASTER_SHEET_NAME = "Sheet1";
const ATTENDANCE_SHEET_NAME = "Attendance";
const TEAMS_SHEET_NAME = "Teams";
const ATTENDANCE_DATE_RANGE = "E2:2";
const TEAMS_DATE_RANGE = "A1:1";
const TEAMS_ATTENDANCE_RANGE = "37:";
const TEAMS_WHITE_RANGE = "5:19";
const TEAMS_DARK_RANGE = "21:35";
const PLAYER_WIN_RANGE = "A3:D";
const PLAYER_SKILL_RANGE = "A2:B";
const WEIGHT_WIN_PERCENTAGE = 1;
const WEIGHT_SKILL_LEVEL = 1;
const DEFAULT_SKILL = 5;

// --- SETUP REFERENCES ---
const masterSS = SpreadsheetApp.openById(MASTER_ID);
const masterSheet = masterSS.getSheetByName(MASTER_SHEET_NAME);
const ss = SpreadsheetApp.getActive();
const attendanceSheet = ss.getSheetByName(ATTENDANCE_SHEET_NAME);
const teamsSheet = ss.getSheetByName(TEAMS_SHEET_NAME);
const timeZone = ss.getSpreadsheetTimeZone();

// Run from deployment
function doGet(e) {
  const teams = createTeams();
  const returnObj = {'date': teams[0], 'white': teams[1], 'dark': teams[2]};

  return ContentService.createTextOutput(JSON.stringify(returnObj)).setMimeType(ContentService.MimeType.JSON);
}

function createTeams() {
  // const date = promptForDate();  // use this to manually select a date
  const date = getNextDate();
  if (!date) return;
  console.log(`Creating teams for: ${date}`);

  const col = findDateColumn(date);
  const attendees = getAttendees(col, date);
  const playerWinPercentage = getPlayerWinPercentage();
  const playerSkillData = getPlayerSkillValue();
  const attendeeBalancingData = getAttendeeBalancingData(attendees, playerWinPercentage, playerSkillData);
  const [whiteTeam, darkTeam] = getBalancedTeams(attendeeBalancingData);

  writeTeams(col, whiteTeam, darkTeam);

  SpreadsheetApp.flush();
  return [date, whiteTeam, darkTeam];
}

function getNextDate() {
  // Get the next game date within 7 days
  for (let i = 0; i < 7; i++) {
    const date = new Date();  // today's date
    date.setDate(date.getDate() + i); // increment date, 1 day at a time
    const nextDate = Utilities.formatDate(date, timeZone, "yyyy-MM-dd").toString();

    if (checkDateExists(nextDate)) {
      return nextDate;
    }
  }
  return;
}

function promptForDate() {
  const ui = SpreadsheetApp.getUi();
  const now = new Date();
  const todayStr = Utilities.formatDate(now, timeZone, "yyyy-MM-dd").toString();

  // --- Prompt user ---
  const response = ui.prompt(
    "Enter the game date",
    `Use format YYYY-MM-DD (default: ${todayStr}):`,
    ui.ButtonSet.OK_CANCEL
  );

  if (response.getSelectedButton() === ui.Button.OK) {
    let dateStr = response.getResponseText().trim();
    if (!dateStr) dateStr = todayStr;

    // Validate format (basic check)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      ui.alert("Invalid date format. Please use YYYY-MM-DD.");
      return;
    }

    if (!checkDateExists(dateStr)) {
      ui.alert("Invalid date. Not found in spreadsheet.");
      return;
    }

    return dateStr;
  }
}

function checkDateExists(dateStr) {
  const dateRange = attendanceSheet.getRange(ATTENDANCE_DATE_RANGE);
  const dateValues = dateRange.getValues()[0].filter(v => v !== "" && v !== null);
  return dateValues.includes(dateStr);
}

function getAttendees(col, date) {
  const attendeesRange = col + TEAMS_ATTENDANCE_RANGE + col;
  const attendeesValues = teamsSheet.getRange(attendeesRange).getValues();
  const attendees = [];

  attendeesValues.forEach(attendee => {
    const name = attendee[0];
    if (name != '') {
      attendees.push(name);
    }
  });

  return attendees;
}

function findDateColumn(targetDate) {
  const dates = teamsSheet.getRange(TEAMS_DATE_RANGE).getValues()[0];

  for (let c = 0; c < dates.length; c++) {
    const date = dates[c].trim();
    if (date == targetDate) {
      return columnToLetter(c + 1);
    }
  }
  console.error("Date column not found");
  return; // not found
}

function columnToLetter(col) {
  let letter = "";
  while (col > 0) {
    let rem = (col - 1) % 26;
    letter = String.fromCharCode(65 + rem) + letter;
    col = Math.floor((col - 1) / 26);
  }
  return letter;
}

function getPlayerWinPercentage() {
  const playerWinData = attendanceSheet.getRange(PLAYER_WIN_RANGE).getValues();
  const winLookup = {}

  playerWinData.forEach(player => {
    const name = player[0];
    const wins = player[2];
    const games = player[3];

    if (name != '') {
      if (games) {
        winLookup[name] = (wins/games).toFixed(2) * 100
      } else {
        // no games, assume 50%
        winLookup[name] = 50;
      }
    }
  });

  return winLookup;
}

function getPlayerSkillValue() {
  const playerSkillData = masterSheet.getRange(PLAYER_SKILL_RANGE).getValues();
  const skillLookup = {};

  playerSkillData.forEach(player => {
    const name = player[0];
    let skill = player[1];
    if (!skill || skill == "NEW") {
      skill = DEFAULT_SKILL;
    }

    if (name != '') {
      skillLookup[name] = skill;
    }
  });

  return skillLookup;
}

function getAttendeeBalancingData(attendees, playerWinPercentage, playerSkillData) {
  const attendeeBalancingData = {};

  attendees.forEach(attendee => {
    // edge case: attendee does not exist in master sheet
    if (!playerSkillData[attendee]) {
      playerSkillData[attendee] = DEFAULT_SKILL;
    }

    attendeeBalancingData[attendee] = (playerWinPercentage[attendee] * WEIGHT_WIN_PERCENTAGE) + (playerSkillData[attendee] * 10 * WEIGHT_SKILL_LEVEL);
  });

  return attendeeBalancingData;
}

function getBalancedTeams(attendeeBalancingData) {
  const attendeesSorted = Object.entries(attendeeBalancingData).sort((a, b) => b[1] - a[1]);
  const whiteTeam = [];
  let whiteBalance = 0;
  const darkTeam = [];
  let darkBalance = 0;

  for (let i = 0; i < attendeesSorted.length; i++) {
    // Even -> White, Odd -> Dark
    if (i % 2 == 0) {
      whiteTeam.push(attendeesSorted[i][0]);
      whiteBalance += attendeesSorted[i][1];
    } else {
      darkTeam.push(attendeesSorted[i][0]);
      darkBalance += attendeesSorted[i][1];
    }
  }

  console.log(attendeesSorted);
  console.log(`White Team average: ${(whiteBalance/whiteTeam.length).toFixed(2)}`)
  console.log(whiteTeam);
  console.log(`Dark Team average: ${(darkBalance/darkTeam.length).toFixed(2)}`)
  console.log(darkTeam);

  return [whiteTeam, darkTeam];
}

function writeTeams(col, whiteTeam, darkTeam) {
  const whiteValues = whiteTeam.map(name => [name]);
  const whiteRange = teamsSheet.getRange(addColToRange(col, TEAMS_WHITE_RANGE));
  whiteRange.clearContent();
  whiteRange.offset(0, 0, whiteValues.length, 1).setValues(whiteValues);

  const darkValues = darkTeam.map(name => [name]);
  const darkRange = teamsSheet.getRange(addColToRange(col, TEAMS_DARK_RANGE));
  darkRange.clearContent();
  darkRange.offset(0, 0, darkValues.length, 1).setValues(darkValues);
}

function addColToRange(colLetter, rowRange) {
  const [startRow, endRow] = rowRange.split(":");
  return `${colLetter}${startRow}:${colLetter}${endRow}`;
}