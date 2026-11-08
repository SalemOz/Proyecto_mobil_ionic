import { AbstractControl, ValidationErrors } from '@angular/forms';

// Solo letras (con tildes y ñ), espacios, guiones y apóstrofes; 2 a 50 caracteres.
const NAME_REGEX = /^\p{L}[\p{L} '\-]{1,49}$/u;
const RESERVED_NAMES = ['admin', 'test', 'usuario', 'user', 'root', 'prueba'];

export function nameValidator(control: AbstractControl): ValidationErrors | null {
  const value = String(control.value ?? '').trim();
  if (!value) return null; // "required" se encarga del campo vacío
  if (!NAME_REGEX.test(value)) return { format: true };
  if (/(.)\1{2,}/iu.test(value)) return { repeated: true }; // 3 o más letras iguales seguidas
  if (RESERVED_NAMES.includes(value.toLowerCase())) return { reserved: true };
  return null;
}

const NAME_MESSAGES: Record<string, string> = {
  required: 'Por favor, ingresa tu nombre.',
  format: 'Usa solo letras, entre 2 y 50 caracteres.',
  repeated: 'El nombre tiene letras repetidas de más.',
  reserved: 'Ese nombre no está permitido. Usa tu nombre real.'
};

/** Devuelve el mensaje de error del campo nombre (o '' si no hay error o aún no lo tocan). */
export function nameErrorMessage(control: AbstractControl): string {
  if (!control.errors || !(control.touched || control.dirty)) return '';
  const key = Object.keys(control.errors)[0];
  return NAME_MESSAGES[key] ?? 'Nombre no válido.';
}
