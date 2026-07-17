export type TransactionMeta = {
  title: string;
  successMessage?: string;
  errorMessage?: string;
  retry?: () => Promise<void> | void;
  onSuccess?: () => void;
  onError?: () => void;
};
