# Build and Deployment Process

## Overview
This document describes how to build the weather forecast card and deploy it to Home Assistant.

## Build Process

### Automatic Build via GitHub Actions
The project uses GitHub Actions for automated builds triggered on:
- Pushes to `main` branch
- Pushes to `feature/**` branches
- Pull requests to `main` branch

**Build Workflow:** `.github/workflows/build.yml`

**Build Steps:**
1. Checkout code
2. Install pnpm 10 and Node.js 24
3. Install dependencies
4. Run lint checks
5. Build with Parcel
6. Run tests
7. Upload artifact (retention: 30 days)

**Build Output:** `dist/weather-forecast-card.js`

## Deployment Process

### Prerequisites
- Windows machine with access to `x:\` drive (Home Assistant folder)
- Directory structure: `x:\www\` must exist

### Step 1: Locate Build Artifacts
1. Go to GitHub Actions workflow runs: https://github.com/sevorl/ha-weather-forecast-card/actions
2. Click on the successful build run for your branch (feature/grouped-condition-icons)
3. Look for the "Artifacts" section at the bottom

### Step 2: Download Artifact
**Option A: Manual Download**
1. On the GitHub Actions run page, find the artifact dropdown
2. Click to download the ZIP file
3. Save to `C:\temp\` (or preferred location)

**Option B: Automated Download (PowerShell)**
```powershell
cd C:\temp
$commitSha = "91d03d129d6ac23fbdb2fb9d3521c8436afef8b4"  # Replace with actual commit SHA
curl.exe -L -o weather-forecast-card.zip "https://nightly.link/sevorl/ha-weather-forecast-card/workflows/build/feature%2Fgrouped-condition-icons/weather-forecast-card-$commitSha.zip"
```

### Step 3: Extract Artifact
```powershell
cd C:\temp
Expand-Archive -Path weather-forecast-card.zip -DestinationPath extracted -Force
```

### Step 4: Deploy to Home Assistant
```powershell
# Copy and rename to dev version
Copy-Item -Path C:\temp\extracted\weather-forecast-card.js -Destination x:\www\weather-forecast-card-dev.js -Force

# Verify deployment
Test-Path x:\www\weather-forecast-card-dev.js
```

**Result:** File deployed to `x:\www\weather-forecast-card-dev.js`

### Step 5: Test in Home Assistant
1. Clear browser cache or do a hard refresh (Ctrl+Shift+R)
2. Reload Home Assistant dashboard
3. Verify the weather forecast card loads with new changes

## Important Notes

### Commit SHA Lookup
To find the commit SHA for your build:
```powershell
cd <repo-directory>
git log -1 --format="%H"
```

### nightly.link Service
The deployment uses `nightly.link` service which provides direct downloads of GitHub Actions artifacts:
- URL format: `https://nightly.link/{owner}/{repo}/workflows/build/{branch}/{artifact-name}.zip`
- For this project: `https://nightly.link/sevorl/ha-weather-forecast-card/workflows/build/feature%2Fgrouped-condition-icons/weather-forecast-card-{commitSha}.zip`

### File Naming Convention
- **Production:** `weather-forecast-card.js`
- **Development:** `weather-forecast-card-dev.js`

### Configuration
The deployment target is set up in Home Assistant to load from `x:\www\` directory, which is typically mapped to:
- `/www/` in Home Assistant's file system
- Used for custom components and cards

## Troubleshooting

### Artifact Not Found
- Verify branch name is correct: `feature/grouped-condition-icons`
- Check that the build completed successfully (status: "completed", conclusion: "success")
- Ensure commit SHA matches the build run

### Deployment Fails
- Verify `x:\www\` directory exists
- Check write permissions to `x:\` drive
- Ensure Home Assistant is not actively using the old JS file

### Changes Not Appearing
- Clear browser cache completely
- Close all Home Assistant tabs
- Reload the dashboard
- Check browser console for JavaScript errors

## Related Files
- Build config: `package.json`, `tsconfig.json`, `vitest.config.ts`, `eslint.config.js`
- Source: `src/weather-forecast-card.ts`, `src/helpers.ts`, `src/components/`
- Tests: `test/`

## Quick Reference Command

Complete deployment in one command:
```powershell
$sha = "91d03d129d6ac23fbdb2fb9d3521c8436afef8b4"; cd C:\temp; curl.exe -L -o wfc.zip "https://nightly.link/sevorl/ha-weather-forecast-card/workflows/build/feature%2Fgrouped-condition-icons/weather-forecast-card-$sha.zip"; Expand-Archive -Path wfc.zip -DestinationPath ex -Force; Copy-Item -Path ex\weather-forecast-card.js -Destination x:\www\weather-forecast-card-dev.js -Force; Test-Path x:\www\weather-forecast-card-dev.js
```
