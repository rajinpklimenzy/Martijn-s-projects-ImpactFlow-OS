# Create Artifact Registry Repository

## Quick Fix: Create Repository via Google Cloud Console

1. **Open this link directly:**
   https://console.cloud.google.com/artifacts/create/docker?project=gen-lang-client-0440861031

2. **Fill in the form:**
   - **Name:** `docker-repo`
   - **Format:** Docker
   - **Location:** `us-west1`
   - **Description:** Docker repository for ImpactFlow OS (optional)

3. **Click "CREATE"**

4. **After creation, trigger a new build** - your Cloud Build should now succeed!

---

## Alternative: Use gcloud CLI

If you prefer using the command line:

```bash
# 1. Authenticate (if not already done)
gcloud auth login

# 2. Set the project
gcloud config set project gen-lang-client-0440861031

# 3. Create the repository
gcloud artifacts repositories create docker-repo \
  --repository-format=docker \
  --location=us-west1 \
  --project=gen-lang-client-0440861031 \
  --description="Docker repository for ImpactFlow OS"
```

---

## Verify Repository Exists

After creating, verify it exists:

```bash
gcloud artifacts repositories describe docker-repo \
  --location=us-west1 \
  --project=gen-lang-client-0440861031
```

Or check in the console:
https://console.cloud.google.com/artifacts?project=gen-lang-client-0440861031
