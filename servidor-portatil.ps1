$ErrorActionPreference = 'Stop'

$Root = [System.IO.Path]::GetFullPath((Split-Path -Parent $MyInvocation.MyCommand.Path))
$Port = 5173
$HostAddress = [System.Net.IPAddress]::Loopback

function Get-MimeType([string]$Path) {
    switch ([System.IO.Path]::GetExtension($Path).ToLowerInvariant()) {
        '.html' { 'text/html; charset=utf-8' }
        '.htm'  { 'text/html; charset=utf-8' }
        '.js'   { 'text/javascript; charset=utf-8' }
        '.mjs'  { 'text/javascript; charset=utf-8' }
        '.css'  { 'text/css; charset=utf-8' }
        '.json' { 'application/json; charset=utf-8' }
        '.png'  { 'image/png' }
        '.jpg'  { 'image/jpeg' }
        '.jpeg' { 'image/jpeg' }
        '.webp' { 'image/webp' }
        '.gif'  { 'image/gif' }
        '.svg'  { 'image/svg+xml' }
        '.ico'  { 'image/x-icon' }
        '.mp3'  { 'audio/mpeg' }
        '.wav'  { 'audio/wav' }
        '.ogg'  { 'audio/ogg' }
        '.fbx'  { 'application/octet-stream' }
        default { 'application/octet-stream' }
    }
}

function Write-Ascii([System.Net.Sockets.NetworkStream]$Stream, [string]$Text) {
    $bytes = [System.Text.Encoding]::ASCII.GetBytes($Text)
    $Stream.Write($bytes, 0, $bytes.Length)
}

