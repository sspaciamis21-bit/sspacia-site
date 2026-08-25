/**
 * SSPACIA Local USB DSC Bridge Server
 * Runs locally on port 8765 on the computer where ProxKey USB Dongle is inserted.
 * Connects the web application directly to the physical USB Token for real PantaSign Class 3 signing.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PORT = 8765;

const server = http.createServer(async (req, res) => {
  // Enable CORS for SSPACIA Website
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = req.url || '/';

  // 1. Health Check
  if (url === '/status' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      service: 'SSPACIA USB DSC Local Bridge',
      version: '1.0.0',
      port: PORT,
      status: 'READY'
    }));
    return;
  }

  // 2. Discover USB Certificates
  if (url === '/certificates' && req.method === 'GET') {
    try {
      const psCommand = `powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-ChildItem Cert:\\CurrentUser\\My | Where-Object { $_.HasPrivateKey } | Select-Object Subject, Issuer, SerialNumber, Thumbprint, NotAfter | ConvertTo-Json -Compress"`;
      const output = execSync(psCommand, { encoding: 'utf8' }).trim();
      let certs = [];
      if (output) {
        try {
          const parsed = JSON.parse(output);
          certs = Array.isArray(parsed) ? parsed : [parsed];
        } catch {}
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        certificates: certs,
        count: certs.length
      }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: err.message }));
    }
    return;
  }

  // 3. Sign Invoice PDF with USB Token
  if (url === '/sign-invoice' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body);
        const { pdfBase64, signerName = 'PRAVEEN DILIPKUMAR AGARWAL' } = payload;

        if (!pdfBase64) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: 'pdfBase64 is required' }));
          return;
        }

        const tempDir = path.join(__dirname, 'temp_dsc');
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

        const tempInput = path.join(tempDir, `input_${Date.now()}.pdf`);
        fs.writeFileSync(tempInput, Buffer.from(pdfBase64, 'base64'));

        const psScript = path.join(__dirname, 'sign-with-usb-dsc.ps1');
        const psCommand = `powershell -NoProfile -ExecutionPolicy Bypass -File "${psScript}" -PdfPath "${tempInput}" -SignerCN "${signerName}"`;

        const psOutput = execSync(psCommand, { encoding: 'utf8', windowsHide: false });

        // Clean up temp file
        try { fs.unlinkSync(tempInput); } catch {}

        // Parse result
        const match = psOutput.match(/---DSC_RESULT_START---([\s\S]*?)---DSC_RESULT_END---/);
        if (!match) {
          throw new Error('Could not parse USB DSC signature result from token.');
        }

        const dscResult = JSON.parse(match[1].trim());

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          message: 'Document signed successfully with USB Token!',
          data: dscResult
        }));
      } catch (err) {
        console.error('[DSC_BRIDGE_ERROR]', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: false,
          error: err.message || 'Failed to sign with USB Token. Please ensure ProxKey token is inserted.'
        }));
      }
    });
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Endpoint not found' }));
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`=======================================================`);
  console.log(`  SSPACIA USB DSC Signer Bridge is running!`);
  console.log(`  Listening on: http://127.0.0.1:${PORT}`);
  console.log(`  Keep this window open while signing invoices.`);
  console.log(`=======================================================`);
});
