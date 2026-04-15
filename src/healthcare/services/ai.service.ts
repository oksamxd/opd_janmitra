/**
 * AI Service — Conversation formatter
 * 
 * The AI is NOT a decision maker. The state machine decides.
 * The AI formats responses to be empathetic and contextual.
 */

import { Injectable, Logger } from '@nestjs/common';
import OpenAI, { toFile } from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  /**
   * Format a system response using AI for natural language.
   * The state machine has already decided what to say — the AI just makes it sound good.
   */
  async formatResponse(params: {
    currentState: string;
    stateLabel: string;
    systemPrompt: string;
    data?: any;
    history?: ChatCompletionMessageParam[];
    language?: string;
  }): Promise<string> {
    const langLabel = params.language || 'English';
    const messages: ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: `You are Jana AI, a warm and professional OPD healthcare assistant. You are NOT a chatbot — you are a clinical workflow coordinator.

RULES:
- RESPONSE LANGUAGE: You MUST respond strictly in ${langLabel}.
- LENGTH: Be extremely brief. Strictly 1-2 short sentences maximum.
- TONE: Be empathetic, warm, but very efficient.
- ACCURACY: Never make medical decisions — only relay information from the system.
- SIMPLICITY: Use simple, clear language. Avoid jargon.

Current workflow state: ${params.stateLabel}
`,
      },
    ];

    // Add conversation history if available
    if (params.history && params.history.length > 0) {
      // Only keep last 4 messages for context to keep it fast
      const recentHistory = params.history.slice(-4);
      messages.push(...recentHistory);
    }

    messages.push({
      role: 'user',
      content: `System instruction: ${params.systemPrompt}
${params.data ? `\nContext data: ${JSON.stringify(params.data)}` : ''}

Generate a strictly concise (1-2 sentences), empathetic response in ${langLabel}.`,
    });

    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.5,
        max_tokens: 300,
      });

      return response.choices[0].message.content || params.systemPrompt;
    } catch (error) {
      this.logger.error(`AI formatting error: ${error}`);
      // Fallback: return the system prompt directly
      return params.systemPrompt;
    }
  }

  /**
   * Parse triage information from free-text user input.
   */
  async parseTriage(userInput: string): Promise<{
    symptoms: string[];
    duration: string;
    severity: string;
    rawText: string;
  }> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Extract structured triage data from patient's description. Return JSON only:
{
  "symptoms": ["symptom1", "symptom2"],
  "duration": "how long (e.g., '3 days', '1 week')",
  "severity": "MILD" | "MODERATE" | "SEVERE",
  "rawText": "original input cleaned up"
}`,
          },
          { role: 'user', content: userInput },
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      });

      const parsed = JSON.parse(response.choices[0].message.content || '{}');
      return {
        symptoms: parsed.symptoms || [userInput],
        duration: parsed.duration || 'Not specified',
        severity: parsed.severity || 'MODERATE',
        rawText: parsed.rawText || userInput,
      };
    } catch {
      return {
        symptoms: [userInput],
        duration: 'Not specified',
        severity: 'MODERATE',
        rawText: userInput,
      };
    }
  }

  /**
   * Generate a simulated doctor consultation note.
   */
  async simulateConsultation(params: {
    symptoms: string;
    severity: string;
    specialty: string;
    doctorName: string;
  }): Promise<string> {
    try {
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are Dr. ${params.doctorName}, a ${params.specialty} specialist. Write a brief consultation note (3-4 sentences) for a patient presenting with the described symptoms. Be professional and clinical.`,
          },
          {
            role: 'user',
            content: `Patient symptoms: ${params.symptoms}\nSeverity: ${params.severity}`,
          },
        ],
        temperature: 0.4,
        max_tokens: 200,
      });

      return response.choices[0].message.content || 'Consultation completed.';
    } catch {
      return `Dr. ${params.doctorName} has reviewed your case. Based on the symptoms described, appropriate treatment has been prescribed.`;
    }
  }

  /**
   * Transcribe an audio buffer using OpenAI Whisper model.
   * @param buffer Raw audio buffer from the client.
   * @param filename Filename with correct extension (e.g., 'audio.webm' or 'audio.mp3').
   */
  async transcribeAudio(buffer: Buffer, filename: string): Promise<string> {
    try {
      const file = await toFile(buffer, filename);
      const response = await this.openai.audio.transcriptions.create({
        file,
        model: 'whisper-1',
        language: 'en',
      });
      return response.text;
    } catch (error) {
      this.logger.error(`Error transcribing audio: ${error}`);
      throw new Error('Failed to transcribe audio string.');
    }
  }

  async synthesizeSpeechStream(text: string): Promise<any> {
    try {
      const response = await this.openai.audio.speech.create({
        model: 'tts-1',
        voice: 'alloy',
        input: text,
        response_format: 'mp3',
      });
      // Return Web stream body natively
      return response.body;
    } catch (error) {
      this.logger.error(`Error synthesizing speech stream: ${error}`);
      throw new Error('Failed to synthesize speech.');
    }
  }
}