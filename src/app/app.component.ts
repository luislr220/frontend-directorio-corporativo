import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  FormsModule,
} from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

// Importa tus archivos existentes
import { ContactService } from './core/services/contact.service';
import { Contact } from './core/models/contact.model';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, HttpClientModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit {
  private readonly contactService = inject(ContactService);
  private readonly fb = inject(FormBuilder);

  // --- SIGNALS (ESTADO) ---
  contacts = signal<Contact[]>([]);
  searchTerm = signal('');
  selectedDepartment = signal('Todos');
  isModalOpen = signal(false);
  editingId = signal<number | null>(null);
  isDeleteModalOpen = signal(false);
  contactToDelete = signal<number | null>(null);

  // --- FORMULARIO ---
  contactForm: FormGroup = this.fb.group({
    full_name: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', Validators.required],
    department: ['', Validators.required],
  });

  // --- COMPUTED (Lógica derivada) ---
  departments = computed(() => {
    // Extraer departamentos únicos de la lista actual
    const depts = new Set(this.contacts().map((c) => c.department));
    return ['Todos', ...Array.from(depts)];
  });

  filteredContacts = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const dept = this.selectedDepartment();

    return this.contacts().filter((contact) => {
      const matchesSearch =
        contact.full_name.toLowerCase().includes(term) ||
        contact.email.toLowerCase().includes(term);
      const matchesDept = dept === 'Todos' || contact.department === dept;
      return matchesSearch && matchesDept;
    });
  });

  isEditMode = computed(() => !!this.editingId());

  // --- CICLO DE VIDA ---
  ngOnInit() {
    this.loadContacts();
  }

  // --- MÉTODOS DE DATOS ---
  loadContacts() {
    this.contactService.getAll().subscribe({
      next: (data) => {
        this.contacts.set(data);
      },
      error: (err) => console.error('Error cargando contactos', err),
    });
  }

  onSubmit() {
    if (this.contactForm.invalid) return;

    const formValues = this.contactForm.value;

    if (this.isEditMode()) {
      const id = this.editingId()!;
      this.contactService.update(id, formValues).subscribe(() => {
        this.loadContacts();
        this.closeModal();
      });
    } else {
      this.contactService.create(formValues).subscribe(() => {
        this.loadContacts();
        this.closeModal();
      });
    }
  }

  deleteContact(id: number) {
    if (confirm('¿Estás seguro de eliminar este contacto?')) {
      this.contactService.delete(id).subscribe(() => {
        this.loadContacts();
      });
    }
  }

  // --- MÉTODOS DE UI ---
  getDepartmentColor(dept: string): string {
    const colors: { [key: string]: string } = {
      RH: 'from-purple-500 to-purple-600',
      'Recursos Humanos': 'from-purple-500 to-purple-600',
      TI: 'from-blue-500 to-blue-600',
      Tecnología: 'from-blue-500 to-blue-600',
      Finanzas: 'from-green-500 to-green-600',
      Ventas: 'from-orange-500 to-orange-600',
      Marketing: 'from-pink-500 to-pink-600',
    };
    return colors[dept] || 'from-gray-500 to-gray-600';
  }

  openModal(contact: Contact | null = null) {
    this.isModalOpen.set(true);
    if (contact) {
      this.editingId.set(contact.id!);
      this.contactForm.patchValue(contact);
    } else {
      this.editingId.set(null);
      this.contactForm.reset();
      this.contactForm.get('department')?.setValue(''); // Reset select
    }
  }

  closeModal() {
    this.isModalOpen.set(false);
    this.editingId.set(null);
  }

  openDeleteModal(id: number) {
    this.contactToDelete.set(id);
    this.isDeleteModalOpen.set(true);
  }

  closeDeleteModal() {
    this.isDeleteModalOpen.set(false);
    this.contactToDelete.set(null);
  }

  confirmDelete() {
    const id = this.contactToDelete();
    if (!id) return;

    this.contactService.delete(id).subscribe(() => {
      this.loadContacts();
      this.closeDeleteModal();
    });
  }
}
