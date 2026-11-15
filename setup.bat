@echo off
echo === Installation backend ===
cd /d %~dp0backend
python -m venv .venv
call .venv\Scripts\activate.bat
python -m pip install --upgrade pip wheel
pip install "setuptools<81"
pip install --no-build-isolation -r requirements.txt
echo === Installation frontend ===
cd /d %~dp0frontend
call npm install
echo.
echo Termine. Verifiez que Ollama est installe puis lancez start.bat
pause
