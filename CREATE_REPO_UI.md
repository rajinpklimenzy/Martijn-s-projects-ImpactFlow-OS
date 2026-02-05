# Create Artifact Registry Repository via Google Cloud Console (No CLI Required)

## Step-by-Step Instructions

### Step 1: Open Artifact Registry
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Make sure you're in the correct project: **gen-lang-client-0440861031**
3. Navigate to **Artifact Registry**:
   - Click the hamburger menu (☰) in the top left
   - Go to **"Artifact Registry"** under "DevOps" section
   - Or go directly to: https://console.cloud.google.com/artifacts

### Step 2: Create Repository
1. Click the **"+ CREATE REPOSITORY"** button at the top
2. Fill in the form:
   - **Name:** `docker-repo`
   - **Format:** Select **"Docker"**
   - **Mode:** Leave as **"Standard"** (default)
   - **Region:** Select **"us-west1"** (Oregon)
     - Or choose your preferred region (us-central1, us-east1, etc.)
   - **Description:** (Optional) "Docker repository for ImpactFlow OS"
3. Click **"CREATE"**

### Step 3: Verify Repository
After creation, you should see:
- Repository name: `docker-repo`
- Format: `DOCKER`
- Location: `us-west1`

### Step 4: Grant Cloud Build Permissions
1. Click on the repository name `docker-repo`
2. Go to the **"PERMISSIONS"** tab
3. Click **"GRANT ACCESS"**
4. Add the Cloud Build service account:
   - **Principal:** `[PROJECT_NUMBER]@cloudbuild.gserviceaccount.com`
     - To find your project number, go to: https://console.cloud.google.com/iam-admin/settings
     - Or look at the top of the Cloud Console - it shows "Project ID: gen-lang-client-0440861031"
   - **Role:** Select **"Artifact Registry Writer"**
5. Click **"SAVE"**

**Alternative:** If you can't find the project number, you can grant permissions via IAM:
1. Go to [IAM & Admin → IAM](https://console.cloud.google.com/iam-admin/iam)
2. Find the service account: `[PROJECT_NUMBER]@cloudbuild.gserviceaccount.com`
3. Click the edit icon (pencil)
4. Click **"ADD ANOTHER ROLE"**
5. Select **"Artifact Registry Writer"**
6. Click **"SAVE"**

### Step 5: Update Cloud Build Trigger (If Not Done Already)
1. Go to [Cloud Build Triggers](https://console.cloud.google.com/cloud-build/triggers)
2. Click on your trigger
3. Click **"EDIT"**
4. Scroll to **"Substitution variables"**
5. Add/verify these variables:
   - `_ARTIFACT_REPO` = `docker-repo`
   - `_LOCATION` = `us-west1` (or the region you chose)
6. Click **"SAVE"**

### Step 6: Test the Build
1. Go back to [Cloud Build Triggers](https://console.cloud.google.com/cloud-build/triggers)
2. Click **"RUN"** on your trigger (or push a new commit)
3. The build should now succeed!

## Troubleshooting

### Can't find Artifact Registry?
- Make sure you're in the correct project
- Artifact Registry API might need to be enabled:
  1. Go to [APIs & Services → Library](https://console.cloud.google.com/apis/library)
  2. Search for "Artifact Registry API"
  3. Click **"ENABLE"**

### Permission denied errors?
- Make sure you granted "Artifact Registry Writer" role to the Cloud Build service account
- The service account format is: `[PROJECT_NUMBER]@cloudbuild.gserviceaccount.com`
