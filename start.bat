@echo off
title Deca XMD WhatsApp Bot
color 0A

echo.
echo  ╔════════════════════════════════════════════════════════════╗
echo  ║                    🤖 DECA XMD BOT 🤖                      ║
echo  ║                Advanced WhatsApp Automation                ║
echo  ║                      Version 1.0.0                        ║
echo  ║                Created by NEXUS DECAN TECH                 ║
echo  ╚════════════════════════════════════════════════════════════╝
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed!
    echo 📥 Please download and install Node.js from https://nodejs.org/
    echo.
    pause
    exit /b 1
)

REM Check if node_modules exists
if not exist "node_modules" (
    echo 📦 Dependencies not found. Installing...
    echo.
    call install.bat
    if %errorlevel% neq 0 (
        echo ❌ Installation failed!
        pause
        exit /b 1
    )
)

echo 🚀 Starting Deca XMD WhatsApp Bot...
echo.
echo 📱 Scan the QR code below with WhatsApp to connect
echo 🔄 Bot will auto-reconnect if disconnected
echo ⚡ Type Ctrl+C to stop the bot
echo.

REM Start the bot
node index.js

if %errorlevel% neq 0 (
    echo.
    echo ❌ Bot crashed! Restarting in 5 seconds...
    timeout /t 5 /nobreak >nul
    goto :EOF
)

echo.
echo 🛑 Bot stopped. Press any key to exit...
pause >nul
