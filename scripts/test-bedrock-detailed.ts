/**
 * Detailed AWS Bedrock Diagnostic Script
 * Tests connection, permissions, and model access
 */

import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { STSClient, GetCallerIdentityCommand } from '@aws-sdk/client-sts';

// Load environment variables from .env.local
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

async function testAWSIdentity() {
  console.log('\n🔐 Testing AWS Identity...\n');
  
  try {
    const stsClient = new STSClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      },
    });

    const command = new GetCallerIdentityCommand({});
    const response = await stsClient.send(command);

    console.log('✅ AWS Credentials Valid!\n');
    console.log('📋 Identity Information:');
    console.log(`   Account ID: ${response.Account}`);
    console.log(`   User ARN: ${response.Arn}`);
    console.log(`   User ID: ${response.UserId}\n`);

    return true;
  } catch (error) {
    console.error('❌ AWS Identity Test Failed!\n');
    console.error('Error:', error instanceof Error ? error.message : String(error));
    console.error('\nThis means your AWS credentials are invalid or expired.\n');
    return false;
  }
}

async function testBedrockPermissions() {
  console.log('\n🔓 Testing AWS Bedrock Permissions...\n');
  
  const client = new BedrockRuntimeClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });

  // Test with Amazon Nova Lite
  const command = new InvokeModelCommand({
    modelId: 'amazon.nova-lite-v1:0',
    body: JSON.stringify({
      messages: [
        {
          role: 'user',
          content: [
            {
              text: 'Say hello in a friendly way'
            }
          ]
        }
      ],
      inferenceConfig: {
        max_new_tokens: 20,
        temperature: 0.7
      }
    }),
    contentType: 'application/json',
    accept: 'application/json',
  });

  try {
    console.log('⏳ Invoking Amazon Nova Lite via Bedrock...\n');
    
    const startTime = Date.now();
    const response = await client.send(command);
    const endTime = Date.now();
    
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    
    console.log('✅ SUCCESS! AWS Bedrock with Amazon Nova Lite is working!\n');
    console.log('📊 Response Details:');
    console.log(`   Model: Amazon Nova Lite`);
    console.log(`   Response Time: ${endTime - startTime}ms`);
    console.log(`   Response: ${responseBody.output.message.content[0].text}`);
    
    if (responseBody.usage) {
      console.log(`   Input Tokens: ${responseBody.usage.inputTokens || 'N/A'}`);
      console.log(`   Output Tokens: ${responseBody.usage.outputTokens || 'N/A'}`);
    }
    console.log('\n');
    
    console.log('🎉 Amazon Nova Lite is ready for AI narration!\n');
    console.log('💡 Next step: Restart your dev server with `pnpm dev`\n');
    
    return true;
  } catch (error) {
    console.error('❌ FAILED! AWS Bedrock Permission Error\n');
    
    const errorName = error instanceof Error ? error.name : 'Unknown';
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    if (errorName === 'ValidationException') {
      console.error('🔍 Error Type: ValidationException');
      console.error('📝 Error Message:', errorMessage);
      console.error('\n🔧 Possible Causes:\n');
      console.error('1. IAM Permissions Missing:');
      console.error('   Your IAM user/role needs the following permissions:');
      console.error('   - bedrock:InvokeModel');
      console.error('   - bedrock:InvokeModelWithResponseStream\n');
      console.error('2. Region Not Supported:');
      console.error(`   Current region: ${process.env.AWS_REGION || 'us-east-1'}`);
      console.error('   Try: us-east-1, us-west-2, or us-east-2\n');
      console.error('3. Anthropic Models Require Use Case (First-Time Users):');
      console.error('   Some first-time users need to submit use case details.');
      console.error('   Go to: https://console.aws.amazon.com/bedrock');
      console.error('   Open Model Catalog → Select Amazon Nova Lite → Open in Playground');
      console.error('   Follow the prompts to submit use case details.\n');
    } else if (errorName === 'AccessDeniedException') {
      console.error('🔍 Error Type: AccessDeniedException');
      console.error('📝 Error Message:', errorMessage);
      console.error('\n🔧 Solution:\n');
      console.error('Your IAM user lacks Bedrock permissions.');
      console.error('Add this policy to your IAM user:\n');
      console.error('Policy Name: AmazonBedrockFullAccess');
      console.error('Or create a custom policy with:');
      console.error('```json');
      console.error(JSON.stringify({
        "Version": "2012-10-17",
        "Statement": [
          {
            "Effect": "Allow",
            "Action": [
              "bedrock:InvokeModel",
              "bedrock:InvokeModelWithResponseStream"
            ],
            "Resource": "*"
          }
        ]
      }, null, 2));
      console.error('```\n');
    } else {
      console.error('🔍 Error Type:', errorName);
      console.error('📝 Error Message:', errorMessage);
      console.error('\n🔧 Unexpected Error:\n');
      console.error('Full error:', error);
      if (error instanceof Error && error.stack) {
        console.error('\nStack trace:');
        console.error(error.stack);
      }
    }
    
    console.error('\n⚠️  Your app will fall back to simple narration without AWS Bedrock.\n');
    return false;
  }
}

async function main() {
  console.log('🧪 AWS Bedrock Detailed Diagnostic Test\n');
  console.log('═══════════════════════════════════════════════════════════\n');
  
  // Check environment variables
  console.log('📋 Environment Variables:');
  console.log(`   AWS_ACCESS_KEY_ID: ${process.env.AWS_ACCESS_KEY_ID ? '✅ Set (' + process.env.AWS_ACCESS_KEY_ID.substring(0, 10) + '...)' : '❌ Not set'}`);
  console.log(`   AWS_SECRET_ACCESS_KEY: ${process.env.AWS_SECRET_ACCESS_KEY ? '✅ Set (hidden)' : '❌ Not set'}`);
  console.log(`   AWS_REGION: ${process.env.AWS_REGION || 'us-east-1'}`);
  
  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    console.error('\n❌ AWS credentials not found in .env.local\n');
    console.error('Make sure your .env.local file contains:');
    console.error('AWS_ACCESS_KEY_ID=your_key');
    console.error('AWS_SECRET_ACCESS_KEY=your_secret');
    console.error('AWS_REGION=us-east-1\n');
    process.exit(1);
  }

  // Test 1: Verify AWS credentials are valid
  const identityValid = await testAWSIdentity();
  if (!identityValid) {
    console.error('❌ Cannot proceed with Bedrock test - AWS identity failed\n');
    process.exit(1);
  }

  // Test 2: Test Bedrock permissions and model access
  const bedrockWorking = await testBedrockPermissions();
  
  if (bedrockWorking) {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('✅ ALL TESTS PASSED - AWS Bedrock is ready to use!');
    console.log('═══════════════════════════════════════════════════════════\n');
    process.exit(0);
  } else {
    console.log('═══════════════════════════════════════════════════════════');
    console.log('❌ TESTS FAILED - See error details above');
    console.log('═══════════════════════════════════════════════════════════\n');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('\n💥 Unexpected error during test:\n');
  console.error(error);
  process.exit(1);
});
