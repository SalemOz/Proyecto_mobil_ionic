import { FormControl } from '@angular/forms';
import { describe, expect, it } from 'vitest';
import { nameValidator } from './validators';

const check = (value: string) => nameValidator(new FormControl(value));

describe('nameValidator', () => {
  it('acepta nombres reales, con tildes y espacios', () => {
    expect(check('Delia')).toBeNull();
    expect(check('María José')).toBeNull();
    expect(check('Yhoan Sebastián')).toBeNull();
  });

  it('rechaza números y símbolos', () => {
    expect(check('Delia123')).toEqual({ format: true });
    expect(check('A')).toEqual({ format: true });
  });

  it('rechaza letras repetidas de más', () => {
    expect(check('Mariiiia')).toEqual({ repeated: true });
  });

  it('rechaza nombres reservados', () => {
    expect(check('admin')).toEqual({ reserved: true });
  });
});
