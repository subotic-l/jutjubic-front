import { Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { VideoPlayerComponent } from './components/video-player/video-player.component';
import { UploadVideoComponent } from './components/upload-video/upload-video.component';
import { VideoFeedComponent } from './components/video-feed/video-feed.component';

export const routes: Routes = [
  { path: '', component: VideoFeedComponent }, 
  { path: 'home', component: HomeComponent },  
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'upload', component: UploadVideoComponent },
  { path: 'video/:id', component: VideoPlayerComponent },
  { path: '**', redirectTo: '' }
  
];
