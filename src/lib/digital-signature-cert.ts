import forge from 'node-forge';
import fs from 'fs';
import path from 'path';

interface CertOptions {
  signerName?: string;
  companyName?: string;
  location?: string;
}

let cachedP12Buffer: Buffer | null = null;
let cachedPassword = 'sspacia_secure_dsc_password_2026';

/**
 * Returns a valid cryptographic PKCS#12 (.p12) digital certificate for Adobe PDF signing.
 * If an environment certificate is configured (SIGNING_P12_BASE64), it uses that.
 * Otherwise, it loads or generates a cryptographic certificate for Praveen Dilipkumar Agarwal / SSPACIA.
 */
export async function getInvoiceSigningCertificate(options: CertOptions = {}): Promise<{ p12Buffer: Buffer; password: string }> {
  // 1. Check environment variable
  const envP12Base64 = process.env.SIGNING_P12_BASE64;
  const envPassword = process.env.SIGNING_P12_PASSWORD;

  if (envP12Base64) {
    return {
      p12Buffer: Buffer.from(envP12Base64, 'base64'),
      password: envPassword || 'password',
    };
  }

  // 2. Check in-memory cache
  if (cachedP12Buffer) {
    return { p12Buffer: cachedP12Buffer, password: cachedPassword };
  }

  // 3. Check persisted cert on disk
  const certDir = path.join(process.cwd(), 'certs');
  const certPath = path.join(certDir, 'sspacia_dsc_signer.p12');

  if (fs.existsSync(certPath)) {
    try {
      cachedP12Buffer = fs.readFileSync(certPath);
      return { p12Buffer: cachedP12Buffer, password: cachedPassword };
    } catch {
      // Regenerate if corrupt
    }
  }

  // 4. Generate high-security 2048-bit RSA DSC Certificate
  const signerName = (options.signerName || 'PRAVEEN DILIPKUMAR AGARWAL').toUpperCase().trim();
  const companyName = options.companyName || 'SSPACIA INDIA PVT LTD';
  const locality = options.location || 'Ahmedabad';

  const keys = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();

  cert.publicKey = keys.publicKey;
  cert.serialNumber = Math.floor(Math.random() * 1000000000).toString(16);
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 5); // 5 Years validity

  const attrs = [
    { name: 'commonName', value: signerName },
    { name: 'organizationName', value: companyName },
    { shortName: 'OU', value: 'Authorised Signatory' },
    { name: 'localityName', value: locality },
    { shortName: 'ST', value: 'Gujarat' },
    { name: 'countryName', value: 'IN' },
  ];

  cert.setSubject(attrs);
  cert.setIssuer(attrs);

  // Set Extensions for Adobe Digital Signature Verification
  cert.setExtensions([
    {
      name: 'basicConstraints',
      cA: false,
    },
    {
      name: 'keyUsage',
      digitalSignature: true,
      nonRepudiation: true,
      keyEncipherment: true,
      dataEncipherment: true,
    },
    {
      name: 'extKeyUsage',
      serverAuth: false,
      clientAuth: false,
      codeSigning: false,
      emailProtection: true,
      timeStamping: true,
    },
    {
      name: 'subjectKeyIdentifier',
    },
  ]);

  cert.sign(keys.privateKey, forge.md.sha256.create());

  // Package into PKCS#12 (.p12) binary
  const p12Asn1 = forge.pkcs12.toPkcs12Asn1(keys.privateKey, [cert], cachedPassword, {
    algorithm: '3des',
  });

  const p12Der = forge.asn1.toDer(p12Asn1).getBytes();
  cachedP12Buffer = Buffer.from(p12Der, 'binary');

  // Persist to disk for reuse
  try {
    if (!fs.existsSync(certDir)) {
      fs.mkdirSync(certDir, { recursive: true });
    }
    fs.writeFileSync(certPath, cachedP12Buffer);
  } catch (err) {
    console.warn('[DSC_CERT] Could not persist certificate to disk:', err);
  }

  return { p12Buffer: cachedP12Buffer, password: cachedPassword };
}
