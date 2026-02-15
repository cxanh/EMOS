@echo off
chcp 65001 > nul
echo ========================================
echo EOMS System Test Script
echo ========================================
echo.

echo [1/5] Testing backend database connection...
cd backend
node test-connection.js
if %errorlevel% neq 0 (
    echo [FAIL] Backend connection test failed
    exit /b 1
)
echo [PASS] Backend connection test passed
echo.

echo [2/5] Checking backend dependencies...
call npm list --depth=0 > nul 2>&1
if %errorlevel% neq 0 (
    echo [WARN] Backend dependencies may have issues
) else (
    echo [PASS] Backend dependencies complete
)
echo.

cd ..

echo [3/5] Checking frontend dependencies...
cd frontend
call npm list --depth=0 > nul 2>&1
if %errorlevel% neq 0 (
    echo [WARN] Frontend dependencies may have issues
) else (
    echo [PASS] Frontend dependencies complete
)
echo.

cd ..

echo [4/5] Checking Agent Python syntax...
cd agent
python -m py_compile agent.py
if %errorlevel% neq 0 (
    echo [FAIL] Agent syntax check failed
    exit /b 1
)
python -m py_compile collectors/cpu.py collectors/memory.py collectors/disk.py collectors/network.py
if %errorlevel% neq 0 (
    echo [FAIL] Agent collector syntax check failed
    exit /b 1
)
echo [PASS] Agent syntax check passed
echo.

cd ..

echo [5/5] Checking Python dependencies...
cd agent
pip show psutil > nul 2>&1
if %errorlevel% neq 0 (
    echo [WARN] psutil not installed, run: pip install -r requirements.txt
) else (
    echo [PASS] psutil installed
)

pip show requests > nul 2>&1
if %errorlevel% neq 0 (
    echo [WARN] requests not installed, run: pip install -r requirements.txt
) else (
    echo [PASS] requests installed
)

pip show pyyaml > nul 2>&1
if %errorlevel% neq 0 (
    echo [WARN] pyyaml not installed, run: pip install -r requirements.txt
) else (
    echo [PASS] pyyaml installed
)

cd ..

echo.
echo ========================================
echo Test Completed!
echo ========================================
echo.
echo Next Steps:
echo 1. Start backend: cd backend ^&^& npm run dev
echo 2. Start Agent: cd agent ^&^& python agent.py
echo 3. Start frontend: cd frontend ^&^& npm run dev
echo.
