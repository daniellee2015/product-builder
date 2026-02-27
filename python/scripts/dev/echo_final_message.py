#!/usr/bin/env python3
"""Simple task runner for P0-STEP3: Echo final message."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List


def run_task(
    output_file: str = "test-output-3.txt",
    input_files: List[str] | None = None,
) -> Dict[str, Any]:
    """Run the echo task and return structured JSON-compatible result."""
    input_files = input_files or []

    # Read optional input files if they exist; not required for this task.
    input_preview: Dict[str, str] = {}
    for file_name in input_files:
        path = Path(file_name)
        if path.exists():
            input_preview[file_name] = path.read_text(encoding="utf-8")[:200]

    message = "Echo final message"
    output_path = Path(output_file)
    output_path.write_text(f"{message}\n", encoding="utf-8")

    return {
        "status": "success",
        "summary": f"Wrote echoed message to {output_path}",
        "job_id": "test-db-integration-001",
        "step_id": "P0-STEP3",
        "output_files": [str(output_path)],
        "inputs_read": list(input_preview.keys()),
    }


def main() -> None:
    result = run_task(output_file="test-output-3.txt", input_files=[])
    print(json.dumps(result, ensure_ascii=True))


if __name__ == "__main__":
    main()
