import { Controller, Get, Param, Res, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { EventBusService } from './event-bus.service';
import { Subscription } from 'rxjs';

@Controller('sessions')
export class EventsController {
  constructor(private readonly eventBus: EventBusService) {}

  @Get(':id/events')
  streamEvents(@Param('id') sessionId: string, @Res() res: Response): void {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.status(HttpStatus.OK);
    res.flushHeaders();

    const subscription: Subscription = this.eventBus
      .getSessionEvents(sessionId)
      .subscribe((event) => {
        res.write(`event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`);
      });

    res.on('close', () => {
      subscription.unsubscribe();
    });
  }
}
