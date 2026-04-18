
$filePath = "src/app/page.js"
$content = Get-Content $filePath
$newContent = @()

for ($i = 0; $i -lt $content.Length; $i++) {
    $line = $content[$i]
    $newContent += $line
    
    # Inject the missing </div> after the history block closing (around line 723)
    if ($i + 1 -eq 723 -and $line -match "^\s*\}\)\s*$") {
        Write-Host "Surgically injected missing </div> at line 724"
        $newContent += "                </div>"
    }
}

$newContent | Set-Content $filePath
