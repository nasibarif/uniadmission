import { z } from 'zod';

/**
 * Zod Schemas for Validating AI Structured Outputs (Step 30)
 * Prevents malformed AI outputs from breaking the application.
 */

export const SopSectionSchema = z.object({
  title: z.string().min(2),
  content: z.string().min(10),
  tips: z.string().default('Review for specific academic alignment and institutional values.')
});

export const SopSectionArraySchema = z.array(SopSectionSchema).min(1).max(8);

export const SopCritiqueSchema = z.object({
  overallScore: z.number().min(0).max(100),
  readabilityScore: z.number().min(0).max(100).default(85),
  hookStrengthScore: z.number().min(0).max(100).default(80),
  institutionalAlignmentScore: z.number().min(0).max(100).default(85),
  specificityScore: z.number().min(0).max(100).default(80),
  strengths: z.array(z.string()).default([]),
  areasForImprovement: z.array(z.string()).default([]),
  keyActionItems: z.array(z.string()).default([])
});

export const StarCvBulletSchema = z.object({
  original: z.string(),
  improvedBullet: z.string(),
  situation: z.string(),
  task: z.string(),
  action: z.string(),
  result: z.string(),
  impactMetrics: z.string()
});

export type ValidatedSopSection = z.infer<typeof SopSectionSchema>;
export type ValidatedSopCritique = z.infer<typeof SopCritiqueSchema>;
export type ValidatedStarCvBullet = z.infer<typeof StarCvBulletSchema>;

/**
 * Helper to safely extract and parse JSON from AI string response with fallback
 */
export function safelyParseJson<T>(rawText: string, schema: z.ZodType<T>, fallback: T): T {
  try {
    let clean = rawText.trim();
    // Remove markdown code fence if present
    if (clean.startsWith('```json')) {
      clean = clean.replace(/^```json\s*/, '').replace(/```\s*$/, '');
    } else if (clean.startsWith('```')) {
      clean = clean.replace(/^```\s*/, '').replace(/```\s*$/, '');
    }
    
    // Attempt parsing
    const parsed = JSON.parse(clean);
    const validated = schema.safeParse(parsed);
    if (validated.success) {
      return validated.data;
    }
    console.warn('AI Output validation warning, falling back:', validated.error);
    return fallback;
  } catch (err) {
    console.warn('AI Output JSON parse failed, utilizing graceful fallback:', err);
    return fallback;
  }
}
