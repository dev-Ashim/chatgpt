// Everything Jarvis can do on this PC. Each tool has an OpenAI-style schema
// (so the model knows how to call it) and a handler that does the work.
const { execFile } = require('child_process')
const { EventEmitter } = require('events')
const os = require('os')
const fs = require('fs')
const path = require('path')

// Timers and other things that happen later are pushed to the UI through this
const events = new EventEmitter()

// ---------- helpers ----------

function ps(script, timeout = 20000) {
    return new Promise((resolve, reject) => {
        execFile(
            'powershell.exe',
            ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script],
            { timeout, windowsHide: true, maxBuffer: 2 * 1024 * 1024 },
            (err, stdout, stderr) => {
                if (err) return reject(new Error((stderr || err.message).trim().split('\n')[0]))
                resolve(stdout.trim())
            }
        )
    })
}

// Quote a value for PowerShell (single quotes, '' escapes a quote)
const psq = (s) => `'${String(s).replace(/'/g, "''")}'`

const home = os.homedir()

function knownFolder(name) {
    const map = { home: '', desktop: 'Desktop', downloads: 'Downloads', documents: 'Documents', pictures: 'Pictures', music: 'Music', videos: 'Videos' }
    const key = name.toLowerCase()
    if (!(key in map)) return null
    if (!map[key]) return home
    // OneDrive often takes over these folders on Windows 11
    const onedrive = path.join(home, 'OneDrive', map[key])
    if (['Desktop', 'Documents', 'Pictures'].includes(map[key]) && fs.existsSync(onedrive)) return onedrive
    return path.join(home, map[key])
}

