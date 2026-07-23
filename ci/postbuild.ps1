# Lumina CI post-build: validate with pluginval, publish log back to repo, package zip.
$ErrorActionPreference = "Continue"

Write-Output "== Downloading pluginval =="
Invoke-WebRequest -Uri "https://github.com/Tracktion/pluginval/releases/latest/download/pluginval_Windows.zip" -OutFile pluginval.zip
Expand-Archive pluginval.zip -DestinationPath pluginval -Force

Write-Output "== Running pluginval =="
& ".\pluginval\pluginval.exe" --strictness-level 10 --skip-gui-tests --verbose --validate "build\Lumina_artefacts\Release\VST3\Lumina.vst3" *>&1 | Tee-Object -FilePath pluginval-output.txt
$pv = $LASTEXITCODE
Write-Output "pluginval exit code: $pv"

Write-Output "== Publishing log back to repo =="
git config user.name "lumina-ci"
git config user.email "lumina-ci@users.noreply.github.com"
New-Item -ItemType Directory -Force -Path ci-logs | Out-Null
Copy-Item pluginval-output.txt ci-logs/pluginval.txt -Force
"exit=$pv run=$env:GITHUB_RUN_NUMBER date=$(Get-Date -Format o)" | Out-File ci-logs/status.txt -Encoding utf8
git add ci-logs/pluginval.txt ci-logs/status.txt
git commit -m "ci: pluginval log (run $env:GITHUB_RUN_NUMBER, exit $pv) [skip ci]"
git push
Write-Output "log push done"

if ($pv -ne 0) {
    Get-Content pluginval-output.txt | Select-String -Pattern "FAILED|ERROR|\*\*" | Select-Object -Last 8 | ForEach-Object { Write-Output "::error::$($_.Line)" }
    Write-Output "::error::pluginval failed with exit code $pv (full log committed to ci-logs/pluginval.txt)"
    exit 1
}

Write-Output "== Packaging =="
New-Item -ItemType Directory -Force -Path dist | Out-Null
Copy-Item -Recurse "build\Lumina_artefacts\Release\VST3\Lumina.vst3" dist\
Copy-Item "build\Lumina_artefacts\Release\Standalone\Lumina.exe" dist\
Copy-Item README.md dist\
Compress-Archive -Path dist\* -DestinationPath Lumina-Windows.zip -Force
Write-Output "packaged Lumina-Windows.zip"

# Publish a GitHub Release when the commit message contains [publish].
# Tag: v<VERSION file>.<run number>  (e.g. v1.1.7)
$msg = git log -1 --pretty=%B
if ($msg -match '\[publish\]') {
    Write-Output "== Publishing GitHub Release =="
    $ver = (Get-Content VERSION -Raw).Trim()
    $tag = "v$ver.$env:GITHUB_RUN_NUMBER"
    $hdr = git config --get http.https://github.com/.extraheader
    $auth = $hdr -replace '^AUTHORIZATION:\s*', ''
    $api = "https://api.github.com/repos/$env:GITHUB_REPOSITORY"
    $body = @{
        tag_name = $tag
        name = "Lumina $tag"
        body = "Lumina - audio visualizer plugin for Windows (VST3 + Standalone). Unzip, copy the Lumina.vst3 folder into C:\Program Files\Common Files\VST3, then rescan plugins in Ableton Live. See README.md for details."
    } | ConvertTo-Json
    try {
        $rel = Invoke-RestMethod -Uri "$api/releases" -Method Post -Headers @{ Authorization = $auth; Accept = "application/vnd.github+json" } -Body $body -ContentType "application/json"
        $upUrl = ($rel.upload_url -replace '\{.*\}$', '') + "?name=Lumina-Windows.zip"
        Invoke-RestMethod -Uri $upUrl -Method Post -Headers @{ Authorization = $auth } -ContentType "application/zip" -InFile "Lumina-Windows.zip" | Out-Null
        Write-Output "release published: $tag"
    } catch {
        Write-Output "::warning::release publish failed: $($_.Exception.Message)"
    }
}
exit 0
