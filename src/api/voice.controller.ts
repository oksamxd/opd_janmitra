import { Controller, Post, Body, UseInterceptors, UploadedFile, Get, Query, StreamableFile, HttpException, HttpStatus } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AiService } from '../healthcare/services/ai.service';
import { Readable } from 'stream';

@Controller('api/voice')
export class VoiceController {
  constructor(private readonly aiService: AiService) {}

  /**
   * Upload an audio file and transcribe it to text using Whisper.
   */
  @Post('transcribe')
  @UseInterceptors(FileInterceptor('audio'))
  async transcribeAudio(@UploadedFile() file: any) {
    if (!file) {
      throw new HttpException('Audio file is required', HttpStatus.BAD_REQUEST);
    }
    try {
      const filename = file.originalname || 'audio.webm';
      const text = await this.aiService.transcribeAudio(file.buffer, filename);
      return { success: true, text };
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Convert text to speech using OpenAI TTS. Returns an audio/mpeg stream.
   */
  @Get('synthesize')
  async synthesizeSpeechGet(@Query('text') text: string) {
    if (!text) {
      throw new HttpException('Text is required', HttpStatus.BAD_REQUEST);
    }
    try {
      const webStream = await this.aiService.synthesizeSpeechStream(text);
      // @ts-ignore - Readable.fromWeb exists in Node 18+
      const nodeStream = Readable.fromWeb(webStream);
      
      return new StreamableFile(nodeStream, {
        type: 'audio/mpeg',
        disposition: 'inline; filename="spoken.mp3"',
      });
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
  
  @Post('synthesize')
  async synthesizeSpeechPost(@Body('text') text: string) {
    if (!text) {
      throw new HttpException('Text is required', HttpStatus.BAD_REQUEST);
    }
    try {
      const webStream = await this.aiService.synthesizeSpeechStream(text);
      // @ts-ignore
      const nodeStream = Readable.fromWeb(webStream);
      
      return new StreamableFile(nodeStream, {
        type: 'audio/mpeg',
        disposition: 'inline; filename="spoken.mp3"',
      });
    } catch (error) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
