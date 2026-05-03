import { Controller, Get, Param, Sse } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Observable, interval } from 'rxjs';
import { map, filter, mergeMap, distinctUntilChanged } from 'rxjs/operators';

@Controller('events')
export class EventsController {
  constructor(private prisma: PrismaService) {}

  @Sse('stream/:identifier')
  streamEvents(@Param('identifier') identifier: string): Observable<any> {
    const sentIds = new Set<string>();

    return interval(1000).pipe(
      // Faster poll for real-time feel
      mergeMap(async () => {
        // Find events by case_id OR session_id (if we add it)
        // For now, we'll also try to fetch from notifications as a fallback
        // to fill the panel early.
        const events = await this.prisma.case_events.findMany({
          where: {
            OR: [
              { case_id: identifier },
              { session_id: identifier },
            ],
          },
          orderBy: { created_at: 'asc' },
        });

        // Also fetch notifications and map them to "event" format for the panel
        const notifications = await this.prisma.notifications.findMany({
          where: {
            OR: [{ session_id: identifier }, { case_id: identifier }],
            type: { in: ['HANDOFF', 'STEP_COMPLETED', 'APPOINTMENT_REMINDER', 'TEST_COMPLETED'] },
          },
          orderBy: { created_at: 'asc' },
        });

        const mappedNotifications = notifications.map((n) => ({
          event_id: n.notification_id,
          event_type: n.type,
          actor_type: 'SYSTEM',
          payload: {
            title: n.title,
            message: n.message,
          },
          created_at: n.created_at,
        }));

        const allItems = [...events, ...mappedNotifications].sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        );

        // Find items we haven't sent yet
        const newItems = allItems.filter((e: any) => !sentIds.has(e.event_id));

        // Mark as sent
        newItems.forEach((e: any) => sentIds.add(e.event_id));

        return newItems;
      }),
      filter((newItems) => newItems.length > 0),
      map((newItems) => ({
        data: newItems,
      })),
    );
  }
}
