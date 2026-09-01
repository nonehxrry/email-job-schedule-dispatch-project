import { rateLimiterService } from './services/ratelimiter.service';
import { initRedis, closeRedis } from './config/redis.config';
import { initSmtpTransporter } from './config/smtp.config';
import { smtpService } from './services/smtp.service';
import { prisma } from './prisma/client';

async function runVerificationSuite() {
  console.log('============================================================');
  console.log('🧪 REACHINBOX TEST SUITE & SYSTEM VERIFICATION');
  console.log('============================================================\n');

  let passed = 0;
  let failed = 0;

  const assert = (condition: boolean, testName: string) => {
    if (condition) {
      console.log(`  ✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ [FAIL] ${testName}`);
      failed++;
    }
  };

  try {
    // 1. Initialize Services
    console.log('📦 Step 1: Initializing Redis & SMTP Engine...');
    await initRedis();
    await initSmtpTransporter();
    console.log('   Services initialized successfully.\n');

    // 2. Test Rate Limiter Under Limit
    console.log('🔒 Step 2: Testing Hourly Rate Limiter Window & Counters...');
    const testSender = `test-sender-${Date.now()}@reachinbox.ai`;
    const limit = 3;

    const r1 = await rateLimiterService.checkAndConsume(testSender, limit);
    assert(r1.allowed === true && r1.currentCount === 1, 'First email send is allowed (1/3)');

    const r2 = await rateLimiterService.checkAndConsume(testSender, limit);
    assert(r2.allowed === true && r2.currentCount === 2, 'Second email send is allowed (2/3)');

    const r3 = await rateLimiterService.checkAndConsume(testSender, limit);
    assert(r3.allowed === true && r3.currentCount === 3, 'Third email send is allowed (3/3)');

    // 3. Test Rate Limiter Exceeded (Overflow)
    const r4 = await rateLimiterService.checkAndConsume(testSender, limit);
    assert(
      r4.allowed === false && r4.currentCount === 4 && r4.resetTimeMs > Date.now(),
      'Fourth email is blocked and returns next hour reset timestamp'
    );
    console.log(`   Next available hour window reset at: ${new Date(r4.resetTimeMs).toISOString()}\n`);

    // 4. Test SMTP Ethereal Sending & Preview URL Generation
    console.log('📧 Step 3: Testing Nodemailer Ethereal SMTP Dispatch...');
    const emailResult = await smtpService.sendEmail({
      to: 'lead-test@example.com',
      recipientName: 'Alex Lead',
      subject: 'ReachInbox Verification Test Email',
      text: 'This is an automated verification test email dispatched through Ethereal SMTP.',
    });

    assert(Boolean(emailResult.messageId), `Message ID generated: ${emailResult.messageId}`);
    assert(Boolean(emailResult.etherealPreviewUrl), `Ethereal preview URL created: ${emailResult.etherealPreviewUrl}`);
    console.log(`   Preview link: ${emailResult.etherealPreviewUrl}\n`);

    // 5. Test Database Persistence
    console.log('💾 Step 4: Testing PostgreSQL / SQLite Database Persistence...');
    const user = await prisma.user.upsert({
      where: { email: 'verifier@reachinbox.ai' },
      update: {},
      create: {
        email: 'verifier@reachinbox.ai',
        name: 'System Verifier',
      },
    });

    const job = await prisma.emailJob.create({
      data: {
        userId: user.id,
        senderEmail: testSender,
        recipientEmail: 'client@company.io',
        subject: 'Database Persistence Test',
        body: 'Testing DB persistence',
        scheduledAt: new Date(Date.now() + 60000),
        status: 'SCHEDULED',
      },
    });

    const fetchedJob = await prisma.emailJob.findUnique({ where: { id: job.id } });
    assert(fetchedJob !== null && fetchedJob.status === 'SCHEDULED', 'Job successfully saved and queried from Database');
    console.log(`   Job record verified in DB with ID: ${fetchedJob?.id}\n`);

  } catch (error: any) {
    console.error('❌ Test suite encountered unhandled error:', error);
    failed++;
  } finally {
    await closeRedis();
    await prisma.$disconnect();

    console.log('============================================================');
    console.log(`🏁 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('============================================================');

    if (failed > 0) {
      process.exit(1);
    }
  }
}

runVerificationSuite();
