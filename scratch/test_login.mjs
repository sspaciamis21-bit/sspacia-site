async function testHttpLogins() {
  const testCases = [
    { username: 'Accounts', pass: 'Accountant001' },
    { username: 'Accountant', pass: 'Accountant001' },
    { username: 'accountant', pass: 'accountant001' },
    { username: 'accounts', pass: 'accountant001' },
    { username: 'ssinfrazone21@gmail.com', pass: 'Accountant001' },
    { username: 'ssinfrazone21', pass: 'Accountant001' },
    { username: 'Accounts ', pass: 'Accountant001 ' },
  ];

  for (const tc of testCases) {
    try {
      const res = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: tc.username, password: tc.pass }),
      });
      const data = await res.json();
      console.log(`[HTTP ${res.status}] User: "${tc.username}" / Pass: "${tc.pass}" ->`, data.message || data.error);
    } catch (e) {
      console.error('Error testing', tc, e);
    }
  }
}

testHttpLogins();
