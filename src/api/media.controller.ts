import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Param,
  BadRequestException,
  Get,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import * as fs from 'fs';
import { PrismaService } from '../prisma.service';
import type { Response } from 'express';
import { randomUUID } from 'crypto';

@Controller('media')
export class MediaController {
  constructor(private prisma: PrismaService) {}

  @Post('upload/:caseId')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, file, cb) => {
          const uploadPath = '/tmp/uploads';
          try {
            fs.mkdirSync(uploadPath, { recursive: true });
          } catch (e) {
            // ignore if cannot create; Vercel may restrict write access
          }
          cb(null, uploadPath);
        },
        filename: (req, file, cb) => {
          const uniqueSuffix = randomUUID();
          cb(null, `${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
  )
  async uploadFile(
    @Param('caseId') caseId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const fileUrl = `/uploads/${file.filename}`;
    let dbCaseId: string | null = null;
    let dbSessionId: string | null = null;

    // Check if caseId is a "PENDING_SESSION_ID" or a real UUID
    if (caseId.startsWith('PENDING_')) {
      dbSessionId = caseId.replace('PENDING_', '');
    } else {
      // Validate UUID format (basic check)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(caseId)) {
        dbCaseId = caseId;
      } else {
        // If not UUID and not PENDING, treat as session ID just in case
        dbSessionId = caseId;
      }
    }

    // Link to case or session
    const document = await this.prisma.case_documents.create({
      data: {
        case_id: dbCaseId,
        session_id: dbSessionId,
        file_url: fileUrl,
        document_type: file.mimetype.startsWith('image/') ? 'IMAGE' : 'PDF',
      },
    });

    // ─── Log as case event so it flows through SSE stream ──────────────────
    await this.prisma.case_events.create({
      data: {
        case_id: dbCaseId,
        session_id: dbSessionId ?? undefined,
        event_type: 'DOCUMENT_UPLOADED',
        actor_type: 'JANMITRA',
        payload: {
          message: `📎 A document has been uploaded: ${file.originalname}`,
          documentId: document.document_id,
          fileUrl: fileUrl,
          documentType: file.mimetype.startsWith('image/') ? 'IMAGE' : 'PDF',
          originalName: file.originalname,
        },
      },
    });

    return {
      success: true,
      documentId: document.document_id,
      fileUrl: fileUrl,
      mimetype: file.mimetype,
      originalName: file.originalname,
      linkedTo: dbCaseId ? 'CASE' : 'SESSION',
    };
  }

  @Get('uploads/:filename')
  async serveFile(@Param('filename') filename: string, @Res() res: Response) {
    const filePath = join('/tmp/uploads', filename);
    res.sendFile(filePath);
  }
}
