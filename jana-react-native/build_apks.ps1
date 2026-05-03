# Build script for Jana AI APKs
$ErrorActionPreference = "Stop"

Write-Host "Starting Jana AI APK Build Process..." -ForegroundColor Cyan

# Set environment variables for build
$env:JAVA_HOME = "C:\Program Files\Java\jdk-21"
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:PATH = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:ANDROID_HOME\tools;$env:PATH"
$env:API_URL = "http://192.168.0.100:3005"

Write-Host "Using JAVA_HOME: $env:JAVA_HOME" -ForegroundColor Gray

function Clean-Android {
    if (Test-Path "android") { 
        Write-Host "Cleaning android directory..." -ForegroundColor Gray
        try { Stop-Process -Name "java" -Force -ErrorAction SilentlyContinue } catch {}
        Start-Sleep -Seconds 2
        Remove-Item -Recurse -Force "android" -ErrorAction SilentlyContinue
        if (Test-Path "android") { cmd /c "rmdir /s /q android" 2>$null }
    }
}

# Build Member Mode
Write-Host "`n[1/2] Building Jana AI - Member Mode..." -ForegroundColor Yellow
$env:APP_VARIANT="member"
Clean-Android
npx expo prebuild --platform android --no-install
# Inject Cleartext Traffic Permission
$manifestPath = "android/app/src/main/AndroidManifest.xml"
(Get-Content $manifestPath) -replace '<application', '<application android:usesCleartextTraffic="true"' | Set-Content $manifestPath

cd android
.\gradlew.bat assembleRelease
cd ..
Copy-Item "android/app/build/outputs/apk/release/app-release.apk" "jana_member.apk"
Write-Host "Member APK generated: jana_member.apk" -ForegroundColor Green

# Build Associate Mode
Write-Host "`n[2/2] Building Jana AI - Associate Mode..." -ForegroundColor Yellow
$env:APP_VARIANT="associate"
Clean-Android
npx expo prebuild --platform android --no-install
# Inject Cleartext Traffic Permission
$manifestPath = "android/app/src/main/AndroidManifest.xml"
(Get-Content $manifestPath) -replace '<application', '<application android:usesCleartextTraffic="true"' | Set-Content $manifestPath

cd android
.\gradlew.bat assembleRelease
cd ..
Copy-Item "android/app/build/outputs/apk/release/app-release.apk" "jana_associate.apk"
Write-Host "Associate APK generated: jana_associate.apk" -ForegroundColor Green

Write-Host "`nBuild complete! APKs are ready in the root folder." -ForegroundColor Cyan
