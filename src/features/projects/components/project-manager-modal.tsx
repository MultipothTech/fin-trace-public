"use client";

import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogFooter,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogAction,
    AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useApp } from '@/providers/app-store';
import { TRANSLATIONS } from '@/config/constants';
import type { ProjectItem, ProjectInput, Language } from '@/features/subscriptions/types/subscription.types';
import { Plus, Pencil, Trash2, Check, FolderKanban } from 'lucide-react';
import { TAG_COLOR_PALETTES, pickRandomTagPalette } from '@/lib/tags/tag-colors';

const COLOR_PALETTES = TAG_COLOR_PALETTES.map(({ name, color, bg }) => ({ name, color, bg }));

interface ProjectManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
    language: Language;
}

export const ProjectManagerModal: React.FC<ProjectManagerModalProps> = ({
    isOpen,
    onClose,
    language,
}) => {
    const { projects, addProject, updateProject, deleteProject } = useApp();
    const t = TRANSLATIONS[language] || TRANSLATIONS.th;
    const isTh = language === 'th';

    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [form, setForm] = useState<ProjectInput>(() => {
        const palette = pickRandomTagPalette();
        return {
            nameTh: '',
            nameEn: '',
            color: palette.color,
            bg: palette.bg,
        };
    });
    const [submitting, setSubmitting] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [deleteTarget, setDeleteTarget] = useState<ProjectItem | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const resetForm = () => {
        setIsEditing(false);
        setEditId(null);
        const palette = pickRandomTagPalette();
        setForm({
            nameTh: '',
            nameEn: '',
            color: palette.color,
            bg: palette.bg,
        });
        setErrorMsg('');
    };

    const handleStartCreate = () => {
        resetForm();
        setIsEditing(true);
    };

    const handleStartEdit = (project: ProjectItem) => {
        setIsEditing(true);
        setEditId(project.id);
        setForm({
            nameTh: project.nameTh,
            nameEn: project.nameEn,
            color: project.color || 'text-violet-400',
            bg: project.bg || 'bg-violet-500/10 border-violet-500/20',
        });
        setErrorMsg('');
    };

    const handleConfirmDelete = async () => {
        if (!deleteTarget?.id) return;
        setIsDeleting(true);
        try {
            await deleteProject(deleteTarget.id);
            if (editId === deleteTarget.id) resetForm();
            setDeleteTarget(null);
        } catch (err) {
            console.error(err);
            setErrorMsg(isTh ? 'ลบโปรเจคไม่สำเร็จ' : 'Failed to delete project');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.nameTh.trim() && !form.nameEn.trim()) {
            setErrorMsg(isTh ? 'กรุณากรอกชื่อโปรเจค' : 'Please provide a project name');
            return;
        }
        setSubmitting(true);
        setErrorMsg('');
        try {
            const payload: ProjectInput = {
                nameTh: form.nameTh.trim() || form.nameEn.trim(),
                nameEn: form.nameEn.trim() || form.nameTh.trim(),
                color: form.color,
                bg: form.bg,
            };
            if (editId) {
                await updateProject(editId, payload);
            } else {
                await addProject(payload);
            }
            resetForm();
        } catch (err: unknown) {
            setErrorMsg(err instanceof Error ? err.message : 'Failed to save');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <>
            <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { resetForm(); onClose(); } }}>
                <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto p-4 sm:p-6">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FolderKanban className="w-5 h-5 text-violet-400" />
                            {isTh ? 'จัดการโปรเจค' : 'Manage Projects'}
                        </DialogTitle>
                    </DialogHeader>

                    {errorMsg && (
                        <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                            {errorMsg}
                        </div>
                    )}

                    {!isEditing ? (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs text-muted-foreground">
                                    {isTh ? 'โปรเจคทั้งหมด' : 'All Projects'} ({projects.length})
                                </Label>
                                <Button size="sm" onClick={handleStartCreate} className="h-8 gap-1.5 text-xs bg-violet-600 hover:bg-violet-700">
                                    <Plus className="w-3.5 h-3.5" />
                                    {isTh ? 'เพิ่มโปรเจค' : 'New Project'}
                                </Button>
                            </div>

                            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                                {projects.length === 0 ? (
                                    <div className="text-center py-8 text-xs text-muted-foreground border border-dashed rounded-xl">
                                        {isTh ? 'ยังไม่มีโปรเจค — กดเพิ่มโปรเจคเพื่อเริ่มต้น' : 'No projects yet — create one to get started'}
                                    </div>
                                ) : (
                                    projects.map((project) => (
                                        <div
                                            key={project.id}
                                            className="flex items-center justify-between p-2.5 rounded-xl bg-card/60 border border-border/50"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${project.bg} ${project.color}`}>
                                                    <FolderKanban className="w-4 h-4" />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="text-sm font-medium truncate">
                                                        {isTh ? project.nameTh : project.nameEn}
                                                    </div>
                                                    <div className="text-[11px] text-muted-foreground truncate">
                                                        {isTh ? project.nameEn : project.nameTh}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1.5 shrink-0">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-muted-foreground"
                                                    onClick={() => handleStartEdit(project)}
                                                >
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                                                    onClick={() => setDeleteTarget(project)}
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            <DialogFooter className="pt-2 border-t border-border/40">
                                <Button type="button" variant="outline" onClick={onClose} className="w-full">
                                    {isTh ? 'ปิด' : 'Close'}
                                </Button>
                            </DialogFooter>
                        </div>
                    ) : (
                        <form onSubmit={handleSave} className="space-y-4">
                            <div className="flex items-center justify-between border-b border-border/40 pb-2">
                                <span className="text-xs font-semibold">
                                    {editId ? (isTh ? 'แก้ไขโปรเจค' : 'Edit Project') : (isTh ? 'สร้างโปรเจคใหม่' : 'Create Project')}
                                </span>
                                <Button type="button" variant="ghost" size="sm" className="text-xs h-7" onClick={resetForm}>
                                    {t.modals.cancel}
                                </Button>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-medium">
                                    {isTh ? 'ชื่อโปรเจค (ภาษาไทย)' : 'Project Name (TH)'} *
                                </Label>
                                <Input
                                    required
                                    placeholder={isTh ? 'เช่น FinTrace, งานลูกค้า A' : 'e.g. FinTrace, Client A'}
                                    value={form.nameTh}
                                    onChange={(e) => setForm({ ...form, nameTh: e.target.value })}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-medium">
                                    {isTh ? 'ชื่อโปรเจค (English)' : 'Project Name (EN)'}
                                </Label>
                                <Input
                                    placeholder="e.g. FinTrace, Client A"
                                    value={form.nameEn}
                                    onChange={(e) => setForm({ ...form, nameEn: e.target.value })}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-medium">
                                    {isTh ? 'สีโปรเจค' : 'Project Color'}
                                </Label>
                                <div className="flex flex-wrap gap-2">
                                    {COLOR_PALETTES.map((palette) => {
                                        const selected = form.color === palette.color;
                                        return (
                                            <button
                                                key={palette.name}
                                                type="button"
                                                onClick={() => setForm({ ...form, color: palette.color, bg: palette.bg })}
                                                className={`px-3 py-1.5 rounded-lg border text-xs flex items-center gap-1.5 ${palette.bg} ${palette.color} ${
                                                    selected ? 'ring-2 ring-primary ring-offset-1 ring-offset-background font-semibold' : 'opacity-80'
                                                }`}
                                            >
                                                {selected && <Check className="w-3 h-3" />}
                                                {palette.name}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className={`p-3 rounded-xl border flex items-center gap-3 ${form.bg}`}>
                                <FolderKanban className={`w-5 h-5 ${form.color}`} />
                                <div>
                                    <div className="text-[11px] text-muted-foreground">{isTh ? 'ตัวอย่าง' : 'Preview'}</div>
                                    <div className={`text-sm font-semibold ${form.color}`}>
                                        {form.nameTh || form.nameEn || (isTh ? 'ชื่อโปรเจค' : 'Project name')}
                                    </div>
                                </div>
                            </div>

                            <DialogFooter className="pt-2">
                                <Button type="button" variant="outline" onClick={resetForm} disabled={submitting}>
                                    {t.modals.cancel}
                                </Button>
                                <Button type="submit" disabled={submitting} className="bg-violet-600 hover:bg-violet-700">
                                    {submitting ? '...' : editId ? (isTh ? 'บันทึก' : 'Save') : (isTh ? 'สร้างโปรเจค' : 'Create')}
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && !isDeleting && setDeleteTarget(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{isTh ? 'ยืนยันการลบโปรเจค' : 'Delete Project'}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {isTh
                                ? `ลบโปรเจค "${deleteTarget?.nameTh || deleteTarget?.nameEn || ''}"? รายการที่ใช้โปรเจคนี้จะถูกถอดออก`
                                : `Delete project "${deleteTarget?.nameEn || deleteTarget?.nameTh || ''}"? Linked items will have the project cleared.`}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>{isTh ? 'ยกเลิก' : 'Cancel'}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmDelete} disabled={isDeleting}>
                            {isDeleting ? '...' : (isTh ? 'ลบ' : 'Delete')}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};