// Accepts "desktop", "downloads/foo.txt", "~/x", "%APPDATA%\\y", "D:\\z"
function resolvePath(p = '') {
    p = String(p).trim().replace(/^["']|["']$/g, '')
    if (!p) return home
    p = p.replace(/%([^%]+)%/g, (m, v) => process.env[v] ?? m)
    const [first, ...rest] = p.split(/[\\/]/)
    const folder = knownFolder(first === '~' ? 'home' : first)
    if (folder) return path.join(folder, ...rest)
    return path.resolve(home, p)
}

const EXECUTABLE = /\.(exe|bat|cmd|ps1|vbs|js|msi|scr|com|reg|lnk)$/i

const clip = (s, n = 3000) => (s.length > n ? s.slice(0, n) + `\n...[${s.length - n} more chars]` : s)

// ---------- apps ----------

const APPS = {
    notepad: 'notepad', calculator: 'calc', calc: 'calc', paint: 'mspaint',
    explorer: 'explorer', 'file explorer': 'explorer', files: 'explorer',
    cmd: 'cmd', 'command prompt': 'cmd', terminal: 'wt', powershell: 'powershell',
    'task manager': 'taskmgr', settings: 'ms-settings:', 'control panel': 'control',
    chrome: 'chrome', 'google chrome': 'chrome', edge: 'msedge', firefox: 'firefox',
    'vs code': 'code', vscode: 'code', 'visual studio code': 'code',
    word: 'winword', excel: 'excel', powerpoint: 'powerpnt', outlook: 'outlook',
    spotify: 'spotify:', camera: 'microsoft.windows.camera:', store: 'ms-windows-store:',
    'snipping tool': 'snippingtool', clock: 'ms-clock:', mail: 'outlookmail:',
}

// Process names for closing apps
const PROCS = {
    chrome: 'chrome', 'google chrome': 'chrome', edge: 'msedge', firefox: 'firefox', notepad: 'notepad',
    calculator: 'CalculatorApp', calc: 'CalculatorApp', 'vs code': 'Code', vscode: 'Code',
    'visual studio code': 'Code', spotify: 'Spotify', word: 'WINWORD', excel: 'EXCEL',
    powerpoint: 'POWERPNT', outlook: 'OUTLOOK', paint: 'mspaint', 'task manager': 'Taskmgr',
    whatsapp: 'WhatsApp', discord: 'Discord', telegram: 'Telegram', vlc: 'vlc',
}

// Never killed by close_app, even if the name matches
const PROTECTED = "'node','explorer','svchost','csrss','winlogon','lsass','services','dwm','smss','wininit','System','Idle'"

async function openApp({ name }) {
    const target = APPS[name.toLowerCase().trim()] || name
    return ps(`$t=${psq(target)}; $n=${psq(name)}
try { Start-Process $t -ErrorAction Stop; "Opened $n" }
catch {
  $a = Get-StartApps | Where-Object { $_.Name -like "*$n*" } | Select-Object -First 1
  if ($a) { Start-Process ("shell:AppsFolder\\" + $a.AppID); "Opened " + $a.Name }
  else { throw "Couldn't find an app called $n" }
}`)
}

async function closeApp({ name }) {
    const proc = PROCS[name.toLowerCase().trim()] || name
    return ps(`$n=${psq(name)}
$p = Get-Process -Name ${psq(proc)} -ErrorAction SilentlyContinue
if (!$p) { $p = Get-Process | Where-Object { $_.MainWindowTitle -and ($_.ProcessName -like "*$n*" -or $_.MainWindowTitle -like "*$n*") } }
$p = $p | Where-Object { @(${PROTECTED}) -notcontains $_.ProcessName }
if (!$p) { throw "No running app matches $n" }
$names = ($p | Select-Object -ExpandProperty ProcessName -Unique) -join ', '
$p | Stop-Process -Force
"Closed $names"`)
}

// ---------- web ----------

async function openUrl({ url }) {
    let u = String(url).trim()
    if (!/^https?:\/\//i.test(u)) u = 'https://' + u
    if (!/^https?:\/\/[^\s]+$/i.test(u)) throw new Error('That is not a valid web address')
    await ps(`Start-Process ${psq(u)}`)
    return `Opened ${u}`
}

const SEARCH = {
    google: 'https://www.google.com/search?q=',
    youtube: 'https://www.youtube.com/results?search_query=',
    wikipedia: 'https://en.wikipedia.org/w/index.php?search=',
    maps: 'https://www.google.com/maps/search/',
    github: 'https://github.com/search?q=',
    amazon: 'https://www.amazon.in/s?k=',
    images: 'https://www.google.com/search?tbm=isch&q=',
}

async function searchWeb({ query, site = 'google' }) {
    const base = SEARCH[site] || SEARCH.google
    await openUrl({ url: base + encodeURIComponent(query) })
    return `Opened ${site} results for "${query}" in the browser`
}

async function playYoutube({ query }) {
    let url = SEARCH.youtube + encodeURIComponent(query)
    try {
        const res = await fetch(url, { headers: { 'Accept-Language': 'en' }, signal: AbortSignal.timeout(8000) })
        const id = (await res.text()).match(/"videoId":"([\w-]{11})"/)
        if (id) url = 'https://www.youtube.com/watch?v=' + id[1]
    } catch { /* fall back to the results page */ }
    await openUrl({ url })
    return url.includes('watch?v=') ? `Playing "${query}" on YouTube` : `Opened YouTube results for "${query}"`
}

async function getWeather({ city = '' }) {
    const res = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=j1`, { signal: AbortSignal.timeout(10000) })
    if (!res.ok) throw new Error('Weather service unavailable')
    const d = await res.json()
    const now = d.current_condition[0]
    const today = d.weather[0]
    const place = d.nearest_area?.[0]?.areaName?.[0]?.value || city
    return `${place}: ${now.weatherDesc[0].value}, ${now.temp_C}°C (feels ${now.FeelsLikeC}°C), humidity ${now.humidity}%. Today ${today.mintempC}–${today.maxtempC}°C.`
}

// ---------- system ----------

async function systemStatus() {
    const raw = await ps(`$c=(Get-CimInstance Win32_Processor | Measure-Object -Property LoadPercentage -Average).Average
$b=Get-CimInstance Win32_Battery | Select-Object -First 1
$d=Get-PSDrive -PSProvider FileSystem | Where-Object { $_.Used -ne $null } | ForEach-Object { "{0}: {1:N0} GB free of {2:N0} GB" -f $_.Name, ($_.Free/1GB), (($_.Used+$_.Free)/1GB) }
[pscustomobject]@{cpu=$c; battery=$b.EstimatedChargeRemaining; charging=($b.BatteryStatus -eq 2); disks=($d -join '; ')} | ConvertTo-Json -Compress`)
    const s = JSON.parse(raw)
    const gb = (n) => (n / 1024 ** 3).toFixed(1)
    const up = os.uptime()
    return [
        `CPU load ${s.cpu}%`,
        `RAM ${gb(os.totalmem() - os.freemem())} of ${gb(os.totalmem())} GB used`,
        s.battery != null ? `Battery ${s.battery}%${s.charging ? ' (charging)' : ''}` : 'No battery (desktop)',
        `Disks: ${s.disks}`,
        `Uptime ${Math.floor(up / 3600)}h ${Math.floor((up % 3600) / 60)}m`,
    ].join('. ')
}

const keys = (code, n = 1) => `$w=New-Object -ComObject WScript.Shell; 1..${n} | ForEach-Object { $w.SendKeys([char]${code}) }`

async function volume({ action, level, steps = 5 }) {
    if (action === 'mute') { await ps(keys(173)); return 'Toggled mute' }
    if (action === 'up') { await ps(keys(175, steps)); return `Volume up by about ${steps * 2}%` }
    if (action === 'down') { await ps(keys(174, steps)); return `Volume down by about ${steps * 2}%` }
    if (action === 'set') {
        const l = Math.max(0, Math.min(100, Number(level) || 0))
        await ps(keys(174, 50) + '; ' + (l ? keys(175, Math.round(l / 2)) : ''))
        return `Volume set to about ${l}%`
    }
    throw new Error('Unknown volume action')
}

async function media({ action }) {
    const code = { play_pause: 179, next: 176, previous: 177, stop: 178 }[action]
    if (!code) throw new Error('Unknown media action')
    await ps(keys(code))
    return `Media: ${action.replace('_', '/')}`
}

async function screenshot() {
    const dir = path.join(knownFolder('pictures'), 'Jarvis')
    fs.mkdirSync(dir, { recursive: true })
    const file = path.join(dir, `screenshot-${new Date().toISOString().replace(/[:.]/g, '-')}.png`)
    await ps(`Add-Type -AssemblyName System.Windows.Forms,System.Drawing
$b=[System.Windows.Forms.SystemInformation]::VirtualScreen
$bmp=New-Object System.Drawing.Bitmap $b.Width,$b.Height
$g=[System.Drawing.Graphics]::FromImage($bmp)
$g.CopyFromScreen($b.Left,$b.Top,0,0,$bmp.Size)
$bmp.Save(${psq(file)}, [System.Drawing.Imaging.ImageFormat]::Png)
$g.Dispose(); $bmp.Dispose()`)
    return `Screenshot saved to ${file}`
}

async function lockPc() {
    await ps('rundll32.exe user32.dll,LockWorkStation')
    return 'PC locked'
}

async function power({ action }) {
    const cmd = {
        shutdown: 'shutdown /s /t 10',
        restart: 'shutdown /r /t 10',
        sleep: 'rundll32.exe powrprof.dll,SetSuspendState 0,1,0',
        cancel: 'shutdown /a',
    }[action]
    if (!cmd) throw new Error('Unknown power action')
    await ps(cmd)
    return action === 'cancel' ? 'Cancelled the pending shutdown' : `${action} started${action === 'sleep' ? '' : ' (10 second delay, say "cancel shutdown" to stop it)'}`
}

// ---------- files ----------

async function listFiles({ path: p }) {
    const dir = resolvePath(p)
    const items = fs.readdirSync(dir, { withFileTypes: true })
    const names = items.slice(0, 100).map((d) => (d.isDirectory() ? d.name + '/' : d.name))
    return `${dir} (${items.length} items):\n${names.join('\n')}${items.length > 100 ? '\n...' : ''}`
}

async function findFiles({ name, path: p }) {
    const dir = resolvePath(p)
    const out = await ps(`Get-ChildItem -Path ${psq(dir)} -Recurse -Depth 5 -Filter ${psq('*' + name + '*')} -ErrorAction SilentlyContinue | Select-Object -First 25 -ExpandProperty FullName`, 40000)
    return out || `Nothing matching "${name}" under ${dir}`
}

async function readFile({ path: p }) {
    const file = resolvePath(p)
    const { size } = fs.statSync(file)
    if (size > 2 * 1024 * 1024) throw new Error('File is larger than 2 MB')
    return clip(fs.readFileSync(file, 'utf8'), 6000)
}

async function writeFile({ path: p, content, append = false }) {
    const file = resolvePath(p)
    fs.mkdirSync(path.dirname(file), { recursive: true })
    append ? fs.appendFileSync(file, content) : fs.writeFileSync(file, content)
    return `${append ? 'Appended to' : 'Wrote'} ${file}`
}

async function openPath({ path: p }) {
    const target = resolvePath(p)
    if (!fs.existsSync(target)) throw new Error(`${target} does not exist`)
    await ps(`Start-Process ${psq(target)}`)
    return `Opened ${target}`
}

async function clipboard({ action, text = '' }) {
    if (action === 'get') return clip((await ps('Get-Clipboard -Raw')) || '(clipboard is empty)')
    await ps(`Set-Clipboard -Value ${psq(text)}`)
    return 'Copied to clipboard'
}

async function runCommand({ command }) {
    const out = await ps(command, 60000)
    return clip(out || '(command finished with no output)')
}

function setTimer({ minutes = 0, seconds = 0, message = 'Timer done' }) {
    const ms = (Number(minutes) * 60 + Number(seconds)) * 1000
    if (!(ms > 0)) throw new Error('Give a duration in minutes or seconds')
    setTimeout(() => events.emit('event', { type: 'reminder', text: message }), ms)
    return `Timer set for ${minutes ? minutes + ' min ' : ''}${seconds ? seconds + ' sec' : ''}`.trim()
}

// ---------- registry ----------

const fn = (name, description, properties = {}, required = []) => ({
    type: 'function',
    function: { name, description, parameters: { type: 'object', properties, required } },
})
const str = (description, extra = {}) => ({ type: 'string', description, ...extra })

const TOOLS = {
    open_app: [openApp, fn('open_app', 'Open an application by name (e.g. chrome, notepad, spotify, vs code, whatsapp, settings).', { name: str('App name') }, ['name'])],
    close_app: [closeApp, fn('close_app', 'Close a running application.', { name: str('App name') }, ['name'])],
    open_url: [openUrl, fn('open_url', 'Open a website in the default browser.', { url: str('URL or domain') }, ['url'])],
    search_web: [searchWeb, fn('search_web', 'Open a search in the browser.', { query: str('Search text'), site: str('Where to search', { enum: Object.keys(SEARCH) }) }, ['query'])],
    play_youtube: [playYoutube, fn('play_youtube', 'Find and play a song or video on YouTube.', { query: str('Song or video to play') }, ['query'])],
    get_weather: [getWeather, fn('get_weather', 'Current weather and today\'s forecast. Leave city empty for the user\'s location.', { city: str('City name') })],
    system_status: [systemStatus, fn('system_status', 'CPU, RAM, battery, disk space and uptime of this PC.')],
    volume: [volume, fn('volume', 'Change system volume.', { action: str('What to do', { enum: ['up', 'down', 'mute', 'set'] }), level: { type: 'number', description: 'Target 0-100 for set' }, steps: { type: 'number', description: 'For up/down, each step is about 2%. Default 5' } }, ['action'])],
    media: [media, fn('media', 'Control whatever media is playing.', { action: str('Media key', { enum: ['play_pause', 'next', 'previous', 'stop'] }) }, ['action'])],
    screenshot: [screenshot, fn('screenshot', 'Take a screenshot and save it to Pictures/Jarvis.')],
    lock_pc: [lockPc, fn('lock_pc', 'Lock the computer.')],
    power: [power, fn('power', 'Shut down, restart, sleep, or cancel a pending shutdown.', { action: str('Power action', { enum: ['shutdown', 'restart', 'sleep', 'cancel'] }) }, ['action'])],
    list_files: [listFiles, fn('list_files', 'List a folder. Accepts desktop, downloads, documents, pictures, music, videos, or a full path.', { path: str('Folder') })],
    find_files: [findFiles, fn('find_files', 'Search for files by name inside a folder (default: home).', { name: str('Part of the file name'), path: str('Folder to search') }, ['name'])],
    read_file: [readFile, fn('read_file', 'Read a text file.', { path: str('File path') }, ['path'])],
    write_file: [writeFile, fn('write_file', 'Create or overwrite a text file (or append).', { path: str('File path, e.g. desktop/notes.txt'), content: str('Text to write'), append: { type: 'boolean' } }, ['path', 'content'])],
    open_path: [openPath, fn('open_path', 'Open a file or folder with its default program.', { path: str('File or folder path') }, ['path'])],
    clipboard: [clipboard, fn('clipboard', 'Read or set the clipboard.', { action: str('get or set', { enum: ['get', 'set'] }), text: str('Text for set') }, ['action'])],
    set_timer: [setTimer, fn('set_timer', 'Set a timer or reminder; Jarvis speaks the message when it ends.', { minutes: { type: 'number' }, seconds: { type: 'number' }, message: str('What to say when it ends') })],
    run_command: [runCommand, fn('run_command', 'Run a PowerShell command on this PC and return its output. Use when no other tool fits.', { command: str('PowerShell command') }, ['command'])],
}

const schemas = Object.values(TOOLS).map(([, schema]) => schema)

// Actions that need the user to click/say "yes" first
function needsConfirm(name, args) {
    if (['run_command', 'write_file', 'close_app'].includes(name)) return true
    if (name === 'power') return args.action !== 'cancel'
    if (name === 'open_path') return EXECUTABLE.test(String(args.path || ''))
    if (name === 'open_app') return /[\\/]/.test(String(args.name || ''))
    return false
}

function describe(name, args) {
    switch (name) {
        case 'run_command': return `run this command: ${args.command}`
        case 'write_file': return `${args.append ? 'append to' : 'write'} the file ${resolvePath(args.path)}`
        case 'close_app': return `close ${args.name}`
        case 'power': return `${args.action} the PC`
        case 'open_path': return `run ${resolvePath(args.path)}`
        case 'open_app': return `launch ${args.name}`
        default: return `${name} ${JSON.stringify(args)}`
    }
}

async function runTool(name, args) {
    const tool = TOOLS[name]
    if (!tool) throw new Error(`Unknown tool ${name}`)
    return String(await tool[0](args || {}))
}

module.exports = { schemas, runTool, needsConfirm, describe, events }
