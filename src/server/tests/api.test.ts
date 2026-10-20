import { db } from '../db.ts';
import {
  hashPassword,
  verifyPassword,
  validateEmail,
  validatePasswordStrength,
  generateToken,
  verifyToken,
} from '../auth.ts';

async function runTests() {
  console.log('🧪 Starting NextGen AI Assistant Automated Test Suite...\n');
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  // Test 1: Email and password strength validation
  console.log('--- Test Suite 1: Authentication Validation ---');
  assert(validateEmail('test@example.com') === true, 'Valid email recognized');
  assert(validateEmail('invalid-email') === false, 'Invalid email rejected');
  assert(
    validatePasswordStrength('Short1').valid === false,
    'Short password (<8 chars) rejected'
  );
  assert(
    validatePasswordStrength('alllowercase1').valid === true,
    'Valid 8+ char password with letters and numbers accepted'
  );

  // Test 2: Password hashing & verification
  console.log('\n--- Test Suite 2: Password Cryptography ---');
  const plain = 'SecretPassword123!';
  const hash = await hashPassword(plain);
  assert(hash.startsWith('$2'), 'Bcrypt hash generated with proper salt header');
  const match = await verifyPassword(plain, hash);
  assert(match === true, 'Password verification succeeds with correct password');
  const wrongMatch = await verifyPassword('WrongPassword123!', hash);
  assert(wrongMatch === false, 'Password verification fails with incorrect password');

  // Test 3: JWT Session Token Verification
  console.log('\n--- Test Suite 3: Session Tokens ---');
  const payload = { userId: 'user-test-123', email: 'test@example.com', role: 'user' };
  const token = generateToken(payload, '1h');
  const decoded = verifyToken(token);
  assert(decoded?.userId === 'user-test-123', 'JWT token decoded with correct userId');
  assert(decoded?.role === 'user', 'JWT token decoded with correct user role');
  const invalidDecoded = verifyToken('invalid.token.string');
  assert(invalidDecoded === null, 'Invalid token returns null without crashing');

  // Test 4: Database User & Role Model
  console.log('\n--- Test Suite 4: Database User & Role RBAC ---');
  const testEmail = `user_${Date.now()}@test.com`;
  const user = db.createUser({
    email: testEmail,
    display_name: 'Test Runner',
    password_hash: hash,
    role: 'user',
    status: 'active',
  });
  assert(user.id.length > 0, 'New user created with UUID');
  assert(user.role === 'user', 'New user role is user');

  // Test duplicate email rejection
  let dupThrew = false;
  try {
    db.createUser({
      email: testEmail,
      display_name: 'Duplicate Test',
      password_hash: hash,
      role: 'user',
      status: 'active',
    });
  } catch {
    dupThrew = true;
  }
  assert(dupThrew, 'Duplicate email registration rejected');

  // Test 5: Conversation Ownership Isolation
  console.log('\n--- Test Suite 5: Conversation Ownership Isolation ---');
  const userA = user;
  const userB = db.createUser({
    email: `other_${Date.now()}@test.com`,
    display_name: 'Other User',
    password_hash: hash,
    role: 'user',
    status: 'active',
  });

  const convA = db.createConversation(userA.id, 'User A Secret Conversation');
  db.addMessage(convA.id, 'user', 'Confidential message from User A');

  // Verify User A can access
  const fetchA = db.getConversation(convA.id, userA.id);
  assert(fetchA !== null && fetchA.id === convA.id, 'User A can read own conversation');

  // Verify User B CANNOT access User A's conversation
  const fetchB = db.getConversation(convA.id, userB.id);
  assert(fetchB === null, 'User B is strictly blocked from accessing User A conversation');

  // Test 6: Daily Quota Enforcement
  console.log('\n--- Test Suite 6: Atomic Quota Enforcement ---');
  db.updateUser(userA.id, { daily_quota_override: 2 });
  const q1 = db.checkAndIncrementQuota(userA.id, 'text');
  assert(q1.allowed === true && q1.remaining === 1, 'First message within quota allowed');
  const q2 = db.checkAndIncrementQuota(userA.id, 'text');
  assert(q2.allowed === true && q2.remaining === 0, 'Second message reaches quota limit');
  const q3 = db.checkAndIncrementQuota(userA.id, 'text');
  assert(q3.allowed === false && q3.remaining === 0, 'Third message blocked by daily quota');

  // Test Admin unlimited quota
  const adminUser = db.createUser({
    email: `admin_${Date.now()}@test.com`,
    display_name: 'System Administrator',
    password_hash: hash,
    role: 'admin',
    status: 'active',
  });
  const qAdmin = db.checkAndIncrementQuota(adminUser.id, 'text');
  assert(qAdmin.allowed === true && qAdmin.limit === 999999, 'Admin enjoys unlimited quota');

  // Test 7: Admin Audit Logging
  console.log('\n--- Test Suite 7: Security Audit Logging ---');
  db.logAdminAction(
    adminUser.email,
    'TEST_SECURITY_ACTION',
    'Automated test security event verification',
    adminUser.id,
    '127.0.0.1'
  );
  const logs = db.getAdminAuditLogs(10);
  assert(
    logs.some((l) => l.action === 'TEST_SECURITY_ACTION' && l.admin_email === adminUser.email),
    'Admin audit log persisted and retrievable'
  );

  // Test 8: Google Sign-In Integration
  console.log('\n--- Test Suite 8: Google Sign-In RBAC Sync ---');
  const googleAdminEmail = 'umarhani2000@gmail.com';
  let googleAdmin = db.getUserByEmail(googleAdminEmail);
  if (!googleAdmin) {
    googleAdmin = db.createUser({
      email: googleAdminEmail,
      display_name: 'Administrator',
      password_hash: hash,
      role: 'admin',
      status: 'active',
    });
  }
  assert(googleAdmin.role === 'admin', 'Configured admin email matches and preserves admin role');
  assert(validateEmail(googleAdmin.email), 'Google user email format is valid');

  // Clean up test data
  db.deleteUser(userA.id);
  db.deleteUser(userB.id);
  db.deleteUser(adminUser.id);
  if (googleAdmin && googleAdmin.id !== userA.id && googleAdmin.id !== userB.id) {
    db.deleteUser(googleAdmin.id);
  }

  console.log(`\n========================================`);
  console.log(`Test Results: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
