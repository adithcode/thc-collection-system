
$filePath = "src/app/page.js"
$content = Get-Content $filePath
$newContent = @()

for ($i = 0; $i -lt $content.Length; $i++) {
    $lineNum = $i + 1
    # Skip line 678 if it contains a closing div tag
    if ($lineNum -eq 678 -and $content[$i] -match "^\s*</div>\s*$") {
        Write-Host "Surgically removed stray tag at line 678"
        continue
    }
    $newContent += $content[$i]
}

$newContent | Set-Content $filePath
