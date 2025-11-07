#!/bin/bash

# Script to add Bedrock permissions to IAM user
# Run this if you have AWS CLI configured

echo "🔧 Adding AmazonBedrockFullAccess to IAM user BedrockAPIKey-j5fx..."

aws iam attach-user-policy \
  --user-name BedrockAPIKey-j5fx \
  --policy-arn arn:aws:iam::aws:policy/AmazonBedrockFullAccess

if [ $? -eq 0 ]; then
  echo "✅ Successfully attached policy!"
  echo ""
  echo "Now test it:"
  echo "  npx tsx scripts/test-bedrock-detailed.ts"
else
  echo "❌ Failed to attach policy"
  echo "Please use AWS Console instead:"
  echo "  https://console.aws.amazon.com/iam/home#/users/BedrockAPIKey-j5fx"
fi
