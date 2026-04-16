import { Module } from '@nestjs/common';
import { SessionController } from './session.controller';
import { SessionRepository } from './session.repository';

@Module({
  controllers: [SessionController],
  providers: [SessionRepository],
  exports: [SessionRepository],
})
export class SessionModule {}
