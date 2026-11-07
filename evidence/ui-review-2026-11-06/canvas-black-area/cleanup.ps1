$root = [IO.Path]::GetFullPath($env:CUBE_AGENT_RUN_ROOT)
if (!$root.StartsWith('D:\.tmp\agents\cube-epoch\', [StringComparison]::OrdinalIgnoreCase)) { throw "Cleanup outside owned project base: $root" }
$marker = Get-Content -LiteralPath "$root\.owned.json" -Raw | ConvertFrom-Json
if ($marker.root -ne $root -or $marker.project -ne 'cube-epoch' -or $marker.id -ne (Split-Path $root -Leaf)) { throw "Ownership marker mismatch: $root" }
if (Test-Path -LiteralPath "$root\browser.log") {
  $ids = @([regex]::Matches((Get-Content -LiteralPath "$root\browser.log" -Raw), '\[pid=(\d+)\]') |
    ForEach-Object { $_.Groups[1].Value } | Sort-Object -Unique)
  $live = @(foreach ($id in $ids) { Get-Process -Id ([int]$id) -ErrorAction SilentlyContinue })
  if ($live.Count) { throw "Recorded browser parent still live; refusing cleanup $root : $($live.Id -join ',')" }
  "OWNED_BROWSER_EXIT_OK $($ids -join ',')"
}
for ($attempt = 1; $attempt -le 3; $attempt++) {
  try {
    Remove-Item -LiteralPath $root -Recurse -Force -ErrorAction Stop
    if (Test-Path -LiteralPath $root) { throw "Owned root remains: $root" }
    "OWNED_D_CLEANUP_OK $root"
    break
  } catch {
    if ($attempt -eq 3) { throw "Cleanup failed at $root : $($_.Exception.Message)" }
    Start-Sleep -Milliseconds 200
  }
}
