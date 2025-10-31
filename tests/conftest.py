import os
import sys
from pathlib import Path

# Ensure project root is on sys.path so `import backend.*` works in tests
ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

# Use a temporary SQLite file for tests via env var if not set already
os.environ.setdefault("DATABASE_URL", f"sqlite:///{ROOT / 'test_backend.db'}")
