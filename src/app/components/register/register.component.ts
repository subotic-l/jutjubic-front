import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register.component.html',
  styleUrl: './register.component.css'
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  registerForm: FormGroup;
  errorMessage = signal<string>('');
  isLoading = signal<boolean>(false);
  showPassword = signal<boolean>(false);
  showConfirmPassword = signal<boolean>(false);

  constructor() {
    this.registerForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      username: ['', [Validators.required, Validators.minLength(3)]],
      firstName: ['', [Validators.required]],
      lastName: ['', [Validators.required]],
      address: ['', [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
    const password = control.get('password');
    const confirmPassword = control.get('confirmPassword');

    if (!password || !confirmPassword) {
      return null;
    }

    return password.value === confirmPassword.value ? null : { passwordMismatch: true };
  }

  togglePasswordVisibility(): void {
    this.showPassword.set(!this.showPassword());
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword.set(!this.showConfirmPassword());
  }

  onSubmit(): void {
    if (this.registerForm.valid) {
      this.isLoading.set(true);
      this.errorMessage.set('');

      const registerData = this.registerForm.value;

      this.authService.register(registerData).subscribe({
        next: (response) => {
          this.isLoading.set(false);
          alert(response.message || 'Registration successful! Please check your email to activate your account.');
          this.router.navigate(['/login']);
        },
        error: (error) => {
          this.isLoading.set(false);
          console.error('Registration error:', error);
          
          let message = 'Registration failed. Please try again.';
          
          // Backend vraća greške u formatu: { error: "poruka" } ili validation errors
          if (error.error?.error) {
            message = error.error.error;
          } else if (error.status === 0) {
            message = 'Cannot connect to server. Please check your internet connection.';
          } else if (error.status === 400) {
            // Validation errors
            if (error.error?.errors) {
              message = Object.values(error.error.errors).join(', ');
            } else if (error.error?.message) {
              message = error.error.message;
            } else {
              message = 'Invalid registration data. Please check your inputs.';
            }
          } else if (error.error?.message) {
            message = error.error.message;
          }
          
          this.errorMessage.set(message);
        }
      });
    } else {
      this.markFormGroupTouched(this.registerForm);
    }
  }

  private markFormGroupTouched(formGroup: FormGroup): void {
    Object.keys(formGroup.controls).forEach(key => {
      const control = formGroup.get(key);
      control?.markAsTouched();
    });
  }

  get email() {
    return this.registerForm.get('email');
  }

  get username() {
    return this.registerForm.get('username');
  }

  get firstName() {
    return this.registerForm.get('firstName');
  }

  get lastName() {
    return this.registerForm.get('lastName');
  }

  get address() {
    return this.registerForm.get('address');
  }

  get password() {
    return this.registerForm.get('password');
  }

  get confirmPassword() {
    return this.registerForm.get('confirmPassword');
  }
}
