function Login($email, $password) {
    $body = (@{email=$email; password=$password} | ConvertTo-Json -Compress)
    $session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
    try {
        $resp = Invoke-WebRequest -Uri 'http://localhost:3000/api/auth/login' -Method Post -Body $body -ContentType 'application/json' -WebSession $session -ErrorAction Stop
        Write-Host "Login ${email}: HTTP $($resp.StatusCode)"
        return $session
    } catch {
        Write-Host "Login ${email} failed: $($_.Exception.Message)"
        return $null
    }
}

function Send($method, $url, $session, $body=$null) {
    try {
        if ($body -ne $null) { $b = $body | ConvertTo-Json -Compress } else { $b = $null }
        $resp = Invoke-WebRequest -Uri $url -Method $method -Body $b -ContentType 'application/json' -WebSession $session -ErrorAction Stop
        $content = $resp.Content | ConvertFrom-Json -ErrorAction SilentlyContinue
        return @{status=$resp.StatusCode; content=$content}
    } catch {
        $resp = $_.Exception.Response
        if ($resp -ne $null) {
                try {
                    if ($resp -is [System.Net.Http.HttpResponseMessage]) {
                        $code = [int]$resp.StatusCode
                        try { $text = $resp.Content.ReadAsStringAsync().GetAwaiter().GetResult() } catch { $text = 'NO_BODY: ' + $_.Exception.Message }
                    } else {
                        try { $code = $resp.StatusCode.Value__ } catch { $code = $resp.StatusCode }
                        $text = $resp.GetResponseStream() | %{ new-object IO.StreamReader($_) } | foreach { $_.ReadToEnd() }
                    }
                } catch { $code = 0; $text = $_.Exception.Message }
                try { $parsed = $text | ConvertFrom-Json -ErrorAction SilentlyContinue } catch { $parsed = $text }
                return @{status=$code; content=$parsed}
        }
        return @{status=0; content=$_.Exception.Message}
    }
}

$b = Login 'bendahara@sekolah.com' 'bendahara123'
if ($null -eq $b) { Write-Host 'Cannot login bendahara, aborting.'; exit 1 }

$r = Send 'GET' 'http://localhost:3000/api/reports/detail' $b
Write-Host "GET /api/reports/detail -> $($r.status)"
Write-Host ($r.content.rows | ConvertTo-Json -Compress)
