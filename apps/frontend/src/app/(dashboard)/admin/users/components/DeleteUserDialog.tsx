// src/app/(dashboard)/admin/users/components/DeleteUserDialog.tsx
'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { User } from '../hooks/useUsers';

interface DeleteUserDialogProps {
  user: User;
  onDelete: (userId: string) => Promise<boolean>;
}

export function DeleteUserDialog({ user, onDelete }: DeleteUserDialogProps) {
  const [open, setOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    const success = await onDelete(user.id);
    if (success) {
      setOpen(false);
    }
    setIsDeleting(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-red-600 hover:text-red-700 hover:bg-red-50"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            <span>Confirmar Exclusão</span>
          </DialogTitle>
          <DialogDescription>
            Esta ação não pode ser desfeita. O usuário será permanentemente removido do sistema.
          </DialogDescription>
        </DialogHeader>

        <div className="bg-red-50 border border-red-200 rounded-lg p-4 my-4">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="font-medium text-red-800">Usuário a ser excluído:</h4>
              <p className="text-sm text-red-700 mt-1">
                <strong>{user.name}</strong> ({user.email})
              </p>
              <p className="text-xs text-red-600 mt-1">
                Permissão: {user.role === 'admin' ? 'Administrador' : 'Usuário'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isDeleting}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Excluindo...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir Usuário
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
