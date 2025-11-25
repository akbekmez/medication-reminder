import { Injectable } from '@angular/core';
import { GoogleGenAI, Chat } from '@google/genai';
import { Medication } from '../models/medication.model';

@Injectable({ providedIn: 'root' })
export class GeminiChatService {
  private ai: GoogleGenAI;
  private chat: Chat | null = null;

  constructor() {
    if (!process.env.API_KEY) {
      throw new Error('API_KEY environment variable not set');
    }
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  startChat(medications: Medication[]): void {
    const medicationContext = this.buildMedicationContext(medications);

    const systemInstruction = `You are a friendly and helpful pharmacy assistant. Your name is 'Akıllı Asistan'.
    You can answer questions about the user's current medications.
    You MUST NEVER provide medical advice, diagnosis, or treatment recommendations.
    If the user asks for medical advice (e.g., "should I take this?", "is it safe to...?", "what should I do if...?"), you MUST politely decline and strongly advise them to consult a doctor or a pharmacist.
    Base your answers on the provided medication list. Be concise and clear.
    The current date is ${new Date().toLocaleDateString('tr-TR')}.
    ${medicationContext}`;

    this.chat = this.ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction,
        }
    });
  }

  private buildMedicationContext(medications: Medication[]): string {
    if (medications.length === 0) {
      return "The user currently has no medications listed.";
    }
    const medList = medications
      .map(m => `- ${m.name} (${m.quantity} ${m.unit})`)
      .join('\n');
    return `Here is the user's current medication list:\n${medList}`;
  }

  async *sendMessageStream(message: string): AsyncGenerator<string> {
    if (!this.chat) {
      throw new Error('Chat not initialized. Call startChat first.');
    }

    try {
        const stream = await this.chat.sendMessageStream({ message });
        for await (const chunk of stream) {
            yield chunk.text;
        }
    } catch (error) {
        console.error("Error sending message to Gemini:", error);
        yield "Üzgünüm, bir hata oluştu. Lütfen daha sonra tekrar deneyin.";
    }
  }

  async generateRefillRequestEmail(profileName: string, doctorName: string, medicationName: string): Promise<string> {
    const prompt = `Lütfen ${profileName} adına doktoru ${doctorName}'a gönderilmek üzere, ${medicationName} ilacının reçetesinin yenilenmesi talebini içeren profesyonel ve kibar bir e-posta metni oluştur. E-posta kısa ve net olmalı. E-posta sadece gövde metnini içermeli, başlık veya imza bilgisi olmamalı.`;

    try {
      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt
      });
      return response.text;
    } catch(error) {
      console.error("Error generating refill email:", error);
      throw new Error("E-posta oluşturulurken bir hata oluştu.");
    }
  }
}