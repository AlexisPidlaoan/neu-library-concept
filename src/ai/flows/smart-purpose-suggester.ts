'use server';
/**
 * @fileOverview A GenAI tool that suggests common 'purpose of visit' options or auto-completes user input for faster and more consistent logging.
 *
 * - suggestPurpose - A function that suggests purposes of visit based on user input.
 * - SmartPurposeSuggesterInput - The input type for the suggestPurpose function.
 * - SmartPurposeSuggesterOutput - The return type for the suggestPurpose function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Input Schema
const SmartPurposeSuggesterInputSchema = z.object({
  partialPurpose: z.string().describe('The partial or complete purpose of visit typed by the user.'),
});
export type SmartPurposeSuggesterInput = z.infer<typeof SmartPurposeSuggesterInputSchema>;

// Output Schema
const SmartPurposeSuggesterOutputSchema = z.object({
  suggestions: z.array(z.string()).describe('A list of suggested purposes of visit.'),
});
export type SmartPurposeSuggesterOutput = z.infer<typeof SmartPurposeSuggesterOutputSchema>;

const STATIC_FALLBACKS = [
  "Study for exams",
  "Group project meeting",
  "Research for a paper",
  "Read books",
  "Use library computers",
  "Attend a workshop",
  "Print documents",
  "Borrow/return books",
  "Consult with a librarian"
];

/**
 * Suggests common purposes of visit or auto-completes user input for faster and more consistent logging.
 * @param input The user's partial input for the purpose of visit.
 * @returns A list of suggested purposes.
 */
export async function suggestPurpose(input: SmartPurposeSuggesterInput): Promise<SmartPurposeSuggesterOutput> {
  try {
    return await smartPurposeSuggesterFlow(input);
  } catch (error) {
    // If AI fails (e.g., Quota Exceeded), return filtered static suggestions
    const query = input.partialPurpose.toLowerCase();
    const filtered = STATIC_FALLBACKS.filter(s => s.toLowerCase().includes(query)).slice(0, 5);
    return { 
      suggestions: filtered.length > 0 ? filtered : STATIC_FALLBACKS.slice(0, 5) 
    };
  }
}

// Prompt definition
const smartPurposeSuggesterPrompt = ai.definePrompt({
  name: 'smartPurposeSuggesterPrompt',
  input: {schema: SmartPurposeSuggesterInputSchema},
  output: {schema: SmartPurposeSuggesterOutputSchema},
  prompt: `You are a helpful assistant for a library check-in system. The user is typing their purpose of visit. Suggest up to 5 common library visit purposes that are relevant to the user's current input. If the input is empty or very short, suggest general common purposes.

Common library visit purposes include:
- Study for exams
- Group project meeting
- Research for a paper
- Read books
- Use library computers
- Attend a workshop
- Print documents
- Borrow/return books
- Relax and read
- Consult with a librarian

User input: '{{{partialPurpose}}}'

Suggest relevant purposes as a JSON array of strings, ensuring the output strictly adheres to the provided JSON schema.`,
});

// Flow definition
const smartPurposeSuggesterFlow = ai.defineFlow(
  {
    name: 'smartPurposeSuggesterFlow',
    inputSchema: SmartPurposeSuggesterInputSchema,
    outputSchema: SmartPurposeSuggesterOutputSchema,
  },
  async (input) => {
    const {output} = await smartPurposeSuggesterPrompt(input);
    return output!;
  }
);
