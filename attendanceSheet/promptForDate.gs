function promptForDate() {
  // --- Get today's date in the sheet's timezone ---
  const now = new Date();
  const todayStr = Utilities.formatDate(now, timeZone, "yyyy-MM-dd");

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

    // --- Call the team-balancing function with this date ---
    createTeams(dateStr);
  }
}

function checkDateExists(dateStr) {
  const dateRange = attendanceSheet.getRange(ATTENDANCE_DATE_RANGE);
  const dateValues = dateRange.getValues()[0].filter(v => v !== "" && v !== null);
  const dateStrings = dateValues.map(d => {
    if (d instanceof Date) {
      return Utilities.formatDate(d, timeZone, "yyyy-MM-dd");
    } else {
      return String(d).trim();  // ensures any non-Date values become clean strings
    }
  });

  // --- Check if date exists ---
  return dateStrings.includes(dateStr);
}