function Resolve-RequestPath([string]$UrlPath) {
    if ([string]::IsNullOrWhiteSpace($UrlPath) -or $UrlPath -eq '/') {
        return Join-Path $Root 'index.html'
    }

    $q = $UrlPath.IndexOf('?')
    if ($q -ge 0) { $UrlPath = $UrlPath.Substring(0, $q) }

    $decoded = [System.Uri]::UnescapeDataString($UrlPath)
    $decoded = $decoded.Replace([char]'/', [char][System.IO.Path]::DirectorySeparatorChar).TrimStart([char[]]@('/', '\'))

    # O Vite expunha /public como raiz. Este alias reproduz esse comportamento.
    if ($decoded -like ('assets' + [System.IO.Path]::DirectorySeparatorChar + '*')) {
        $relativeAsset = $decoded.Substring(('assets' + [System.IO.Path]::DirectorySeparatorChar).Length)
        $candidate = Join-Path (Join-Path $Root 'public\assets') $relativeAsset
    } else {
        $candidate = Join-Path $Root $decoded
    }

    $full = [System.IO.Path]::GetFullPath($candidate)
    if (-not $full.StartsWith($Root, [System.StringComparison]::OrdinalIgnoreCase)) {
        return $null
    }
    return $full
}

function Handle-Client([System.Net.Sockets.TcpClient]$Client) {
    $stream = $null
    $file = $null
    try {
        $Client.ReceiveTimeout = 15000
        $Client.SendTimeout = 30000
        $stream = $Client.GetStream()
        $reader = [System.IO.StreamReader]::new($stream, [System.Text.Encoding]::ASCII, $false, 4096, $true)

        $requestLine = $reader.ReadLine()
        if ([string]::IsNullOrWhiteSpace($requestLine)) { return }

        $headers = @{}
        while ($true) {
            $line = $reader.ReadLine()
            if ($null -eq $line -or $line -eq '') { break }
            $colon = $line.IndexOf(':')
            if ($colon -gt 0) {
                $name = $line.Substring(0, $colon).Trim().ToLowerInvariant()
                $value = $line.Substring($colon + 1).Trim()
                $headers[$name] = $value
            }
        }

        $parts = $requestLine.Split(' ')
        if ($parts.Length -lt 2) { return }
        $method = $parts[0].ToUpperInvariant()
        $urlPath = $parts[1]

        if ($method -ne 'GET' -and $method -ne 'HEAD') {
            Write-Ascii $stream "HTTP/1.1 405 Method Not Allowed`r`nConnection: close`r`nContent-Length: 0`r`n`r`n"
            return
        }

        $path = Resolve-RequestPath $urlPath
        if ($null -eq $path -or -not (Test-Path -LiteralPath $path -PathType Leaf)) {
            $body = [System.Text.Encoding]::UTF8.GetBytes('Arquivo nao encontrado.')
            Write-Ascii $stream "HTTP/1.1 404 Not Found`r`nContent-Type: text/plain; charset=utf-8`r`nContent-Length: $($body.Length)`r`nConnection: close`r`n`r`n"
            if ($method -ne 'HEAD') { $stream.Write($body, 0, $body.Length) }
            return
        }

        $file = [System.IO.File]::Open($path, [System.IO.FileMode]::Open, [System.IO.FileAccess]::Read, [System.IO.FileShare]::ReadWrite)
        $length = $file.Length
        $start = [int64]0
        $end = [int64]($length - 1)
        $status = '200 OK'

        if ($headers.ContainsKey('range') -and $headers['range'] -match '^bytes=(\d*)-(\d*)') {
            $a = $Matches[1]
            $b = $Matches[2]
            if ($a -ne '') { $start = [int64]$a }
            if ($b -ne '') { $end = [int64]$b }
            if ($a -eq '' -and $b -ne '') {
                $suffix = [int64]$b
                $start = [Math]::Max([int64]0, $length - $suffix)
                $end = $length - 1
            }
            if ($start -ge $length -or $start -lt 0 -or $end -lt $start) {
                Write-Ascii $stream "HTTP/1.1 416 Range Not Satisfiable`r`nContent-Range: bytes */$length`r`nConnection: close`r`nContent-Length: 0`r`n`r`n"
                return
            }
            if ($end -ge $length) { $end = $length - 1 }
            $status = '206 Partial Content'
        }

        $contentLength = $end - $start + 1
        $mime = Get-MimeType $path
        $headerText = "HTTP/1.1 $status`r`n" +
                      "Content-Type: $mime`r`n" +
                      "Content-Length: $contentLength`r`n" +
                      "Accept-Ranges: bytes`r`n" +
                      "Cache-Control: no-cache`r`n" +
                      "Connection: close`r`n"
        if ($status.StartsWith('206')) {
            $headerText += "Content-Range: bytes $start-$end/$length`r`n"
        }
        $headerText += "`r`n"
        Write-Ascii $stream $headerText

        if ($method -eq 'HEAD') { return }

        $file.Seek($start, [System.IO.SeekOrigin]::Begin) | Out-Null
        $buffer = [byte[]]::new(65536)
        $remaining = $contentLength
        while ($remaining -gt 0) {
            $toRead = [int][Math]::Min([int64]$buffer.Length, $remaining)
            $read = $file.Read($buffer, 0, $toRead)
            if ($read -le 0) { break }
            $stream.Write($buffer, 0, $read)
            $remaining -= $read
        }
    }
    catch {
        # Requisicoes canceladas pelo navegador sao normais (principalmente audio).
    }
    finally {
        if ($null -ne $file) { $file.Dispose() }
        if ($null -ne $stream) { $stream.Dispose() }
        $Client.Close()
    }
}

$listener = [System.Net.Sockets.TcpListener]::new($HostAddress, $Port)
try {
    $listener.Start()
} catch {
    Write-Host ''
    Write-Host "Nao foi possivel usar a porta $Port." -ForegroundColor Red
    Write-Host 'Feche outra copia do jogo e tente novamente.' -ForegroundColor Yellow
    exit 1
}

$url = "http://127.0.0.1:$Port/"
Write-Host "You Dance v2.17 iniciado em $url" -ForegroundColor Green
Write-Host 'Esta versao nao usa Node.js nem npm.' -ForegroundColor Cyan
Write-Host 'Mantenha esta janela aberta enquanto estiver jogando.' -ForegroundColor Yellow
Write-Host 'Para encerrar: feche esta janela ou pressione Ctrl+C.' -ForegroundColor DarkGray

Start-Sleep -Milliseconds 350
Start-Process $url

try {
    while ($true) {
        $client = $listener.AcceptTcpClient()
        Handle-Client $client
    }
}
finally {
    $listener.Stop()
}
