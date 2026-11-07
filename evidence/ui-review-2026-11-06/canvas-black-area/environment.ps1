param([ValidatePattern('^[a-zA-Z0-9-]+$')][string]$Tag = 'canvas-probe')
$id = "$Tag-$([guid]::NewGuid().ToString('N'))"
$env:CUBE_AGENT_RUN_ROOT = "D:\.tmp\agents\cube-epoch\$id"
$env:TEMP = "$env:CUBE_AGENT_RUN_ROOT\tmp"
$env:TMP = $env:TEMP
$env:TMPDIR = $env:TEMP
New-Item -ItemType Directory -Path $env:TEMP -Force | Out-Null
@{ id = $id; root = $env:CUBE_AGENT_RUN_ROOT; project = 'cube-epoch' } | ConvertTo-Json |
  Set-Content -LiteralPath "$env:CUBE_AGENT_RUN_ROOT\.owned.json" -Encoding utf8
$bins = node -e "const p=require('playwright-core');console.log(JSON.stringify({chromium:p.chromium.executablePath(),webkit:p.webkit.executablePath()}));" | ConvertFrom-Json
if ($LASTEXITCODE -ne 0 -or !(Test-Path -LiteralPath $bins.chromium) -or !(Test-Path -LiteralPath $bins.webkit)) { throw 'Existing browser binaries unavailable' }
$env:PLAYWRIGHT_CHROMIUM_EXECUTABLE = $bins.chromium
$env:PLAYWRIGHT_WEBKIT_EXECUTABLE = $bins.webkit
$env:PLAYWRIGHT_BROWSERS_PATH = "$env:CUBE_AGENT_RUN_ROOT\browser-cache"
$env:npm_config_cache = "$env:CUBE_AGENT_RUN_ROOT\npm-cache"
$env:XDG_CACHE_HOME = "$env:CUBE_AGENT_RUN_ROOT\tool-cache"
$env:LOCALAPPDATA = "$env:CUBE_AGENT_RUN_ROOT\localappdata"
$env:APPDATA = "$env:CUBE_AGENT_RUN_ROOT\appdata"
foreach ($p in @($env:PLAYWRIGHT_BROWSERS_PATH,$env:npm_config_cache,$env:XDG_CACHE_HOME,$env:LOCALAPPDATA,$env:APPDATA)) {
  New-Item -ItemType Directory -Path $p -Force | Out-Null
}
node -e "const a=require('node:assert/strict'),p=require('node:path'),o=require('node:os');const root=p.resolve(process.env.CUBE_AGENT_RUN_ROOT);for(const k of ['TEMP','TMP','TMPDIR','LOCALAPPDATA','APPDATA','PLAYWRIGHT_BROWSERS_PATH','npm_config_cache','XDG_CACHE_HOME'])a.ok(p.resolve(process.env[k]).startsWith(root+p.sep),k);a.equal(o.tmpdir(),process.env.TEMP);console.log('OWNED_D_ENV_OK '+JSON.stringify({root,tmp:o.tmpdir(),binaries:'existing C installation read-only, no install'}));"
if ($LASTEXITCODE -ne 0) { throw 'Owned D path validation failed' }
