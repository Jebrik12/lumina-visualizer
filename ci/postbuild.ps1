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
exit 0
