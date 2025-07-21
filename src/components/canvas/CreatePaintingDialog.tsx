'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient } from '@/lib/supabase/client';
import { getOrCreateUser } from '@/lib/utils/user';

interface CreatePaintingDialogProps {
  eventId: string;
  isOpen: boolean;
  onClose: () => void;
  onPaintingCreated: () => void;
}

export default function CreatePaintingDialog({
  eventId,
  isOpen,
  onClose,
  onPaintingCreated,
}: CreatePaintingDialogProps) {
  const [title, setTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const supabase = createClient();
  const user = getOrCreateUser();

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsCreating(true);
    
    const { error } = await supabase.from('paintings').insert({
      event_id: eventId,
      title: title.trim(),
      created_by: user.id,
      position_x: Math.floor(Math.random() * 200),
      position_y: Math.floor(Math.random() * 200),
    });

    if (!error) {
      onPaintingCreated();
      setTitle('');
      onClose();
    }
    
    setIsCreating(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Canvas</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <Label htmlFor="title">Canvas Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a title for your canvas"
              autoFocus
              disabled={isCreating}
            />
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isCreating}>
              Cancel
            </Button>
            <Button type="submit" disabled={!title.trim() || isCreating}>
              {isCreating ? 'Creating...' : 'Create Canvas'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}