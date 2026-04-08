/**
 * Patterns that indicate a model supports vision/image input.
 * Ollama vision models follow these naming conventions.
 */
const VISION_PATTERNS = [
  'llava',
  'vision',
  '-vl',
  'vl-',
  'vl:',
  'moondream',
  'bakllava',
  'minicpm',
  'gemma3',
  'granite3',
  'llama3.2-vision',
  'qwen2-vl',
  'qwen2.5vl',
  'phi3-vision',
  'internvl',
];

export function modelSupportsVision(modelName: string, isCustomApi: boolean): boolean {
  // Custom API keys (OpenAI, Groq, etc.) — assume vision capable; the user chose the model
  if (isCustomApi) return true;

  const lower = modelName.toLowerCase();
  return VISION_PATTERNS.some((p) => lower.includes(p));
}

export const VISION_MODEL_EXAMPLES = [
  'llava:7b',
  'llava-llama3',
  'llama3.2-vision',
  'moondream',
  'qwen2-vl',
  'gemma3',
];
