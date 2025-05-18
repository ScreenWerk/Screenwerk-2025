// test-later.js
import later from '@breejs/later';

console.log('Testing @breejs/later package');
try {
  // Test parsing a cron expression
  const cronSchedule = later.parse.cron('*/5 * * * * *', true);
  console.log('Cron schedule parsed successfully:', cronSchedule);
  
  // Test getting next occurrence 
  const next = later.schedule(cronSchedule).next(1);
  console.log('Next occurrence:', next);
  
  console.log('Test successful!');
} catch (error) {
  console.error('Error testing @breejs/later:', error);
}
