/**
 * Test script to verify AWS Bedrock connectivity
 * Run with: node --loader tsx scripts/test-bedrock.ts
 */

import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables from .env.local
function loadEnv() {
  try {
    const envPath = path.join(process.cwd(), '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim();
        if (!process.env[key]) {
          process.env[key] = value;
        }
      }
    });
  } catch {
    console.warn('⚠️  Could not load .env.local file. Make sure environment variables are set.');
  }
}

async function testBedrockConnection() {
  console.log('🧪 Testing AWS Bedrock Connection...\n');

  // Check environment variables
  console.log('📋 Environment Variables:');
  console.log(`AWS_ACCESS_KEY_ID: ${process.env.AWS_ACCESS_KEY_ID ? '✅ Set' : '❌ Missing'}`);
  console.log(`AWS_SECRET_ACCESS_KEY: ${process.env.AWS_SECRET_ACCESS_KEY ? '✅ Set' : '❌ Missing'}`);
  console.log(`AWS_REGION: ${process.env.AWS_REGION || '❌ Missing'}\n`);

  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    console.error('❌ AWS credentials not found in environment');
    process.exit(1);
  }

  const client = new BedrockRuntimeClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  console.log('🔌 Attempting to connect to AWS Bedrock...\n');

  try {
    const testPrompt = `You are Vel'Koz, the Eye of the Void. Respond in character with one sentence analyzing a player who has 50% win rate over 100 games.`;

    const command = new InvokeModelCommand({
      modelId: 'anthropic.claude-3-haiku-20240307-v1:0',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 200,
        temperature: 0.8,
        messages: [
          {
            role: 'user',
            content: testPrompt
          }
        ]
      }),
      contentType: 'application/json',
      accept: 'application/json',
    });

    console.log('⏳ Sending test request to Claude 3 Haiku...');
    const startTime = Date.now();
    
    const response = await client.send(command);
    const endTime = Date.now();
    
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    const aiResponse = responseBody.content[0].text;

    console.log('\n✅ SUCCESS! AWS Bedrock is working!\n');
    console.log('📊 Response Details:');
    console.log(`⏱️  Response Time: ${endTime - startTime}ms`);
    console.log(`📝 Response:\n"${aiResponse}"\n`);
    console.log('🎉 Your AWS Bedrock integration is configured correctly!');
    console.log('💡 The AI agent will use Claude 3 Haiku for narration and answers.\n');

  } catch (error: unknown) {
    const err = error as Error & { name?: string; message?: string; stack?: string };
    console.error('\n❌ FAILED! AWS Bedrock connection error:\n');
    
    if (err.name === 'ResourceNotFoundException') {
      console.error('🚫 Model Not Found Error:');
      console.error('   The Claude 3 Haiku model is not available in your AWS account.');
      console.error('   Please enable model access in AWS Bedrock console.');
      console.error('   1. Go to AWS Bedrock console');
      console.error('   2. Navigate to "Model access"');
      console.error('   3. Request access to "Claude 3 Haiku"\n');
    } else if (err.name === 'UnrecognizedClientException' || err.name === 'InvalidSignatureException') {
      console.error('🔑 Authentication Error:');
      console.error('   Your AWS credentials are invalid or expired.');
      console.error('   Please check your AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY.\n');
    } else if (err.name === 'AccessDeniedException') {
      console.error('🚫 Permission Error:');
      console.error('   Your AWS credentials don\'t have permission to invoke Bedrock.');
      console.error('   Please attach the AmazonBedrockFullAccess policy to your IAM user.\n');
    } else {
      console.error('❓ Unexpected Error:');
      console.error(`   ${err.message || 'Unknown error'}\n`);
      if (err.stack) {
        console.error('Stack trace:');
        console.error(err.stack);
      }
    }

    console.error('⚠️  Your app will fall back to simple narration without AWS Bedrock.\n');
    process.exit(1);
  }
}

// Load environment variables and run test
loadEnv();
testBedrockConnection();
