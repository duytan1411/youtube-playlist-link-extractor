import os
import sys

# Ensure the root project directory is in the sys.path so app can be loaded
current_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.dirname(current_dir)
if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

from app import app

# Vercel WSGI entrypoint
# The 'app' object is exposed for Vercel's Python Serverless runtime
if __name__ == "__main__":
    app.run()
