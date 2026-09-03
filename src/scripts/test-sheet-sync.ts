import process from 'node:process';
import { syncCandidateToHrSheet } from '../lib/hrSheetsSync';

async function testSheetSync() {
  console.log('Sending test candidate to Google Apps Script webhook...');
  const res = await syncCandidateToHrSheet({
    fullName: 'Test Candidate',
    email: 'test.candidate@example.com',
    mobileNo: '9876543210',
    age: 25,
    gender: 'Male',
    qualification: 'Graduate',
    experience: '1 Year',
    appliedPosition: 'Front Desk Executive',
    address: 'Ahmedabad',
    status: 'APPLIED',
  });
  console.log('Response from Webhook:', JSON.stringify(res, null, 2));
}

testSheetSync()
  .catch(console.error)
  .finally(() => {
    process.exit(0);
  });
