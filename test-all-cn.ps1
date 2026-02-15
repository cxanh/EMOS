# EOMS 系统测试脚本 (PowerShell 版本)
# 支持中文显示

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "EOMS 系统测试脚本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# 测试 1: 后端数据库连接
Write-Host "[1/5] 测试后端数据库连接..." -ForegroundColor Yellow
Push-Location backend
node test-connection.js
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 后端连接测试失败" -ForegroundColor Red
    Pop-Location
    exit 1
}
Write-Host "✅ 后端连接测试通过" -ForegroundColor Green
Write-Host ""
Pop-Location

# 测试 2: 后端依赖
Write-Host "[2/5] 检查后端依赖..." -ForegroundColor Yellow
Push-Location backend
npm list --depth=0 > $null 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  后端依赖可能有问题，请检查" -ForegroundColor Yellow
} else {
    Write-Host "✅ 后端依赖完整" -ForegroundColor Green
}
Write-Host ""
Pop-Location

# 测试 3: 前端依赖
Write-Host "[3/5] 检查前端依赖..." -ForegroundColor Yellow
Push-Location frontend
npm list --depth=0 > $null 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  前端依赖可能有问题，请检查" -ForegroundColor Yellow
} else {
    Write-Host "✅ 前端依赖完整" -ForegroundColor Green
}
Write-Host ""
Pop-Location

# 测试 4: Agent Python 语法
Write-Host "[4/5] 检查 Agent Python 语法..." -ForegroundColor Yellow
Push-Location agent
python -m py_compile agent.py
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Agent 语法检查失败" -ForegroundColor Red
    Pop-Location
    exit 1
}
python -m py_compile collectors/cpu.py collectors/memory.py collectors/disk.py collectors/network.py
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Agent 采集器语法检查失败" -ForegroundColor Red
    Pop-Location
    exit 1
}
Write-Host "✅ Agent 语法检查通过" -ForegroundColor Green
Write-Host ""
Pop-Location

# 测试 5: Python 依赖
Write-Host "[5/5] 检查 Python 依赖..." -ForegroundColor Yellow
Push-Location agent

pip show psutil > $null 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  psutil 未安装，请运行: pip install -r requirements.txt" -ForegroundColor Yellow
} else {
    Write-Host "✅ psutil 已安装" -ForegroundColor Green
}

pip show requests > $null 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  requests 未安装，请运行: pip install -r requirements.txt" -ForegroundColor Yellow
} else {
    Write-Host "✅ requests 已安装" -ForegroundColor Green
}

pip show pyyaml > $null 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️  pyyaml 未安装，请运行: pip install -r requirements.txt" -ForegroundColor Yellow
} else {
    Write-Host "✅ pyyaml 已安装" -ForegroundColor Green
}

Pop-Location

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "测试完成！" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "下一步：" -ForegroundColor White
Write-Host "1. 启动后端: cd backend && npm run dev" -ForegroundColor White
Write-Host "2. 启动 Agent: cd agent && python agent.py" -ForegroundColor White
Write-Host "3. 启动前端: cd frontend && npm run dev" -ForegroundColor White
Write-Host ""
