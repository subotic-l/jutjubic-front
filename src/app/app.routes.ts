import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { VideoPlayerComponent } from './components/video-player/video-player.component';
import { UploadVideoComponent } from './components/upload-video/upload-video.component';
import { MapComponent } from './components/map/map.component';
import { WatchPartyComponent } from './components/watch-party/watch-party.component';
import { CreateWatchPartyComponent } from './components/create-watch-party/create-watch-party.component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'upload', component: UploadVideoComponent },
  { path: 'map', component: MapComponent },
  { path: 'video/:id', component: VideoPlayerComponent },
  { path: 'watch-party/create', component: CreateWatchPartyComponent },
  { path: 'watch-party/:roomCode', component: WatchPartyComponent },
  { path: '**', redirectTo: '' }
];
