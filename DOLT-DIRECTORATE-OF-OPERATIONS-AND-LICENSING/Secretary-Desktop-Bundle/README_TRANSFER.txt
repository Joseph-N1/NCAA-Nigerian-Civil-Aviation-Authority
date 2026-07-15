NCAA DOLT (Secretary Office Correspondence) — Desktop Migration Instructions

1. EXPORT DATABASE ON OLD LAPTOP:
   - Open your current NCAA Secretary Dashboard.
   - In the toolbar at the top/middle, click the "Export Backup" button.
   - This will download a file named like "dolt-secretary-backup-YYYY-MM-DD.json" to your Downloads folder.
   - Alternatively, you can click "Export CSV" to export the raw spreadsheet view.

2. TRANSFER TO NEW LAPTOP:
   - Copy this "Secretary-Desktop-Bundle" folder AND your downloaded ".json" backup file onto a flash drive.
   - Connect the flash drive to the new laptop.
   - Copy and paste the "Secretary-Desktop-Bundle" folder directly onto the Desktop (or any other folder) of the new laptop.

3. START THE APP ON NEW LAPTOP:
   - Double-click "START_SECRETARY.bat" inside this folder.
   - If the new laptop has Python installed, it will start a secure local server at http://localhost:8080/ and open the dashboard in your web browser.
   - If Python is not installed, it will fall back automatically and open the "index.html" file directly in your default web browser (Chrome, Edge, Firefox, etc.).
   - Note: The app runs 100% offline, meaning it does not need an active internet connection!

4. RESTORE DATABASE / IMPORT DATA ON NEW LAPTOP:
   - Once the dashboard opens in your browser, click the "Import" button in the toolbar.
   - In the file browser that appears, select the ".json" backup file you copied from your old laptop.
   - A confirmation message will ask if you want to import the records. Click "OK" to confirm.
   - All your correspondence records, dispatch locations, statuses, and detailed change history/audit trail will be successfully loaded!
