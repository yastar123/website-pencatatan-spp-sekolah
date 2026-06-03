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

# pick a student
$sresp = Send 'GET' 'http://localhost:3000/api/students?page=1' $b
if ($sresp.status -ne 200 -or $sresp.content.students.Count -eq 0) { Write-Host 'No students found, aborting.'; exit 1 }
$studentId = $sresp.content.students[0].id
Write-Host "Using student: $studentId"

# Create two debts (MENUNGGAK)
$debt1 = @{ studentId=$studentId; paymentType='SPP'; amount=100000; paymentMethod='Tunai'; status='MENUNGGAK'; notes='Debt OLD' }
$r1 = Send 'POST' 'http://localhost:3000/api/payments' $b $debt1
Write-Host "Create debt1 -> $($r1.status)"
Start-Sleep -Seconds 1
$debt2 = @{ studentId=$studentId; paymentType='SPP'; amount=50000; paymentMethod='Tunai'; status='MENUNGGAK'; notes='Debt NEW' }
$r2 = Send 'POST' 'http://localhost:3000/api/payments' $b $debt2
Write-Host "Create debt2 -> $($r2.status)"

if ($r1.status -ne 201 -or $r2.status -ne 201) { Write-Host 'Failed to create debts'; exit 1 }
$oldDebtId = $r1.content.id
$newDebtId = $r2.content.id
Write-Host "Old debt id: $oldDebtId, New debt id: $newDebtId"

# Now make a successful payment that should close the oldest debt first (100000)
$pay = @{ studentId=$studentId; paymentType='SPP'; amount=100000; paymentMethod='Tunai'; status='BERHASIL'; notes='Pay to close oldest' }
$rpay = Send 'POST' 'http://localhost:3000/api/payments' $b $pay
Write-Host "Payment POST -> $($rpay.status)"
Write-Host "Payment response closedDebts: $($rpay.content.closedDebts | ConvertTo-Json -Compress)"

# Verify the old debt is closed (deleted) and new debt still exists
$check = Send 'GET' "http://localhost:3000/api/payments?studentId=$studentId&status=MENUNGGAK&page=1&paymentType=SPP" $b
Write-Host "Remaining debts (MENUNGGAK) -> $($check.status): $($check.content.payments | ConvertTo-Json -Compress)"

Write-Host "FIFO test complete."