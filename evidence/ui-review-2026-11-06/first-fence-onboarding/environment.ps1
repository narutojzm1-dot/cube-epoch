$run = 'D:\work\tmp\cube-epoch\first-fence-790cd307'
$env:TEMP = "$run\tmp"
$env:TMP = $env:TEMP
$env:TMPDIR = $env:TEMP
New-Item -ItemType Directory -Path $env:TEMP -Force | Out-Null
$executables = node -e "const p=require('playwright-core'); console.log(JSON.stringify({chromium:p.chromium.executablePath(),webkit:p.webkit.executablePath()}));" | ConvertFrom-Json
if ($LASTEXITCODE -ne 0) { throw 'Cannot resolve installed browser executables' }
if (!(Test-Path -LiteralPath $executables.chromium) -or !(Test-Path -LiteralPath $executables.webkit)) { throw 'Existing browser executable missing' }
$env:PLAYWRIGHT_CHROMIUM_EXECUTABLE = $executables.chromium
$env:PLAYWRIGHT_WEBKIT_EXECUTABLE = $executables.webkit
$env:PLAYWRIGHT_BROWSERS_PATH = "$run\browser-cache"
$env:npm_config_cache = "$run\npm-cache"
$env:XDG_CACHE_HOME = "$run\tool-cache"
$env:LOCALAPPDATA = "$run\localappdata"
$env:APPDATA = "$run\appdata"
foreach ($path in @($env:PLAYWRIGHT_BROWSERS_PATH, $env:npm_config_cache, $env:XDG_CACHE_HOME, $env:LOCALAPPDATA, $env:APPDATA)) {
  New-Item -ItemType Directory -Path $path -Force | Out-Null
}
node -e "const a=require('node:assert/strict'),os=require('node:os'),fs=require('node:fs'),path=require('node:path');const root='D:\\work\\tmp\\cube-epoch\\first-fence-790cd307';for(const k of ['TEMP','TMP','TMPDIR','PLAYWRIGHT_BROWSERS_PATH','npm_config_cache','XDG_CACHE_HOME','LOCALAPPDATA','APPDATA'])a.ok(path.resolve(process.env[k]).startsWith(root+path.sep),k);a.equal(os.tmpdir(),process.env.TEMP);const probe=path.join(os.tmpdir(),'path-probe.txt');fs.writeFileSync(probe,'D');a.equal(fs.readFileSync(probe,'utf8'),'D');fs.unlinkSync(probe);console.log('D_ENV_OK '+JSON.stringify({tmp:os.tmpdir(),chromium:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,webkit:process.env.PLAYWRIGHT_WEBKIT_EXECUTABLE,browser_binaries:'existing read-only installation; no install'}));"
if ($LASTEXITCODE -ne 0) { throw 'D environment validation failed' }
