"use client";

import { Button } from "../../../../../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../../../../../components/ui/dialog";
import type { DeleteScope } from "../hooks/useTaskOperations";

interface DeleteConfirmModalProps {
  // Modal state
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  
  // Delete scope
  deleteScope: DeleteScope;
  onDeleteScopeChange: (scope: DeleteScope) => void;
  
  // Actions
  onConfirm: () => void;
}

export default function DeleteConfirmModal({
  isOpen,
  onOpenChange,
  deleteScope,
  onDeleteScopeChange,
  onConfirm,
}: DeleteConfirmModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white" data-testid="delete-confirm-modal">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-gray-800">Delete recurring event</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <input
                type="radio"
                id="this-event"
                name="delete-scope"
                value="instance"
                checked={deleteScope === 'instance'}
                onChange={(e) => onDeleteScopeChange(e.target.value as DeleteScope)}
                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <label htmlFor="this-event" className="text-sm font-medium text-gray-700">
                This event only
              </label>
            </div>
            {/* Hide "This and following" until we implement split-series */}
             <div className="flex items-center space-x-3">
              <input
                type="radio"
                id="all-events"
                name="delete-scope"
                value="series"
                checked={deleteScope === 'series'}
                onChange={(e) => onDeleteScopeChange(e.target.value as DeleteScope)}
                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <label htmlFor="all-events" className="text-sm font-medium text-gray-700">
                All events
              </label>
            </div>
          </div>
        </div>
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <Button
            onClick={() => onOpenChange(false)}
            variant="outline"
            className="px-4 py-2"
            data-testid="cancel-delete-button"
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2"
            data-testid="confirm-delete-button"
          >
            OK
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
