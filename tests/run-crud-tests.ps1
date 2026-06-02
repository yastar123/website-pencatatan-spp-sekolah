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
        if ($resp.StatusCode -lt 200 -or $resp.StatusCode -ge 300) {
            Write-Host "DEBUG: $method $url -> $($resp.StatusCode) : $($content | ConvertTo-Json -Compress -ErrorAction SilentlyContinue)"
        }
        return @{status=$resp.StatusCode; content=$content}
    } catch {
        $resp = $_.Exception.Response
        if ($resp -ne $null) {
                # Support both HttpWebResponse and HttpResponseMessage
                try {
                    if ($resp -is [System.Net.Http.HttpResponseMessage]) {
                        $code = [int]$resp.StatusCode
                        try {
                            $text = $resp.Content.ReadAsStringAsync().GetAwaiter().GetResult()
                        } catch {
                            $text = 'NO_BODY: ' + $_.Exception.Message
                        }
                    } else {
                        try { $code = $resp.StatusCode.Value__ } catch { $code = $resp.StatusCode }
                        $text = $resp.GetResponseStream() | %{ new-object IO.StreamReader($_) } | foreach { $_.ReadToEnd() }
                    }
                } catch {
                    $code = 0; $text = $_.Exception.Message
                }
                try { $parsed = $text | ConvertFrom-Json -ErrorAction SilentlyContinue } catch { $parsed = $text }
                if ($code -lt 200 -or $code -ge 300) {
                    Write-Host "DEBUG: $method $url -> $code : $($parsed | ConvertTo-Json -Compress -ErrorAction SilentlyContinue)"
                }
                return @{status=$code; content=$parsed}
        }
        return @{status=0; content=$_.Exception.Message}
    }
}

# Run tests for BENDAHARA
Write-Host "\n=== Testing as BENDAHARA ===\n"
$bendahara = Login 'bendahara@sekolah.com' 'bendahara123'
if ($null -eq $bendahara) { Write-Host 'Cannot login bendahara, aborting.'; exit 1 }

# Students: GET
$r = Send 'GET' 'http://localhost:3000/api/students' $bendahara
Write-Host "GET /api/students -> $($r.status)"

# Students: POST
$newStudent = @{ nis='test' + (Get-Random -Maximum 9999); name='PS Test Student'; classId='cmpwhg2sq00062h4gpddojee3'; address='Addr'; phoneOrangTua='081'; }
$r = Send 'POST' 'http://localhost:3000/api/students' $bendahara $newStudent
Write-Host "POST /api/students -> $($r.status)"
if ($r.status -eq 201) { $sid = $r.content.id; Write-Host "Created student id=$sid" } else { $sid = $null }

# Students: PUT
if ($sid) {
    $upd = @{ nis=$newStudent.nis; name='PS Updated'; classId=$newStudent.classId; address='Updated'; phoneOrangTua='082' }
    $r = Send 'PUT' "http://localhost:3000/api/students/$sid" $bendahara $upd
    Write-Host "PUT /api/students/$sid -> $($r.status)"
}

# Students: DELETE
if ($sid) {
    $r = Send 'DELETE' "http://localhost:3000/api/students/$sid" $bendahara
    Write-Host "DELETE /api/students/$sid -> $($r.status)"
}

# Classes: GET
$r = Send 'GET' 'http://localhost:3000/api/classes' $bendahara
Write-Host "GET /api/classes -> $($r.status)"
# Classes: POST
$newClass = @{ name='PS-' + (Get-Random -Maximum 9999); academicYearId='cmpwhg2s500002h4galo7r431' }
$r = Send 'POST' 'http://localhost:3000/api/classes' $bendahara $newClass
Write-Host "POST /api/classes -> $($r.status)"

# SPP rates: GET
$r = Send 'GET' 'http://localhost:3000/api/spp-rates' $bendahara
Write-Host "GET /api/spp-rates -> $($r.status)"
# SPP rates: POST
if ($r.status -eq 200 -and $r.content.rates.Count -ge 0) {
    # use any class id from classes
    $classId = $r.content.rates[0].classId
} else {
    $classId = $newClass.id
}
if (-not $classId) { $classId = 'cmpwhg2sq00062h4gpddojee3' }
$newRate = @{ classId=$classId; academicYearId='cmpwhg2s500002h4galo7r431'; amount=12345 }
$r = Send 'POST' 'http://localhost:3000/api/spp-rates' $bendahara $newRate
Write-Host "POST /api/spp-rates -> $($r.status)"

# Academic years: GET then POST
$r = Send 'GET' 'http://localhost:3000/api/academic-years' $bendahara
Write-Host "GET /api/academic-years -> $($r.status)"
$y = (Get-Random -Minimum 3000 -Maximum 9999)
$newYear = @{ year = "$y/$($y+1)"; startDate = "$y-07-01"; endDate = "$($y+1)-06-30"; active = $false }
$r = Send 'POST' 'http://localhost:3000/api/academic-years' $bendahara $newYear
Write-Host "POST /api/academic-years -> $($r.status)"

# Payments: GET and POST
$r = Send 'GET' 'http://localhost:3000/api/payments' $bendahara
Write-Host "GET /api/payments -> $($r.status)"
# choose existing student id from payments or students
$studentId = $null
if ($r.status -eq 200 -and $r.content.payments.Count -gt 0) { $studentId = $r.content.payments[0].studentId }
if (-not $studentId) {
    $sresp = Send 'GET' 'http://localhost:3000/api/students' $bendahara
    if ($sresp.status -eq 200 -and $sresp.content.students.Count -gt 0) { $studentId = $sresp.content.students[0].id }
}
if ($studentId) {
    $newPayment = @{ studentId=$studentId; paymentType='SPP'; amount=50000; paymentMethod='Tunai'; notes='PS Test' }
    $r = Send 'POST' 'http://localhost:3000/api/payments' $bendahara $newPayment
    Write-Host "POST /api/payments -> $($r.status)"
}

# Run tests for SISWA
Write-Host "\n=== Testing as SISWA ===\n"
$siswa = Login 'sarah@sekolah.com' 'siswa123'
if ($null -eq $siswa) { Write-Host 'Cannot login siswa, aborting.'; exit 1 }

# SISWA: GET /api/payments (should show own)
$r = Send 'GET' 'http://localhost:3000/api/payments' $siswa
Write-Host "SISWA GET /api/payments -> $($r.status)"

# SISWA: attempt POST /api/students (should be 403)
$tryCreate = @{ nis='x' + (Get-Random -Maximum 9999); name='Unauthorized'; classId='cmpwhg2sq00062h4gpddojee3' }
$r = Send 'POST' 'http://localhost:3000/api/students' $siswa $tryCreate
Write-Host "SISWA POST /api/students -> $($r.status)"

# SISWA: attempt POST /api/classes (should be 403)
$r = Send 'POST' 'http://localhost:3000/api/classes' $siswa @{ name='BadCreate'; academicYearId='cmpwhg2s500002h4galo7r431' }
Write-Host "SISWA POST /api/classes -> $($r.status)"

Write-Host "\nAutomated CRUD test run complete." 
