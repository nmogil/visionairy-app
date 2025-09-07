"use node";
import sharp from "sharp";

/**
 * Resize and convert an image buffer to webp format, max 2048x2048.
 * @param inputBuffer - The input image buffer (PNG, JPEG, etc)
 * @returns Promise<Buffer> - The processed webp image buffer
 */
export async function resizeAndConvertToWebp(
  inputBuffer: Buffer
): Promise<Buffer> {
  return sharp(inputBuffer)
    .resize(2048, 2048, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 92 })
    .toBuffer();
}

/**
 * Convert base64 string to Uint8Array
 * @param base64 - Base64 encoded string
 * @returns Uint8Array - The decoded bytes
 */
export function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = globalThis.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = binaryString.charCodeAt(i);
  return bytes;
}

/**
 * Generate a simple gradient placeholder image as base64 data URL
 * @param width - Width of the placeholder
 * @param height - Height of the placeholder
 * @returns Base64 data URL of the gradient placeholder
 */
export function generateGradientPlaceholder(width = 512, height = 512): string {
  // Create a simple gradient using sharp
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#gradient)" />
    </svg>
  `;
  
  // Convert SVG to base64
  const base64 = Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}

/**
 * Create a base image from text prompt using Canvas-like SVG generation
 * @param prompt - Text prompt to visualize
 * @param width - Image width
 * @param height - Image height
 * @returns Buffer - SVG image buffer
 */
export async function createBaseImageFromPrompt(
  prompt: string, 
  width = 512, 
  height = 512
): Promise<Buffer> {
  // Create a colorful background based on prompt hash
  const hash = simpleHash(prompt);
  const color1 = `hsl(${(hash % 360)}, 70%, 60%)`;
  const color2 = `hsl(${((hash * 7) % 360)}, 70%, 40%)`;
  
  // Truncate prompt for display
  const displayText = prompt.length > 50 ? prompt.substring(0, 47) + "..." : prompt;
  
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${color1};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${color2};stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#bg)" />
      <foreignObject x="10" y="${height/2 - 40}" width="${width - 20}" height="80">
        <div xmlns="http://www.w3.org/1999/xhtml" style="
          color: white;
          font-family: Arial, sans-serif;
          font-size: 18px;
          font-weight: bold;
          text-align: center;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
          word-wrap: break-word;
        ">
          ${escapeHtml(displayText)}
        </div>
      </foreignObject>
    </svg>
  `;
  
  // Convert SVG to PNG using sharp
  return await sharp(Buffer.from(svg))
    .png()
    .toBuffer();
}

/**
 * Simple hash function for generating consistent colors from text
 */
function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Escape HTML entities for SVG text content
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Validate and sanitize prompts for AI generation
 */
export function sanitizePrompt(prompt: string): string {
  // Remove potentially problematic content
  const sanitized = prompt
    .replace(/[<>]/g, '') // Remove HTML-like tags
    .trim()
    .substring(0, 200); // Limit length
  
  return sanitized;
}

/**
 * Create enhanced prompt with quality modifiers and style
 */
export function createEnhancedPrompt(questionText: string, userPrompt: string): string {
  const style = getRandomStyle();
  const quality = getQualityModifiers();
  
  return `${questionText} ${userPrompt}. ${quality} Style: ${style}`;
}

function getRandomStyle(): string {
  const styles = [
    "vibrant digital art",
    "expressive oil painting", 
    "whimsical watercolor",
    "playful cartoon illustration",
    "stunning photorealistic render",
    "imaginative concept art",
    "dreamlike surreal art",
    "clean minimalist design",
    "nostalgic retro 80s style",
    "dynamic anime artwork",
  ];
  return styles[Math.floor(Math.random() * styles.length)];
}

function getQualityModifiers(): string {
  const modifiers = [
    "High quality, detailed,",
    "Professional artwork,",
    "Masterpiece quality,",
    "Stunning visual,", 
    "Creative interpretation,",
  ];
  return modifiers[Math.floor(Math.random() * modifiers.length)];
}