# Product Builder - 集成指南

## 概述

Product Builder是一个**独立的workflow执行引擎**，可以通过多种方式使用和集成。

## 使用模式

### 模式1：独立使用（最简单）

直接使用提供的CLI，无需任何集成：

```bash
# 运行workflow
python3 product_builder_cli.py run workflow.json --job-id job-001

# 查看状态
python3 product_builder_cli.py status job-001
```

**适用场景**：
- 本地开发和测试
- 手动执行workflow
- 简单的自动化脚本

---

### 模式2：集成到你的CLI

如果你有自己的CLI工具，可以将Product Builder作为子命令或后端：

**方式A：作为子进程调用**
```python
# 在你的CLI中
import subprocess
import json

def run_workflow(workflow_path, job_id):
    result = subprocess.run([
        'python3', '/path/to/product_builder_cli.py',
        'run', workflow_path,
        '--job-id', job_id,
        '--json'
    ], capture_output=True, text=True)

    return json.loads(result.stdout)

def get_job_status(job_id):
    result = subprocess.run([
        'python3', '/path/to/product_builder_cli.py',
        'status', job_id,
        '--json'
    ], capture_output=True, text=True)

    return json.loads(result.stdout)
```

**方式B：直接导入Python模块**
```python
# 在你的CLI中
import sys
sys.path.insert(0, '/path/to/scripts/python')

from orchestrator import WorkflowOrchestrator

def run_workflow(workflow_path, job_id):
    orchestrator = WorkflowOrchestrator(
        workflow_path=workflow_path,
        job_id=job_id,
        parallel_execution=True
    )
    orchestrator.execute()
    return orchestrator.state
```

**适用场景**：
- 你有自己的CLI工具
- 需要深度集成
- 需要自定义UI/UX

---

### 模式3：作为服务运行

将Product Builder包装成HTTP服务：

```python
# simple_api.py
from flask import Flask, request, jsonify
import subprocess
import json

app = Flask(__name__)

@app.route('/workflow/run', methods=['POST'])
def run_workflow():
    data = request.json
    job_id = data['job_id']
    workflow = data['workflow_path']

    # 异步执行
    subprocess.Popen([
        'python3', 'product_builder_cli.py',
        'run', workflow, '--job-id', job_id
    ])

    return jsonify({"status": "started", "job_id": job_id})

@app.route('/workflow/status/<job_id>')
def get_status(job_id):
    result = subprocess.run([
        'python3', 'product_builder_cli.py',
        'status', job_id, '--json'
    ], capture_output=True, text=True)

    return result.stdout

if __name__ == '__main__':
    app.run(port=8080)
```

**使用**：
```bash
# 启动服务
python3 simple_api.py

# 触发workflow
curl -X POST http://localhost:8080/workflow/run \
  -H "Content-Type: application/json" \
  -d '{"job_id": "api-job-001", "workflow_path": "workflow.json"}'

# 查询状态
curl http://localhost:8080/workflow/status/api-job-001
```

**适用场景**：
- 需要HTTP API
- 多个客户端访问
- 微服务架构

---

### 模式4：外部调度器集成

与Lobster、Airflow等调度器集成：

**Lobster集成示例**：
```python
# lobster_integration.py
import subprocess

def submit_to_lobster(workflow_path, job_id):
    # Lobster提交命令
    lobster_cmd = [
        'lobster', 'submit',
        '--name', f'product-builder-{job_id}',
        '--command', f'python3 product_builder_cli.py run {workflow_path} --job-id {job_id}'
    ]

    subprocess.run(lobster_cmd)

def check_lobster_status(job_id):
    # 通过Product Builder CLI查询
    result = subprocess.run([
        'python3', 'product_builder_cli.py',
        'status', job_id, '--json'
    ], capture_output=True, text=True)

    return result.stdout
```

**适用场景**：
- 已有调度系统
- 需要资源管理
- 大规模并发执行

---

## 数据查看方案

### 方案1：CLI查询（推荐）

最简单直接的方式：

```bash
# 查看job状态
python3 product_builder_cli.py status job-001

# JSON格式（方便程序解析）
python3 product_builder_cli.py status job-001 --json

# 查看日志
python3 product_builder_cli.py logs job-001 --tail 50
```

### 方案2：直接查询数据库

```python
from workflow_db_phase1 import WorkflowDatabase
from workflow_db_git import GitHubDatabase

# 查询job信息
db = WorkflowDatabase()
job = db.get_job("job-001")

# 查询step执行
steps = db.conn.execute("""
    SELECT step_id, status, started_at, completed_at
    FROM step_executions
    WHERE job_id = ?
    ORDER BY started_at
""", ("job-001",)).fetchall()

# 查询git操作
git_db = GitHubDatabase()
git_ops = git_db.get_job_git_operations("job-001")
```

### 方案3：构建简单的Web界面（可选）

