async function main() {
  try {
    // 1. Log in as Accounts
    const loginRes = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'Accounts', password: 'Accountant001' }),
    });
    const loginData = await loginRes.json();
    console.log('Login result:', loginData.message, 'Role:', loginData.user?.role);
    const token = loginData.token;

    // 2. Fetch Old Invoices as Accountant
    const res = await fetch('http://localhost:3001/api/admin/old-invoices', {
      headers: {
        'Cookie': `auth-token=${token}`
      }
    });
    const data = await res.json();
    console.log('Old Invoices fetched:', {
      success: data.success,
      count: data.data?.length,
      companiesCount: data.companySuggestions?.length,
      locationsCount: data.locations?.length,
      isSuperAdmin: data.isSuperAdmin
    });

    if (data.data?.length > 0) {
      console.log('Sample old invoice:', {
        id: data.data[0].id,
        companyName: data.data[0].companyName,
        month: data.data[0].month,
        locationName: data.data[0].locationName
      });
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

main();
