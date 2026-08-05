import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Subject, takeUntil } from 'rxjs';
import { SidebarComponent } from '../shared/components/sidebar/sidebar.component';
import { AuthService } from '../core/services/auth.service';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, SidebarComponent],
  templateUrl: './layout.component.html',
  styleUrls: ['./layout.component.scss']
})
export class LayoutComponent implements OnInit, OnDestroy {

  sidebarCollapsed = false;
  mobileMenuOpen   = false;
  roles: string[]  = [];

  private destroy$ = new Subject<void>();

  constructor(private auth: AuthService) {}

  ngOnInit(): void {
    // Reactivo — se actualiza si el usuario cambia (ej. desde perfil)
    this.auth.usuario$
      .pipe(takeUntil(this.destroy$))
      .subscribe(u => {
        this.roles = u?.roles ?? [];
      });

    if (window.innerWidth < 1200 && window.innerWidth >= 768) {
      this.sidebarCollapsed = true;
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any): void {
    if (event.target.innerWidth < 768) {
      this.sidebarCollapsed = false;
      this.mobileMenuOpen   = false;
    } else if (event.target.innerWidth < 1200) {
      this.sidebarCollapsed = true;
      this.mobileMenuOpen   = false;
    }
  }

  toggleSidebar(): void {
    if (window.innerWidth < 768) {
      this.mobileMenuOpen = !this.mobileMenuOpen;
    } else {
      this.sidebarCollapsed = !this.sidebarCollapsed;
    }
  }

  closeMobileMenu(): void {
    this.mobileMenuOpen = false;
  }
}