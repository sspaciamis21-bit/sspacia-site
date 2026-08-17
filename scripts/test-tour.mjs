async function run() {
  const url = 'https://script.google.com/macros/s/AKfycbzUagdoyhVrN-e-mmfe3oBfpH8ue1fB2hGLyrkTynE41J5VHbe9eiKDPVOklLG2AYVuDQ/exec';
  const payload = {
    action: 'book_a_tour',
    username: 'Rahul Sharma (Test Live)',
    email: 'sales@sspacia.com',
    mobileNo: '+91 76003 93779',
    locationName: 'Premier House - SG Highway, Bodakdev',
    preferredDate: '2026-08-25',
    timestamp: '17/08/2026, 12:06:00 pm'
  };

  console.log('Posting to:', url);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
      redirect: 'follow'
    });
    console.log('Status:', res.status);
    const data = await res.text();
    console.log('Response body:', data);
  } catch (err) {
    console.error('Fetch error:', err);
  }
}
run();
