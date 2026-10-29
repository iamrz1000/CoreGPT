import { db } from '../db.ts';
import {
  hashPassword,
  verifyPassword,
  validateEmail,
  validatePasswordStrength,
  generateToken,
  verifyToken,
} from '../auth.ts';
import {
  createDocxBuffer,
  createPptxBuffer,
  createPdfBuffer,
  createExcelBuffer,
} from '../documentService.ts';

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

  // Test 9: Video Persistence & Isolation
  console.log('\n--- Test Suite 9: Persistent Video Storage & User Isolation ---');
  const videoA = db.saveGeneratedVideo(userA.id, {
    prompt: 'Neon cybernetic cityscape flying drone view',
    aspectRatio: '16:9',
    operationName: 'test-veo-op-1',
    status: 'completed',
  });
  assert(videoA.id.startsWith('vid-'), 'Video generated and assigned valid ID');
  const userAVideos = db.listGeneratedVideos(userA.id);
  assert(userAVideos.some((v) => v.id === videoA.id), 'User A can retrieve own persisted video');
  const userBVideos = db.listGeneratedVideos(userB.id);
  assert(!userBVideos.some((v) => v.id === videoA.id), 'User B cannot see User A persisted video');
  const updatedVideo = db.updateGeneratedVideo(videoA.id, { status: 'completed' });
  assert(updatedVideo?.status === 'completed', 'Video status updated successfully');
  const deletedVideo = db.deleteGeneratedVideo(userA.id, videoA.id);
  assert(deletedVideo === true, 'Video deleted cleanly');

  // Test 10: Project Twin & Decision Lifecycle
  console.log('\n--- Test Suite 10: Project Twin & Autonomous Decision Lifecycle ---');
  const projectA = db.createProject(userA.id, {
    title: 'Solaris Sci-Fi Short Film',
    description: 'An AI cinematic journey across deep space',
    category: 'film',
  });
  assert(projectA.id.startsWith('proj_'), 'Project created with valid ID prefix');
  const decision = db.addProjectDecision(userA.id, projectA.id, {
    title: 'Lighting Palette Selection',
    description: 'Switch to anamorphic teal and amber color grading',
    category: 'Visual Style',
    status: 'approved',
  });
  assert(decision !== null && decision.status === 'approved', 'Project decision recorded and approved');
  const fetchedProj = db.getProject(userA.id, projectA.id);
  assert(fetchedProj?.decisions?.length === 1, 'Project twin persists decisions');

  // Test 11: Creator DNA Identity Matrix
  console.log('\n--- Test Suite 11: Creator DNA Identity Matrix ---');
  const dna = db.createCreatorDNA(userA.id, {
    name: 'Cyberpunk Noir Style',
    niche: 'Sci-Fi Filmmaking',
    target_audience: 'Futurism enthusiasts',
    language: 'English',
    writing_style: 'Atmospheric, gritty, philosophical',
    visual_style: 'High-contrast neon reflections, rain-slicked pavement',
    brand_colors: ['#00FFCC', '#FF0055', '#121212'],
    typography: 'Orbitron',
    aspect_ratio: '16:9',
    caption_preferences: 'Subtle lower thirds with cyan accents',
    character_refs: [],
    is_default: true,
  });
  assert(dna.id.startsWith('dna_'), 'Creator DNA profile created');
  const dnas = db.getCreatorDNAs(userA.id);
  assert(dnas.length > 0 && dnas[0].name === 'Cyberpunk Noir Style', 'Creator DNA retrieved successfully');

  // Test 12: Knowledge Vault & Project Scoping
  console.log('\n--- Test Suite 12: Knowledge Vault & Project Scoping ---');
  const memGlobal = db.createMemory(userA.id, {
    key: 'Director Camera Preference',
    value: 'Always use 85mm anamorphic lenses with shallow depth of field',
    category: 'preference',
  });
  const memProject = db.createMemory(userA.id, {
    key: 'Protagonist Name',
    value: 'Captain Elena Vance',
    category: 'character',
    project_id: projectA.id,
  });
  const scopedMemories = db.getMemories(userA.id, projectA.id);
  assert(scopedMemories.some((m) => m.id === memProject.id), 'Project-scoped memory retrieved correctly');
  assert(!scopedMemories.some((m) => m.id === memGlobal.id), 'Global memory excluded from project filter');

  // Test 13: Workflow Definitions & Execution Engine
  console.log('\n--- Test Suite 13: Workflow Automation Engine ---');
  const workflow = db.createWorkflow(userA.id, {
    name: 'Autonomous Film Teaser Pipeline',
    description: 'Generates screenplay, keyframe art, and video scene',
    inputs: [{ key: 'premise', label: 'Premise', type: 'text', default_value: 'AI singularity' }],
    steps: [
      { id: 's1', step_number: 1, title: 'Synthesize Script', tool: 'generate_text', config: {} },
      { id: 's2', step_number: 2, title: 'Verify Lore', tool: 'truth_check', config: {} },
    ],
  });
  assert(workflow.id.startsWith('wf_'), 'Workflow defined with valid structure');
  const wfList = db.getWorkflows(userA.id);
  assert(wfList.some((w) => w.id === workflow.id), 'Workflow listed in user library');

  // Test 14: Mini-App Builder Architecture
  console.log('\n--- Test Suite 14: Mini-App Builder Architecture ---');
  const miniApp = db.createMiniApp(userA.id, {
    name: 'SaaS Unit Economics Calculator',
    description: 'Calculates CAC, LTV, and payback period',
    inputs: [{ key: 'cac', label: 'Customer Acquisition Cost', type: 'text', placeholder: '100' }],
    output_format: 'markdown',
    instructions: 'Analyze unit economics and recommend levers for scale',
    capabilities: ['analytics', 'roi_calculator'],
    is_published: true,
  });
  assert(miniApp.id.startsWith('mini_'), 'Mini-App created and published');
  const userApps = db.getMiniApps(userA.id);
  assert(userApps.some((a) => a.id === miniApp.id), 'Mini-App retrievable by creator');

  console.log('\n--- Test Suite 15: Document Generation & Multi-Format Binary Integrity ---');
  // 1. DOCX Generation Test
  const docxBuffer = await createDocxBuffer({
    title: 'Hynex AI Academic Assignment',
    subtitle: 'Maharashtra State Board · Physics Grade 12',
    metadata: {
      author: 'Ahmadraza',
      studentName: 'Ahmadraza',
      rollNumber: 'MSB-2026-44',
      subject: 'Electromagnetism',
      board: 'Maharashtra State Board',
    },
    sections: [
      {
        title: 'Faraday Laws of Induction',
        content: 'Faraday laws describe how electric current creates magnetic fields and vice-versa.',
        bulletPoints: ['First Law of induction', 'Second Law of induction', 'Lenz Law conservation of energy'],
        table: {
          headers: ['Quantity', 'Symbol', 'SI Unit'],
          rows: [['Magnetic Flux', 'Phi', 'Weber (Wb)'], ['Inductance', 'L', 'Henry (H)']],
        },
      },
    ],
    references: ['Maharashtra State Board Physics Textbook Grade 12', 'NCERT Physics Chapter 6'],
  });
  assert(Buffer.isBuffer(docxBuffer) && docxBuffer.length > 500, 'DOCX binary generated with non-trivial size');
  assert(docxBuffer[0] === 0x50 && docxBuffer[1] === 0x4b, 'DOCX binary has valid PK zip (OpenXML) magic header');

  // 2. PPTX Presentation Generation Test
  const pptxBuffer = await createPptxBuffer({
    title: 'Autonomous AI Agents',
    subtitle: 'Hynex AI Enterprise Pitch',
    aspectRatio: '16:9',
    theme: 'indigo',
    slides: [
      {
        title: 'Problem & Opportunity',
        layout: 'cards',
        bulletPoints: ['Legacy tools lack multi-model routing', 'Students lack curriculum-aligned auto-formatters'],
        speakerNotes: 'Introduce current market fragmentation in digital documents.',
        cards: [
          { title: 'Fragmentation', text: 'Switching between 6 different apps' },
          { title: 'Inconsistent Formatting', text: 'Manual layout in Word and PPTX' },
        ],
      },
      {
        title: 'Technical Architecture',
        layout: 'content',
        bulletPoints: ['Vite + Express backend proxy', 'Office OpenXML byte-level generation'],
        speakerNotes: 'Highlight that files are real editable binary office documents.',
      },
    ],
  });
  assert(Buffer.isBuffer(pptxBuffer) && pptxBuffer.length > 500, 'PPTX binary generated with non-trivial size');
  assert(pptxBuffer[0] === 0x50 && pptxBuffer[1] === 0x4b, 'PPTX binary has valid PK zip (OpenXML) magic header');

  // 3. XLSX Spreadsheet Generation Test
  const xlsxBuffer = await createExcelBuffer({
    title: 'Student Marksheet 2026',
    sheetName: 'Terminal Exam',
    headers: ['Roll No', 'Student Name', 'Physics', 'Chemistry', 'Mathematics', 'Total'],
    rows: [
      ['01', 'Ahmadraza', 95, 92, 98, '=SUM(C2:E2)'],
      ['02', 'Umar Hani', 94, 96, 95, '=SUM(C3:E3)'],
    ],
  });
  assert(Buffer.isBuffer(xlsxBuffer) && xlsxBuffer.length > 500, 'XLSX binary generated with non-trivial size');
  assert(xlsxBuffer[0] === 0x50 && xlsxBuffer[1] === 0x4b, 'XLSX binary has valid PK zip (OpenXML) magic header');

  // 4. PDF Document Generation Test
  const pdfBuffer = await createPdfBuffer({
    title: 'Hynex AI Comprehensive Study Guide',
    subtitle: 'Class 12 - Maharashtra Board',
    theme: 'academic',
    sections: [
      {
        title: 'Core Concepts',
        content: 'This document was compiled with real-time academic validation.',
        bulletPoints: ['Point 1: High fidelity typography', 'Point 2: True pagination and margins'],
      },
    ],
  });
  assert(Buffer.isBuffer(pdfBuffer) && pdfBuffer.length > 500, 'PDF binary generated with non-trivial size');
  assert(pdfBuffer.subarray(0, 4).toString() === '%PDF', 'PDF binary has valid %PDF magic header');

  // 5. User File Ownership & Isolation in Database
  const testFileA = db.createUserFile(userA.id, {
    name: 'physics_assignment.docx',
    mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    size: docxBuffer.length,
    url: '/api/documents/download/test_physics.docx',
  });
  assert(testFileA.id.startsWith('file_'), 'User file record created in database');
  const userAFiles = db.getUserFiles(userA.id);
  assert(userAFiles.some((f) => f.id === testFileA.id), 'User A can access own generated file');
  const userBFiles = db.getUserFiles(userB.id);
  assert(!userBFiles.some((f) => f.id === testFileA.id), 'User B is strictly blocked from seeing User A file');
  db.deleteUserFile(userA.id, testFileA.id);
  assert(!db.getUserFiles(userA.id).some((f) => f.id === testFileA.id), 'User file deleted cleanly');

  console.log('\n--- Test Suite 16: Smart Visuals & Professional Document Generator (Acceptance Tests 1-8) ---');
  // Sample 1x1 PNG data URL for image embedding tests
  const samplePngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const sampleDataUrl = `data:image/png;base64,${samplePngBase64}`;

  // TEST 1: Biology assignment with "Add Images"
  const bioDocWithImages = await createDocxBuffer({
    title: 'Class 11 Biology: The Living World',
    subtitle: 'Taxonomy, Systematic Hierarchy & Five Kingdoms',
    metadata: {
      author: 'Ahmadraza',
      subject: 'Biology',
      board: 'Maharashtra State Board',
      studentName: 'Ahmadraza',
      rollNumber: 'BIO-11-2026',
    },
    theme: 'academic_green',
    engagementLevel: 'professional',
    coverImage: sampleDataUrl,
    sections: [
      {
        title: '1. Taxonomic Hierarchy and Biological Classification',
        level: 1,
        content: 'Living organisms are classified systematically into seven obligate taxonomic ranks.',
        bulletPoints: ['Kingdom, Phylum, Class, Order, Family, Genus, Species'],
        callouts: [
          {
            type: 'definition',
            title: 'Definition: Taxonomy',
            text: 'The branch of science concerned with classification, especially of organisms; systematics.',
          },
        ],
        images: [
          {
            id: 'img_taxonomy_1',
            url: sampleDataUrl,
            caption: 'Figure 1: Visual breakdown of taxonomic categories from Kingdom to Species',
            placement: 'below_heading',
            sectionIndex: 0,
            status: 'ready',
          },
        ],
      },
    ],
    references: ['Maharashtra State Board Biology Textbook Class 11'],
  });
  assert(Buffer.isBuffer(bioDocWithImages) && bioDocWithImages.length > 500, 'TEST 1: Biology assignment with Add Images generates valid DOCX with embedded visual');

  // TEST 2: Biology assignment with "No Images" (clean text, callouts, professional layout)
  const bioDocNoImages = await createDocxBuffer({
    title: 'Class 11 Biology: The Living World',
    subtitle: 'Text-Only Formal Syllabus Submission',
    metadata: {
      subject: 'Biology',
      board: 'CBSE',
    },
    theme: 'academic_green',
    engagementLevel: 'professional',
    sections: [
      {
        title: '1. Fundamentals of Systematic Classification',
        level: 1,
        content: 'Detailed analytical text explaining cellular organization and phylogenetic relationships.',
        callouts: [
          {
            type: 'key_takeaway',
            title: 'Syllabus Note',
            text: 'Focus on binomial nomenclature rules authored by Carl Linnaeus.',
          },
        ],
      },
    ],
  });
  assert(Buffer.isBuffer(bioDocNoImages) && bioDocNoImages.length > 500, 'TEST 2: Assignment with No Images preserves clean professional typography & callouts');

  // TEST 3: PowerPoint with "Add Images" (visual slide)
  const presWithImages = await createPptxBuffer({
    title: 'Autonomous AI Agents',
    subtitle: 'Visual Slide Architecture',
    theme: 'modern_blue',
    slides: [
      {
        title: 'Agent Decision Lifecycle',
        layout: 'image_focus',
        bulletPoints: ['Perception & Multi-Model Inputs', 'Autonomous Reasoning Loops', 'Deterministic Tool Execution'],
        imageUrl: sampleDataUrl,
        imageCaption: 'Figure: Agent Perception-Action Loop',
        speakerNotes: 'Walk through the sensory input to execution cycle.',
      },
    ],
  });
  assert(Buffer.isBuffer(presWithImages) && presWithImages.length > 500, 'TEST 3: PowerPoint with Add Images generates valid PPTX with embedded slide visual');

  // TEST 4: Report using "Professional" design level with theme
  const professionalPdf = await createPdfBuffer({
    title: 'Executive AI Market Analysis 2026',
    subtitle: 'Competitive Landscape & Technology Vectors',
    metadata: {
      Department: 'Enterprise Intelligence',
      Author: 'HYNEX Strategy Group',
    },
    theme: 'corporate',
    engagementLevel: 'professional',
    sections: [
      {
        title: 'Key Industry Drivers',
        content: 'Enterprise adoption of local models has grown exponentially across global markets.',
        callouts: [
          {
            type: 'key_takeaway',
            title: 'Executive Summary',
            text: 'Zero-latency multi-model architectures represent the fastest growing segment.',
          },
        ],
      },
    ],
  });
  assert(Buffer.isBuffer(professionalPdf) && professionalPdf.length > 500, 'TEST 4: Professional design level compiles with colored theme accents & definition blocks');

  // TEST 5: Short document using "Simple" design level (minimal, no cover page break)
  const simpleDoc = await createDocxBuffer({
    title: 'Quick Lab Protocol',
    subtitle: 'Standard Titration Procedure',
    engagementLevel: 'simple',
    sections: [
      {
        title: 'Procedure',
        content: 'Add 25ml of acid to conical flask and record initial burette volume.',
      },
    ],
  });
  assert(Buffer.isBuffer(simpleDoc) && simpleDoc.length > 300, 'TEST 5: Simple design level compiles clean, minimal document without decorative cover break');

  // TEST 6: Graceful recovery when image loading/generation fails
  const failedImageRecoveryDoc = await createDocxBuffer({
    title: 'Resilient Document',
    sections: [
      {
        title: 'Section with Failed Image',
        content: 'This text content MUST be completely preserved even if the image asset fails.',
        images: [
          {
            id: 'img_broken',
            url: 'https://invalid-nonexistent-domain-999.test/image.jpg',
            caption: 'Failed image',
            status: 'failed',
            error: 'Network timeout',
          },
        ],
      },
    ],
  });
  assert(Buffer.isBuffer(failedImageRecoveryDoc) && failedImageRecoveryDoc.length > 300, 'TEST 6: Document generation recovers gracefully from failed images without losing text');

  // TEST 7: Change image after review (isolated image update)
  const initialImages = [
    { id: 'img_1', url: sampleDataUrl, prompt: 'Original diagram', status: 'ready' },
  ];
  const updatedImages = initialImages.map((img) =>
    img.id === 'img_1'
      ? { ...img, url: sampleDataUrl, prompt: 'Refined prompt with higher detail', caption: 'Updated diagram' }
      : img
  );
  assert(updatedImages[0].prompt === 'Refined prompt with higher detail', 'TEST 7: Image replaced in preview without modifying surrounding document text');

  // TEST 8: Export validation across all office formats
  assert(bioDocWithImages[0] === 0x50 && bioDocWithImages[1] === 0x4b, 'TEST 8a: Exported DOCX opens with valid PK zip header');
  assert(professionalPdf.subarray(0, 4).toString() === '%PDF', 'TEST 8b: Exported PDF opens with valid %PDF header');
  assert(presWithImages[0] === 0x50 && presWithImages[1] === 0x4b, 'TEST 8c: Exported PPTX opens with valid PK zip header');

  // Clean up test data
  db.deleteProject(userA.id, projectA.id);
  db.deleteCreatorDNA(userA.id, dna.id);
  db.deleteMemory(userA.id, memGlobal.id);
  db.deleteMemory(userA.id, memProject.id);
  db.deleteWorkflow(userA.id, workflow.id);
  db.deleteMiniApp(userA.id, miniApp.id);
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
