import React, { useState } from 'react';
import {
  Button,
  Input,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@ohif/ui-next';
import { useTranslation } from 'react-i18next';

interface EncryptedZipPasswordDialogProps {
  isOpen: boolean;
  onPasswordEntered: (password: string) => void;
  onCancel: () => void;
  title?: string;
  message?: string;
}

function EncryptedZipPasswordDialog({
  isOpen,
  onPasswordEntered,
  onCancel,
  title = 'Password Required',
  message = 'Enter password to access encrypted DICOM files:',
}: EncryptedZipPasswordDialogProps) {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('Password is required');
      return;
    }
    setError('');
    onPasswordEntered(password);
    setPassword(''); // Clear password after submission
  };

  const handleCancel = () => {
    setPassword('');
    setError('');
    onCancel();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{message}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <Input
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(''); // Clear error when user types
              }}
              placeholder="Enter password"
              className="w-full"
              autoFocus
            />
            {error && (
              <p className="mt-2 text-sm text-red-500">{error}</p>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="secondary"
              onClick={handleCancel}
            >
              {t('Buttons:Cancel') || 'Cancel'}
            </Button>
            <Button
              type="submit"
              variant="primary"
            >
              {t('Buttons:OK') || 'OK'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default EncryptedZipPasswordDialog;
