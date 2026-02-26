#!/bin/bash
# Product Builder 使用示例

# ============================================
# 场景1：本地开发和测试
# ============================================

# 1. 初始化数据库
cd scripts/python
python3 init_database.py

# 2. 运行一个workflow
python3 product_builder_cli.py run ../../src/config/workflow.json \
  --job-id dev-job-001 \
  --parallel \
  --max-workers 4

# 3. 查看执行状态
python3 product_builder_cli.py status dev-job-001

# 4. 查看详细日志
python3 product_builder_cli.py logs dev-job-001 --tail 100

# ============================================
# 场景2：多个workflow并发执行
# ============================================

# 启动3个worker（在不同的tmux窗格中）
# 窗格1:
python3 product_builder_cli.py worker --max-jobs 10

# 窗格2:
python3 product_builder_cli.py worker --max-jobs 10

# 窗格3:
python3 product_builder_cli.py worker --max-jobs 10

# 然后提交多个job，worker会自动分配执行

# ============================================
# 场景3：集成到你的CLI
# ============================================

# 如果你有自己的CLI，可以这样调用：
your-cli build --project myapp
  # 内部调用：
  # python3 /path/to/product_builder_cli.py run workflow.json --job-id build-123

# ============================================
# 场景4：查询和监控
# ============================================

# 获取JSON格式的状态（方便程序解析）
python3 product_builder_cli.py status dev-job-001 --json > status.json

# 使用jq解析
cat status.json | jq '.job_status'

# 或者直接查询数据库
sqlite3 workflow.db "SELECT * FROM jobs WHERE status='running'"

# ============================================
# 场景5：外部调度器集成（如Lobster）
# ============================================

# Lobster或其他调度器可以直接调用CLI
lobster submit --command "python3 product_builder_cli.py run workflow.json --job-id lobster-job-001"

# 查询状态
lobster status lobster-job-001
  # 内部调用：
  # python3 product_builder_cli.py status lobster-job-001 --json
