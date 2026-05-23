import {
  registerDecorator,
  type ValidationOptions,
  type ValidatorConstraintInterface,
  ValidatorConstraint,
} from 'class-validator';

export const STRONG_PASSWORD_VALIDATION_MESSAGE =
  'A senha deve ter entre 10 e 72 caracteres e incluir letra maiúscula, letra minúscula, número e caractere especial.';

const PASSWORD_MIN_LENGTH = 10;
const PASSWORD_MAX_LENGTH = 72;
const UPPERCASE_PATTERN = /[A-Z]/;
const LOWERCASE_PATTERN = /[a-z]/;
const NUMBER_PATTERN = /[0-9]/;
const LINE_BREAK_PATTERN = /[\r\n]/;
const SPECIAL_CHARACTERS = new Set([
  '!',
  '@',
  '#',
  '$',
  '%',
  '^',
  '&',
  '*',
  '(',
  ')',
  '_',
  '+',
  '-',
  '=',
  '[',
  ']',
  '{',
  '}',
  ';',
  "'",
  ':',
  '"',
  '\\',
  '|',
  ',',
  '.',
  '<',
  '>',
  '/',
  '?',
  '`',
  '~',
]);

export function isStrongPasswordValue(value: string) {
  if (value.length < PASSWORD_MIN_LENGTH || value.length > PASSWORD_MAX_LENGTH) {
    return false;
  }

  if (value !== value.trim()) {
    return false;
  }

  if (LINE_BREAK_PATTERN.test(value)) {
    return false;
  }

  return (
    UPPERCASE_PATTERN.test(value) &&
    LOWERCASE_PATTERN.test(value) &&
    NUMBER_PATTERN.test(value) &&
    [...value].some(character => SPECIAL_CHARACTERS.has(character))
  );
}

@ValidatorConstraint({ name: 'isStrongPasswordPolicy', async: false })
export class StrongPasswordPolicyConstraint
  implements ValidatorConstraintInterface
{
  validate(value: unknown) {
    return typeof value === 'string' && isStrongPasswordValue(value);
  }

  defaultMessage() {
    return STRONG_PASSWORD_VALIDATION_MESSAGE;
  }
}

export function IsStrongPasswordPolicy(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isStrongPasswordPolicy',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: StrongPasswordPolicyConstraint,
    });
  };
}
