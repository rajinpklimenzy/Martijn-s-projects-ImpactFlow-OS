# Fix gcloud Python Installation Error

## The Problem
gcloud installation failed because it's trying to use Python 3.13 from a path that doesn't exist:
```
ERROR: Provided python path `/opt/homebrew/opt/python@3.13/libexec/bin/python3` does not exist.
```

## Solution Options

### Option 1: Install Python 3.13 First (Recommended)
```bash
brew install python@3.13
```

Then reinstall gcloud:
```bash
brew reinstall --cask google-cloud-sdk
```

### Option 2: Use Existing Python 3.10+ and Configure gcloud
1. Check what Python versions you have:
   ```bash
   which python3
   python3 --version
   ```

2. If you have Python 3.10 or higher, set it before installing gcloud:
   ```bash
   # Find your Python 3.10+ path
   ls -la /opt/homebrew/opt/python@*/libexec/bin/python3
   
   # Or use system Python if it's 3.10+
   /usr/bin/python3 --version
   ```

3. Set the Python path and reinstall:
   ```bash
   export CLOUDSDK_PYTHON=$(which python3)
   brew reinstall --cask google-cloud-sdk
   ```

### Option 3: Skip gcloud CLI - Use Cloud Console UI Instead
Since you're having installation issues, the fastest solution is to create the repository via the web UI:

**Go to:** https://console.cloud.google.com/artifacts

See `CREATE_REPO_UI.md` for detailed step-by-step instructions.

This avoids all Python/gcloud CLI issues and gets you up and running immediately.

## After Fixing gcloud Installation

Once gcloud is working, verify it:
```bash
gcloud --version
gcloud auth login
gcloud config set project gen-lang-client-0440861031
```

Then create the repository:
```bash
cd impactflow-os
./setup-artifact-registry.sh us-west1
```
