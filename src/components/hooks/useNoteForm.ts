import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateNoteCommandSchema, type CreateNoteCommand } from '@/types/api.types';

/**
 * Custom hook for managing note form state with React Hook Form + Zod validation.
 *
 * @param defaultValues - Optional default values for form fields
 * @returns Form instance and unsaved changes flag
 */
export const useNoteForm = (defaultValues?: Partial<CreateNoteCommand>) => {
  const form = useForm<CreateNoteCommand>({
    resolver: zodResolver(CreateNoteCommandSchema),
    mode: 'onBlur', // Validate on blur for better UX
    reValidateMode: 'onChange', // Re-validate on change after first validation
    defaultValues: {
      content: '',
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
