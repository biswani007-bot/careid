const { getAdminToken } = require('./token_helper.cjs');

async function request(url, method = 'GET', body = null) {
  const token = await getAdminToken();
  const opts = {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`https://360api.vnvision.in${url}`, opts);
  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

async function testLifecycle() {
  console.log('--- Testing Notification Lifecycle ---');

  // 1. Dispatch a test notification
  console.log('1. Creating test notification...');
  const createRes = await request('/api/v1/notifications', 'POST', {
    title: 'Automated Lifecycle Verification Alert',
    message: 'Testing read/unread and archive lifecycle transitions.',
    recipientUserId: '554f1941-f337-4a98-a8b6-d4409e1cfa04',
    notificationType: 'SYSTEM',
    priority: 'HIGH',
    channel: 'IN_APP',
  });
  console.log('Created:', JSON.stringify(createRes, null, 2));

  if (!createRes.data?.data?.id) {
    console.error('Failed to create test notification');
    return;
  }
  const id = createRes.data.data.id;

  // 2. Check unread count
  console.log('\n2. Checking unread count...');
  const unreadRes = await request('/api/v1/notifications/unread-count');
  console.log('Unread:', JSON.stringify(unreadRes, null, 2));

  // 3. Mark as read
  console.log('\n3. Marking as read...');
  const readRes = await request(`/api/v1/notifications/${id}/read`, 'PUT');
  console.log('Marked read:', JSON.stringify(readRes, null, 2));

  // 4. Check unread count again
  const unreadRes2 = await request('/api/v1/notifications/unread-count');
  console.log('Unread after read:', JSON.stringify(unreadRes2, null, 2));

  // 5. Delete (archive)
  console.log('\n5. Deleting (soft-delete / archive)...');
  const delRes = await request(`/api/v1/notifications/${id}`, 'DELETE');
  console.log('Delete response:', JSON.stringify(delRes, null, 2));

  // 6. Check list again
  console.log('\n6. Checking list after delete...');
  const listRes = await request('/api/v1/notifications');
  console.log('Total notifications now:', listRes.data?.data?.length);
  const found = listRes.data?.data?.find(n => n.id === id);
  console.log('Is deleted notification in regular list?', !!found);
}

testLifecycle();
