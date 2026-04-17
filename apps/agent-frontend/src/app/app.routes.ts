import { Route } from '@angular/router';
import { ReplayPageComponent } from './pages/replay-page/replay-page';

export const appRoutes: Route[] = [{ path: 'sessions/:id/replay', component: ReplayPageComponent }];
