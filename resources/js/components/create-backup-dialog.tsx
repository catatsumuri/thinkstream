import { Form } from '@inertiajs/react';
import { Archive } from 'lucide-react';
import { useId, useState } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

type CreateBackupDialogProps = {
    action: string;
    namespaceName: string;
    triggerLabel?: string;
    triggerVariant?: 'default' | 'outline';
    triggerSize?: 'default' | 'sm';
};

export default function CreateBackupDialog({
    action,
    namespaceName,
    triggerLabel = 'Create Backup',
    triggerVariant = 'default',
    triggerSize = 'sm',
}: CreateBackupDialogProps) {
    const descriptionId = useId();
    const [description, setDescription] = useState('');
    const [open, setOpen] = useState(false);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant={triggerVariant} size={triggerSize}>
                    <Archive className="size-4" />
                    {triggerLabel}
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogTitle>
                    Create backup for &ldquo;{namespaceName}&rdquo;?
                </DialogTitle>
                <DialogDescription className="space-y-3">
                    <p>
                        Add an optional note to help identify this archive later
                        during restore.
                    </p>
                    <p>This note is stored inside the zip manifest.</p>
                </DialogDescription>
                <Form
                    action={action}
                    method="post"
                    onSuccess={() => {
                        setOpen(false);
                        setDescription('');
                    }}
                >
                    {({ processing, errors }) => (
                        <div className="space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor={descriptionId}>
                                    Description
                                </Label>
                                <textarea
                                    id={descriptionId}
                                    name="description"
                                    value={description}
                                    onChange={(event) =>
                                        setDescription(event.target.value)
                                    }
                                    placeholder="Optional note for this backup"
                                    rows={4}
                                    className="flex min-h-24 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Shown in backup restore lists. Leave blank
                                    if you do not need a note.
                                </p>
                                <InputError message={errors.description} />
                            </div>
                            {errors.backup && (
                                <InputError message={errors.backup} />
                            )}
                            <DialogFooter className="gap-2">
                                <DialogClose asChild>
                                    <Button
                                        variant="secondary"
                                        onClick={() => setDescription('')}
                                    >
                                        Cancel
                                    </Button>
                                </DialogClose>
                                <Button type="submit" disabled={processing}>
                                    <Archive className="size-4" />
                                    Create Backup
                                </Button>
                            </DialogFooter>
                        </div>
                    )}
                </Form>
            </DialogContent>
        </Dialog>
    );
}
