// test-perf.js
const fs = require('fs');
const fetch = require('node-fetch');

// Function to get current timestamp in a readable format
function getTimestamp() {
  const now = new Date();
  return `${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;
}

// Load test audio file
const audioFile = './test-audio.webm'; // Replace with your test audio file path
let audioBase64;

try {
  audioBase64 = fs.readFileSync(audioFile).toString('base64');
  console.log(`Loaded test audio file (${Math.round(audioBase64.length / 1024)} KB)`);
} catch (error) {
  console.error('Error loading test audio file:', error.message);
  console.error('Please make sure test-audio.webm exists in the project root directory');
  process.exit(1);
}

async function runTest() {
  console.log(`[${getTimestamp()}] Starting performance test...`);
  
  const startTime = Date.now();
  
  try {
    // Make request to your API
    console.log('Sending request to enhanced-chat API...');
    const response = await fetch('http://localhost:3000/api/enhanced-chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audioData: audioBase64,
        scenario: 'test-scenario',
        scenarioTitle: 'Tim Hortons Order',
        scenarioContext: 'You are ordering coffee at Tim Hortons.',
        userId: 'test-user',
        history: [],
      }),
    });
    
    if (!response.ok) {
      throw new Error(`API responded with status: ${response.status}`);
    }
    
    const result = await response.json();
    
    const totalTime = Date.now() - startTime;
    console.log(`\n[${getTimestamp()}] Total time: ${totalTime}ms`);
    
    if (result.transcript) {
      console.log(`Transcript: "${result.transcript}"`);
      console.log(`Confidence: ${result.confidence}`);
    }
    
    if (result.response) {
      console.log(`Response: "${result.response}"`);
    }
    
    if (result.needsClarification) {
      console.log('Speech quality: Needs clarification');
    } else {
      console.log('Speech quality: Good');
    }
    
    return { totalTime, result };
  } catch (error) {
    console.error('Test error:', error);
    return { totalTime: 0, result: null, error };
  }
}

// Run multiple tests
async function runMultipleTests(count) {
  console.log(`\n============================================`);
  console.log(`Starting performance test with ${count} iterations`);
  console.log(`============================================\n`);
  
  const times = [];
  const results = [];
  
  for (let i = 0; i < count; i++) {
    console.log(`\n[TEST ${i + 1}/${count}]`);
    const { totalTime, result, error } = await runTest();
    
    if (!error && totalTime > 0) {
      times.push(totalTime);
      results.push(result);
    }
    
    // Add a small delay between tests
    if (i < count - 1) {
      console.log('Waiting 2 seconds before next test...');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  if (times.length === 0) {
    console.error('\nAll tests failed. Please check your server and configuration.');
    return;
  }
  
  // Calculate statistics
  const avg = times.reduce((sum, time) => sum + time, 0) / times.length;
  const sorted = [...times].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  
  console.log('\n============================================');
  console.log('PERFORMANCE TEST RESULTS');
  console.log('============================================');
  console.log(`Tests run: ${count} (${times.length} successful)`);
  console.log(`Average time: ${avg.toFixed(2)}ms`);
  console.log(`Median time: ${median}ms`);
  console.log(`Min time: ${min}ms`);
  console.log(`Max time: ${max}ms`);
  console.log('============================================');
  
  // Analyze component times from server logs
  console.log('\nNote: Check your server console for detailed component timing information');
}

// Run 3 tests by default, but allow changing via command line argument
const testCount = process.argv[2] ? parseInt(process.argv[2]) : 3;
runMultipleTests(testCount);