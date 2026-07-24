Rano Air CPCP Progress Tracker - Desktop Migration Instructions

1. EXPORT DATABASE ON OLD LAPTOP:
   - Open the current Rano Air CPCP Progress Tracker.
   - Click "Export System Backup".
   - This downloads a file named like "rano-air-cpcp-backup-YYYY-MM-DD.json".
   - The backup includes checks, progress records, personnel, audit entries, and DSR snapshot history.

2. TRANSFER TO NEW LAPTOP:
   - Copy this "CPCP Checklist-Desktop-Bundle" folder and the downloaded backup JSON file onto a flash drive.
   - Connect the flash drive to the new laptop.
   - Copy the whole "CPCP Checklist-Desktop-Bundle" folder onto the Desktop or another normal folder.

3. START THE APP ON NEW LAPTOP:
   - Double-click "START_CPCP_CHECKLIST.bat" inside this folder.
   - If Python is installed, it starts a local server at http://localhost:8081/ and opens the app.
   - If Python is not installed, it opens "index.html" directly in the default browser.
   - The app runs offline and does not require internet once transferred.

4. RESTORE DATABASE / IMPORT DATA ON NEW LAPTOP:
   - Once the dashboard opens, click "Restore Backup".
   - Select the backup JSON file copied from the old laptop.
   - Confirm the restore.
   - All check data, progress, personnel, audit entries, and DSR history will be loaded.
