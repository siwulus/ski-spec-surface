import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateSkiSpecCommandSchema, type CreateSkiSpecCommand } from '@/types/api.types';

/**
 * Custom hook for managing ski spec form state with React Hook Form + Zod validation
 *
 * @param defaultValues - Optional default values for form fields
 * @returns Form instance and unsaved changes flag
 */
export const useSkiSpecForm = (defaultValues?: Partial<CreateSkiSpecCommand>) => {
  const form = useForm<CreateSkiSpecCommand>({
    resolver: zodResolver(CreateSkiSpecCommandSchema),
    mode: 'onBlur', // Validate on blur for better UX
    reValidateMode: 'onChange', // Re-validate on change after first validation
    defaultValues: {
      name: '',
      description: null,
      length: 180, // Sensible defaults
      tip: 130,
      waist: 100,
      tail: 120,
      radius: 15,
      weight: 1500,
      ...defaultValues,
    },
  });

  // Track unsaved changes using formState.isDirty
  const hasUnsavedChanges = form.formState.isDirty;

  return {
    form,
    hasUnsavedChanges,
  };
};
