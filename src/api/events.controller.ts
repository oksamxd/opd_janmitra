import { Controller, Get, Param, Sse } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Observable, interval } from 'rxjs';
import { map, filter, mergeMap, distinctUntilChanged } from 'rxjs/operators';

@Controller('events')
export class EventsController {
  constructor(private prisma: PrismaService) {}

  @Sse('stream/:caseId')
  streamEvents(@Param('caseId') caseId: string): Observable<any> {
    const sentIds = new Set<string>();

    return interval(1000).pipe( // Faster poll for real-time feel
      mergeMap(async () => {
        const events = await this.prisma.case_events.findMany({
          where: { case_id: caseId },
          orderBy: { created_at: 'asc' },
        });
        
        // Find events we haven't sent yet
        const newEvents = events.filter(e => !sentIds.has(e.event_id));
        
        // Mark as sent
        newEvents.forEach(e => sentIds.add(e.event_id));
        
        return newEvents;
      }),
      filter(newEvents => newEvents.length > 0),
      map(newEvents => ({
        data: newEvents,
      }))
    );
  }
}
