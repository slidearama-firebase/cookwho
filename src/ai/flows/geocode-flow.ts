'use server';

/**
 * @fileOverview A Genkit flow for getting geographical coordinates from a postcode.
 *
 * This file exports:
 * - geocodePostcode: A function that returns coordinates for a given postcode.
 * - GeocodePostcodeInput: The input type for the geocodePostcode function.
 * - GeocodePostcodeOutput: The output type for the geocodePostcode function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';
import fetch from 'node-fetch';

const GeocodePostcodeInputSchema = z.object({
  postcode: z.string().describe('The postcode to geocode.'),
});
export type GeocodePostcodeInput = z.infer<typeof GeocodePostcodeInputSchema>;

const GeocodePostcodeOutputSchema = z.object({
  latitude: z.number().describe('The latitude of the postcode.'),
  longitude: z.number().describe('The longitude of the postcode.'),
});
export type GeocodePostcodeOutput = z.infer<typeof GeocodePostcodeOutputSchema>;

const geocodeToolLogic = async ({ postcode }: GeocodePostcodeInput) => {
    // In a real application, you would use a service like Google's Geocoding API.
    // This requires an API key and enabling the API in your Google Cloud project.
    // For demonstration, this uses a free, public API.
    const response = await fetch(`https://api.postcodes.io/postcodes/${postcode}`);
    if (!response.ok) {
      throw new Error(`Failed to geocode postcode: ${response.statusText}`);
    }
    const data: any = await response.json();
    if (data.status !== 200) {
        throw new Error(`Failed to geocode postcode: ${data.error}`);
    }
    
    return {
      latitude: data.result.latitude,
      longitude: data.result.longitude,
    };
  };

const geocodeTool = ai.defineTool(
  {
    name: 'geocodePostcode',
    description: 'Get the geographical coordinates for a UK postcode.',
    inputSchema: GeocodePostcodeInputSchema,
    outputSchema: GeocodePostcodeOutputSchema,
  },
  geocodeToolLogic
);


const geocodePostcodeFlow = ai.defineFlow(
  {
    name: 'geocodePostcodeFlow',
    inputSchema: GeocodePostcodeInputSchema,
    outputSchema: GeocodePostcodeOutputSchema,
  },
  async (input) => {
    return await geocodeToolLogic(input);
  }
);

export async function geocodePostcode(
  input: GeocodePostcodeInput
): Promise<GeocodePostcodeOutput> {
  return geocodePostcodeFlow(input);
}
