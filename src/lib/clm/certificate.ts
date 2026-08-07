import forge from 'node-forge';

/**
 * Utility to load or generate a P12 certificate for digital signing.
 * In production, you should provide a real .p12 certificate via environment variables.
 */
export async function getSigningCertificate(): Promise<{ p12Buffer: Buffer; password: string }> {
  // 1. Check if configured in environment
  const envP12Base64 = process.env.SIGNING_P12_BASE64;
  const password = process.env.SIGNING_P12_PASSWORD || 'password';

  if (envP12Base64) {
    return {
      p12Buffer: Buffer.from(envP12Base64, 'base64'),
      password
    };
  }

  // 2. Fallback: Generate a self-signed certificate for development
  console.warn('[CLM] Using self-signed certificate for PDF signing. This is for development only.');
  
  const keys = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();
  
  cert.publicKey = keys.publicKey;
  cert.serialNumber = '01';
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);

  const attrs = [
    { name: 'commonName', value: 'Sspacia Local Dev' },
    { name: 'countryName', value: 'IN' },
    { shortName: 'ST', value: 'Karnataka' },
    { name: 'localityName', value: 'Bangalore' },
    { name: 'organizationName', value: 'Sspacia' },
    { shortName: 'OU', value: 'CLM' }
  ];

  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.sign(keys.privateKey);

  // Create P12
  const p12Asn1 = forge.pkcs12.toPkcs12Asn1(keys.privateKey, [cert], password, {
    algorithm: '3des'
  });
  
  const p12Der = forge.asn1.toDer(p12Asn1).getBytes();
  const p12Buffer = Buffer.from(p12Der, 'binary');

  return { p12Buffer, password };
}

