# Environment Configuration Guide

## Objective
Configure all required environment variables for the Google Gemini AI image generation system with OpenAI fallback support.

## Prerequisites
- ✅ Convex project deployed and configured
- ✅ Google Gemini and OpenAI API access

## Required Environment Variables

### 1. Google Gemini Configuration (Primary AI Model)

```bash
# Required: Google Gemini API Key
npx convex env set GEMINI_API_KEY your-google-gemini-api-key

# Alternative: Google Generative AI API Key (if using different naming)
npx convex env set GOOGLE_GENAI_API_KEY your-google-genai-api-key
```

**Getting Your Google Gemini API Key:**
1. Visit [Google AI Studio](https://aistudio.google.com/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated API key
5. Keep it secure - never commit to version control

**Pricing Information:**
- **Input tokens**: ~$0.30 per 1M tokens
- **Output tokens**: ~$30 per 1M tokens  
- **Estimated cost per image**: $0.03-0.05
- **Daily free tier**: Available for development

### 2. OpenAI Configuration (Fallback AI Models)

```bash
# Required: OpenAI API Key for DALL-E 3 and GPT-4o Vision fallback
npx convex env set OPENAI_API_KEY your-openai-api-key
```

**Getting Your OpenAI API Key:**
1. Visit [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign in or create an account
3. Navigate to API Keys section
4. Click "Create new secret key"
5. Copy and store the key securely

**Pricing Information:**
- **DALL-E 3 (1024×1024)**: $0.040 per image
- **DALL-E 3 (1792×1792)**: $0.080 per image
- **GPT-4o Vision**: $0.01-0.03 per image (depending on processing)
- **Estimated cost per image**: $0.10-0.20

## Optional Environment Variables

### 3. Cost Control Settings

```bash
# Optional: Set daily spending limits (USD)
npx convex env set MAX_DAILY_SPEND_USD 25.00

# Optional: Set monthly spending limits (USD)
npx convex env set MAX_MONTHLY_SPEND_USD 200.00

# Optional: Enable spending limit enforcement
npx convex env set ENABLE_SPENDING_LIMITS true

# Optional: Cost tracking notifications
npx convex env set COST_ALERT_THRESHOLD_USD 10.00
```

### 4. Performance Tuning

```bash
# Optional: Adjust batch processing for high-traffic scenarios
npx convex env set MAX_CONCURRENT_GENERATIONS 5

# Optional: Generation timeout (milliseconds)
npx convex env set GENERATION_TIMEOUT_MS 30000

# Optional: Enable aggressive caching
npx convex env set ENABLE_IMAGE_CACHING true

# Optional: Cache expiration time (hours)
npx convex env set CACHE_EXPIRATION_HOURS 24
```

### 5. Development & Debugging

```bash
# Optional: Enable verbose logging for development
npx convex env set DEBUG_AI_GENERATION true

# Optional: Enable test mode (uses cheaper/faster settings)
npx convex env set AI_TEST_MODE true

# Optional: Override default model selection
npx convex env set DEFAULT_AI_MODEL google/gemini-2.5-flash-image-preview
```

## Environment Verification

### 1. Verify All Keys Are Set

```bash
# Check if Google Gemini key is configured
npx convex env get GEMINI_API_KEY

# Check if OpenAI key is configured  
npx convex env get OPENAI_API_KEY

# List all environment variables
npx convex env list
```

### 2. Test API Key Validity

```bash
# Test all configured AI models
npx convex run ai:getAIModelStatus

# Expected output should show:
# - Google Gemini: available = true
# - OpenAI DALL-E: available = true  
# - OpenAI GPT-4o: available = true
```

### 3. Test Individual Models

```bash
# Test Google Gemini (should be primary/fastest)
npx convex run ai:testImageGeneration \
  '{"prompt": "A cheerful robot in a garden", "model": "google/gemini-2.5-flash-image-preview"}'

# Test OpenAI DALL-E (fallback model)
npx convex run ai:testImageGeneration \
  '{"prompt": "A cheerful robot in a garden", "model": "openai/dall-e-3"}'

# Test OpenAI GPT-4o Vision (alternative fallback)
npx convex run ai:testImageGeneration \
  '{"prompt": "A cheerful robot in a garden", "model": "openai/gpt-4o-vision-edit"}'
```

## Deployment Environment Setup

### Development Environment
```bash
# Minimal setup for local development
npx convex env set GEMINI_API_KEY your-dev-key
npx convex env set OPENAI_API_KEY your-dev-key
npx convex env set DEBUG_AI_GENERATION true
npx convex env set AI_TEST_MODE true
npx convex env set MAX_DAILY_SPEND_USD 5.00
```

### Production Environment
```bash
# Complete production setup
npx convex env set GEMINI_API_KEY your-prod-key
npx convex env set OPENAI_API_KEY your-prod-key
npx convex env set ENABLE_SPENDING_LIMITS true
npx convex env set MAX_DAILY_SPEND_USD 50.00
npx convex env set MAX_MONTHLY_SPEND_USD 500.00
npx convex env set ENABLE_IMAGE_CACHING true
npx convex env set CACHE_EXPIRATION_HOURS 72
```

## Security Best Practices

### 1. API Key Management

**✅ DO:**
- Store keys only in Convex environment variables
- Use different keys for development and production
- Rotate keys regularly (quarterly recommended)
- Monitor API usage and costs daily
- Set spending limits and alerts

**❌ DON'T:**
- Commit API keys to version control
- Share keys in plain text communications
- Use production keys in development
- Leave unused keys active

### 2. Cost Management

**Monitor Usage:**
```bash
# Check recent generation costs
npx convex logs | grep -E "(estimatedCost|totalCost|tokens)"

# Monitor daily API usage
npx convex run ai:getGenerationStats '{"timeRange": "24h"}'
```

**Set Up Alerts:**
1. Google Cloud Console: Set billing alerts
2. OpenAI Dashboard: Configure usage notifications
3. Convex Dashboard: Monitor function execution costs

### 3. Access Control

```bash
# Ensure only necessary functions can access AI generation
# Internal functions should be used for AI generation:
# - internal.ai.generateAIImages (not public)
# - internal.generate.generate.* (not public)

# Public functions for testing only:
# - ai:testImageGeneration (for debugging)
# - ai:getAIModelStatus (for health checks)
```

## Troubleshooting Environment Issues

### Common Problems

#### 1. "API key not configured" errors
```bash
# Check if key exists
npx convex env get GEMINI_API_KEY

# If empty, set the key
npx convex env set GEMINI_API_KEY your-api-key

# Verify deployment picked up the change
npx convex deploy
```

#### 2. "Invalid API key" errors  
```bash
# Test key validity with simple call
npx convex run ai:getAIModelStatus

# If shows "available: false", check:
# 1. Key is correct (no extra spaces/characters)
# 2. API access is enabled for your account
# 3. Billing is set up (for production usage)
```

#### 3. High unexpected costs
```bash
# Check recent generation activity
npx convex logs | grep -A 5 -B 5 "estimatedCost"

# Verify spending limits are active
npx convex env get ENABLE_SPENDING_LIMITS
npx convex env get MAX_DAILY_SPEND_USD

# Review cached vs generated images ratio
npx convex logs | grep -c "cache hit"
npx convex logs | grep -c "generating"
```

#### 4. Slow generation times
```bash
# Check which models are being used
npx convex logs | grep -E "(model.*google|model.*openai)"

# Verify Google Gemini is primary (faster)
npx convex env get DEFAULT_AI_MODEL

# Check if fallbacks are being triggered unnecessarily  
npx convex logs | grep -E "(fallback|error.*google)"
```

## Environment Variables Reference

### Complete List

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GEMINI_API_KEY` | ✅ Required | - | Google Gemini API key for primary image generation |
| `OPENAI_API_KEY` | ✅ Required | - | OpenAI API key for fallback models |
| `GOOGLE_GENAI_API_KEY` | Optional | - | Alternative Google API key name |
| `MAX_DAILY_SPEND_USD` | Optional | 100.00 | Daily spending limit in USD |
| `MAX_MONTHLY_SPEND_USD` | Optional | 1000.00 | Monthly spending limit in USD |
| `ENABLE_SPENDING_LIMITS` | Optional | false | Enable cost limit enforcement |
| `COST_ALERT_THRESHOLD_USD` | Optional | 25.00 | Send alerts when threshold reached |
| `MAX_CONCURRENT_GENERATIONS` | Optional | 3 | Max parallel API calls |
| `GENERATION_TIMEOUT_MS` | Optional | 45000 | Generation timeout (45 seconds) |
| `ENABLE_IMAGE_CACHING` | Optional | true | Enable result caching |
| `CACHE_EXPIRATION_HOURS` | Optional | 48 | Cache lifetime in hours |
| `DEBUG_AI_GENERATION` | Optional | false | Enable verbose logging |
| `AI_TEST_MODE` | Optional | false | Use cheaper settings for testing |
| `DEFAULT_AI_MODEL` | Optional | google/gemini-2.5-flash-image-preview | Primary model to use |

### Cost Estimates

**Daily Usage Examples:**
- **Small game (4 players, 3 rounds)**: 12 images × $0.04 = ~$0.48/day
- **Medium usage (20 games/day)**: 240 images × $0.04 = ~$9.60/day  
- **High usage (100 games/day)**: 1,200 images × $0.04 = ~$48/day

**Monthly Projections:**
- **Development/Testing**: $5-15/month
- **Small Production**: $50-150/month
- **Medium Production**: $300-800/month
- **High Production**: $1,000+/month

## Next Steps

After configuring environment variables:

1. **Deploy Configuration**: `npx convex deploy`
2. **Test All Models**: Run test generation commands above  
3. **Monitor Initial Usage**: Check logs and costs for first 24 hours
4. **Adjust Limits**: Fine-tune spending limits based on actual usage
5. **Set Up Monitoring**: Configure billing alerts and usage dashboards
6. **Document Keys**: Store API key information securely for team access

## Support Resources

- **Google Gemini**: [AI Studio Documentation](https://ai.google.dev/)
- **OpenAI**: [Platform Documentation](https://platform.openai.com/docs)
- **Convex**: [Environment Variables Guide](https://docs.convex.dev/deployment/environment-variables)
- **Billing**: Monitor usage through respective AI provider dashboards