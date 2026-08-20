# SSPACIA USB DSC Cryptographic Signer (PowerShell .NET Bridge)
# Interacts with ProxKey / Watchdata / ePass2003 USB Tokens via Windows CryptoAPI
param (
    [string]$PdfPath,
    [string]$OutputPath,
    [string]$SignerCN = "PRAVEEN DILIPKUMAR AGARWAL",
    [string]$Reason = "Invoice Authorization",
    [string]$Location = "Ahmedabad, India"
)

Add-Type -AssemblyName System.Security

try {
    # 1. Open CurrentUser\My certificate store (where ProxKey registers certificates)
    $store = New-Object System.Security.Cryptography.X509Certificates.X509Store("My", "CurrentUser")
    $store.Open([System.Security.Cryptography.X509Certificates.OpenFlags]::ReadOnly)

    $certs = $store.Certificates | Where-Object { 
        $_.HasPrivateKey -and ($_.Subject -like "*$SignerCN*" -or $_.FriendlyName -like "*$SignerCN*")
    }

    if ($certs.Count -eq 0) {
        # Fallback: search for any certificate with a private key (USB token)
        $certs = $store.Certificates | Where-Object { $_.HasPrivateKey }
    }

    if ($certs.Count -eq 0) {
        Write-Error "No USB DSC Certificate found. Please ensure ProxKey token is inserted."
        exit 1
    }

    $selectedCert = $certs[0]
    $subjectName = $selectedCert.Subject
    Write-Host "[USB_DSC] Found Certificate: $subjectName"

    # 2. Read PDF Bytes
    if (-not (Test-Path $PdfPath)) {
        Write-Error "PDF file not found at: $PdfPath"
        exit 1
    }

    $pdfBytes = [System.IO.File]::ReadAllBytes($PdfPath)

    # 3. Compute SHA256 Hash of PDF
    $sha256 = [System.Security.Cryptography.SHA256]::Create()
    $hash = $sha256.ComputeHash($pdfBytes)

    # 4. Sign Hash using USB Hardware Token Private Key (Triggers ProxKey PIN Prompt)
    $content = New-Object System.Security.Cryptography.Pkcs.ContentInfo -ArgumentList (,$hash)
    $signedCms = New-Object System.Security.Cryptography.Pkcs.SignedCms -ArgumentList $content, $true
    $cmsSigner = New-Object System.Security.Cryptography.Pkcs.CmsSigner -ArgumentList $selectedCert
    $cmsSigner.IncludeOption = [System.Security.Cryptography.X509Certificates.X509IncludeOption]::WholeChain
    $cmsSigner.DigestAlgorithm = New-Object System.Security.Cryptography.Oid("2.16.840.1.101.3.4.2.1") # SHA-256

    # This triggers the ProxKey Token PIN dialog if not already cached
    $signedCms.ComputeSignature($cmsSigner, $false)
    $signatureBytes = $signedCms.Encode()

    # 5. Output signature metadata JSON
    $result = @{
        success = $true
        signerName = $selectedCert.GetNameInfo([System.Security.Cryptography.X509Certificates.X509NameType]::SimpleName, $false)
        issuer = $selectedCert.Issuer
        serialNumber = $selectedCert.SerialNumber
        thumbprint = $selectedCert.Thumbprint
        signatureBase64 = [Convert]::ToBase64String($signatureBytes)
        certificateBase64 = [Convert]::ToBase64String($selectedCert.RawData)
        timestamp = (Get-Date).ToString("yyyy-MM-ddTHH:mm:sszzz")
    }

    $store.Close()
    $jsonOutput = $result | ConvertTo-Json -Compress
    Write-Output "---DSC_RESULT_START---"
    Write-Output $jsonOutput
    Write-Output "---DSC_RESULT_END---"
} catch {
    Write-Error $_.Exception.Message
    exit 1
}
