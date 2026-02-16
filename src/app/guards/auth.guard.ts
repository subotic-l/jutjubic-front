import { inject, PLATFORM_ID } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);

  // Na serveru uvek dozvoli (SSR)
  if (!isPlatformBrowser(platformId)) {
    return true;
  }

  // Proveri da li postoji token u localStorage direktno
  const token = localStorage.getItem('authToken');
  
  if (token) {
    return true;
  }

  // Sačuvaj URL gde je korisnik hteo da ide
  const returnUrl = state.url;
  
  // Preusmeri na login sa returnUrl parametrom
  router.navigate(['/login'], { queryParams: { returnUrl } });
  return false;
};