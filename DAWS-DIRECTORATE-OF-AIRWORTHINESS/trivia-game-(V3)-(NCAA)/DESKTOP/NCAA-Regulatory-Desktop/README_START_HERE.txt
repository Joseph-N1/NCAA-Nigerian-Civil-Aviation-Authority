NCAA REGULATORY INTELLIGENCE PLATFORM - DESKTOP VERSION

How to move it to another Windows laptop
1. Copy this whole folder, NCAA-Regulatory-Desktop, to the new laptop Desktop.
2. Make sure Python 3.12 x64 is installed on the new laptop.
3. Open the folder.
4. Double-click START_NCAA_APP.bat.
5. The home page should open in the browser at http://127.0.0.1:5000/

Important notes
- Internet is not required after Python 3.12 x64 is installed.
- The first run creates .venv-runtime and installs packages from wheelhouse.
- Later runs reuse .venv-runtime and should start faster.
- Do not delete wheelhouse, hf_cache, database, ml-question-generator, js, or styles.
- To stop the local backend, double-click STOP_NCAA_APP.bat.

What is included
- Local Flask app and quiz frontend.
- 22 NCAA PDF database documents.
- Prebuilt content index and vector index.
- Offline Python wheelhouse.
- Offline sentence-transformers all-MiniLM-L6-v2 model cache.

Troubleshooting
- If Python is missing, install Python 3.12 x64 from python.org and enable "Add python.exe to PATH".
- If the browser does not open, go to http://127.0.0.1:5000/ manually.
- If port 5000 is busy, run STOP_NCAA_APP.bat, then start again.
- If setup says wheelhouse is missing, the folder was not copied completely.
