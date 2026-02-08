@echo off
REM gatherly Database Setup Script for Windows

echo 🎅 gatherly Database Setup
echo ==============================
echo.

REM Check if PostgreSQL is installed
where psql >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ PostgreSQL is not installed or not in PATH
    echo Please install PostgreSQL first: https://www.postgresql.org/download/
    exit /b 1
)

echo ✓ PostgreSQL found
echo.

REM Configuration
set DB_NAME=gatherly
if "%DB_USER%"=="" set DB_USER=postgres
if "%DB_HOST%"=="" set DB_HOST=localhost
if "%DB_PORT%"=="" set DB_PORT=5432

echo Database Configuration:
echo   Database: %DB_NAME%
echo   User: %DB_USER%
echo   Host: %DB_HOST%
echo   Port: %DB_PORT%
echo.

REM Check if database exists
psql -U %DB_USER% -h %DB_HOST% -p %DB_PORT% -lqt | findstr /C:"%DB_NAME%" >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo ⚠️  Database '%DB_NAME%' already exists
    set /p RECREATE="Do you want to drop and recreate it? (y/N): "
    if /i "%RECREATE%"=="y" (
        echo Dropping existing database...
        dropdb -U %DB_USER% -h %DB_HOST% -p %DB_PORT% %DB_NAME%
        echo ✓ Database dropped
    ) else (
        echo Using existing database...
    )
)

REM Create database if it doesn't exist
psql -U %DB_USER% -h %DB_HOST% -p %DB_PORT% -lqt | findstr /C:"%DB_NAME%" >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo Creating database '%DB_NAME%'...
    createdb -U %DB_USER% -h %DB_HOST% -p %DB_PORT% %DB_NAME%
    if %ERRORLEVEL% EQU 0 (
        echo ✓ Database created
    ) else (
        echo ❌ Failed to create database
        exit /b 1
    )
)

REM Run schema
echo.
echo Running schema script...
psql -U %DB_USER% -h %DB_HOST% -p %DB_PORT% -d %DB_NAME% -f src\db\schema.sql

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✓ Schema applied successfully
    echo.
    echo 🎉 Database setup complete!
    echo.
    echo Next steps:
    echo   1. Copy .env.example to .env and update values if needed
    echo   2. Run 'pnpm dev' to start the API server
) else (
    echo.
    echo ❌ Failed to apply schema
    exit /b 1
)