如果需要可视化，可以快速构建一个简单的web界面：

```python
# dashboard.py
from flask import Flask, render_template, jsonify
from workflow_db_phase1 import WorkflowDatabase

app = Flask(__name__)

@app.route('/')
def index():
    db = WorkflowDatabase()
    jobs = db.conn.execute("""
        SELECT job_id, workflow_id, status, created_at
        FROM jobs
        ORDER BY created_at DESC
        LIMIT 50
    """).fetchall()

    return render_template('dashboard.html', jobs=jobs)

@app.route('/job/<job_id>')
def job_detail(job_id):
    db = WorkflowDatabase()
    job = db.get_job(job_id)
    steps = db.conn.execute("""
        SELECT * FROM step_executions WHERE job_id = ?
    """, (job_id,)).fetchall()

    return render_template('job_detail.html', job=job, steps=steps)

if __name__ == '__main__':
    app.run(port=5000)
```

**HTML模板示例**：
```html
<!-- templates/dashboard.html -->
<!DOCTYPE html>
<html>
<head>
    <title>Product Builder Dashboard</title>
</head>
<body>
    <h1>Jobs</h1>
    <table>
        <tr>
            <th>Job ID</th>
            <th>Workflow</th>
            <th>Status</th>
            <th>Created</th>
        </tr>
        {% for job in jobs %}
        <tr>
            <td><a href="/job/{{ job.job_id }}">{{ job.job_id }}</a></td>
            <td>{{ job.workflow_id }}</td>
            <td>{{ job.status }}</td>
            <td>{{ job.created_at }}</td>
        </tr>
        {% endfor %}
    </table>
</body>
</html>
```

---

## Webhook使用场景

### 场景1：外部触发

当外部系统（GitHub、Slack等）需要触发workflow：

```python
# webhook_server.py
from flask import Flask, request, jsonify
import subprocess

app = Flask(__name__)

@app.route('/webhook/github', methods=['POST'])
def github_webhook():
    event = request.headers.get('X-GitHub-Event')
    data = request.json

    if event == 'push':
        # 触发workflow
        job_id = f"github-{data['after'][:8]}"
        subprocess.Popen([
            'python3', 'product_builder_cli.py',
            'run', 'ci-workflow.json',
            '--job-id', job_id
        ])

        return jsonify({"status": "triggered", "job_id": job_id})

    return jsonify({"status": "ignored"})

if __name__ == '__main__':
    app.run(port=9000)
```

### 场景2：完成通知

Workflow完成后通知外部系统：

```python
# 修改orchestrator.py，添加完成回调
class WorkflowOrchestrator:
    def __init__(self, ..., webhook_url=None):
        self.webhook_url = webhook_url

    def execute(self):
        try:
            # ... 执行workflow
            self._notify_webhook('completed', self.state)
        except Exception as e:
            self._notify_webhook('failed', {'error': str(e)})

    def _notify_webhook(self, status, data):
        if self.webhook_url:
            requests.post(self.webhook_url, json={
                'job_id': self.job_id,
                'status': status,
                'data': data
            })
```

---

## 推荐的集成方案

根据你的需求选择：

### 如果你只是想运行workflow
→ **使用模式1**：直接使用CLI，无需集成

### 如果你有自己的CLI工具
→ **使用模式2**：将Product Builder作为后端，通过subprocess调用

### 如果需要Web界面查看数据
→ **使用方案3**：构建简单的Flask dashboard

### 如果需要外部系统触发
→ **使用Webhook场景1**：创建webhook服务器

### 如果需要完成通知
→ **使用Webhook场景2**：添加完成回调

---

## 快速开始

最简单的使用方式：

```bash
# 1. 初始化
cd scripts/python
python3 init_database.py

# 2. 运行workflow
python3 product_builder_cli.py run ../../src/config/workflow.json --job-id test-001

# 3. 查看状态
python3 product_builder_cli.py status test-001

# 4. 查看日志
python3 product_builder_cli.py logs test-001
```

就这么简单！无需任何额外的集成或配置。

---

## 常见问题

**Q: 我必须使用webhook吗？**
A: 不需要。Webhook只在需要外部触发或通知时使用。

**Q: 我必须构建Web界面吗？**
A: 不需要。CLI的JSON输出已经足够，可以直接解析使用。

**Q: 如何与我的现有系统集成？**
A: 最简单的方式是通过subprocess调用CLI，或者直接导入Python模块。

**Q: 数据存在哪里？**
A: 所有数据存储在SQLite数据库（workflow.db）中，可以直接查询。

**Q: 如何监控执行状态？**
A: 使用`product_builder_cli.py status <job-id> --json`命令。

---

## 下一步

1. 尝试运行一个简单的workflow
2. 查看数据库中的数据
3. 根据需求选择集成方案
4. 如需要，构建简单的Web界面

需要帮助？查看QUICKSTART.md和ARCHITECTURE.md文档。
