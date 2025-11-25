import { Injectable } from '@angular/core';
import { GoogleGenAI, Type } from '@google/genai';

export interface MedicationInfo {
  name?: string | null;
  company?: string | null;
  activeSubstance?: string | null;
  barcode?: string | null;
  quantity?: number | null;
  unit?: string | null;
}

@Injectable({ providedIn: 'root' })
export class GeminiService {
  private ai: GoogleGenAI;

  constructor() {
    // API_KEY is provided by the execution environment.
    if (!process.env.API_KEY) {
      throw new Error('API_KEY environment variable not set');
    }
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async extractMedicationInfoFromImage(imageBase64: string): Promise<MedicationInfo | null> {
    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
          parts: [
            {
              inlineData: {
                mimeType: 'image/jpeg',
                data: imageBase64,
              },
            },
            {
              text: `Analyze the provided image of a medication box. You are an expert pharmacist's assistant. Your task is to extract the following details accurately and provide them in a JSON format.
- name: The commercial name of the medication.
- company: The name of the pharmaceutical company that manufactures the medication.
- activeSubstance: The main active ingredient(s) of the medication.
- barcode: The numerical barcode value.
- quantity: The total number of units in the box (e.g., if it says '20 Film Tablet', the quantity is 20). This must be a number.
- unit: The unit of the medication (e.g., if it says '20 Film Tablet', the unit is 'Tablet').
If any information is not visible or clear, return null for that field.`
            },
          ],
        },
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING, description: 'İlaç Adı' },
                    company: { type: Type.STRING, description: 'İlaç Firması' },
                    activeSubstance: { type: Type.STRING, description: 'Etkin Madde' },
                    barcode: { type: Type.STRING, description: 'Barkod Numarası' },
                    quantity: { type: Type.NUMBER, description: 'Kutudaki tablet/kapsül sayısı' },
                    unit: { type: Type.STRING, description: 'İlaç birimi (Tablet, Kapsül, vb.)' },
                }
            }
        }
      });

      const jsonText = response.text.trim();
      const result = JSON.parse(jsonText) as MedicationInfo;
      return result;

    } catch (error) {
      console.error('Error calling Gemini API:', error);
      return null;
    }
  }
}
