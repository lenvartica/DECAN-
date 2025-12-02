@echo off
echo Installing Deca XMD WhatsApp Bot Dependencies...
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Node.js is not installed!
    echo Please download and install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo Node.js found! Installing dependencies...
echo.

REM Install npm packages
npm install

if %errorlevel% neq 0 (
    echo.
    echo Error installing dependencies!
    echo Please check your internet connection and try again.
    pause
    exit /b 1
)

echo.
echo Dependencies installed successfully!
echo.
echo To start the bot, run: npm start
echo.
pause
