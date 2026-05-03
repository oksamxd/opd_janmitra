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
        destination: './public/uploads',
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

    return {
      success: true,
      documentId: document.document_id,
      fileUrl: fileUrl,
      mimetype: file.mimetype,
      linkedTo: dbCaseId ? 'CASE' : 'SESSION',
    };
  }

  @Get('uploads/:filename')
  async serveFile(@Param('filename') filename: string, @Res() res: Response) {
    res.sendFile(join(process.cwd(), 'public/uploads', filename));
  }
}
