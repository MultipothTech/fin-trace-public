"use client";

import React, { useState, useMemo } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Download,
    FileSpreadsheet,
    Printer,
    FileText,
    Filter,
    Calendar as CalendarIcon,
    DollarSign,
    CheckCircle2,
} from 'lucide-react';
import type { Subscription, CategoryItem, Language } from '@/features/subscriptions/types/subscription.types';
import { SUBSCRIPTION_CATEGORIES, TRANSLATIONS } from '@/config/constants';

export interface CalendarExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    subscriptions: Subscription[];
    categories: CategoryItem[];
    selectedYear: number;
    selectedMonth: number; // 0-11
    selectedDateStr: string | null;
    language?: Language;
}

export const CalendarExportModal: React.FC<CalendarExportModalProps> = ({
    isOpen,
    onClose,
    subscriptions,
    categories,
    selectedYear,
    selectedMonth,
    selectedDateStr,
    language = 'th',
}) => {
    const t = TRANSLATIONS[language] || TRANSLATIONS.th;

    const monthNames = language === 'th'
        ? ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม']
        : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    // Filter states
    const [scope, setScope] = useState<'month' | 'year' | 'selected_date' | 'all'>('month');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [statusFilter, setStatusFilter] = useState<string>('all');

    const mStr = String(selectedMonth + 1).padStart(2, '0');
    const currentMonthPrefix = `${selectedYear}-${mStr}`;
    const currentYearPrefix = `${selectedYear}-`;

    // Filtered subscriptions based on user selection
    const filteredSubscriptions = useMemo(() => {
        return subscriptions.filter((sub) => {
            // 1. Scope filter
            if (scope === 'selected_date') {
                if (selectedDateStr && sub.nextBillingDate !== selectedDateStr) return false;
            } else if (scope === 'month') {
                if (!sub.nextBillingDate?.startsWith(currentMonthPrefix)) return false;
            } else if (scope === 'year') {
                if (!sub.nextBillingDate?.startsWith(currentYearPrefix)) return false;
            }

            // 2. Category filter
            if (categoryFilter !== 'all' && sub.category !== categoryFilter) {
                return false;
            }

            // 3. Status filter
            if (statusFilter !== 'all' && sub.status !== statusFilter) {
                return false;
            }

            return true;
        }).sort((a, b) => a.nextBillingDate.localeCompare(b.nextBillingDate));
    }, [subscriptions, scope, selectedDateStr, currentMonthPrefix, currentYearPrefix, categoryFilter, statusFilter]);

    const totalAmount = useMemo(() => {
        return filteredSubscriptions.reduce((sum, s) => sum + (Number(s.price) || 0), 0);
    }, [filteredSubscriptions]);

    // Format scope description
    const getScopeLabel = () => {
        if (scope === 'selected_date' && selectedDateStr) {
            return `${language === 'th' ? 'วันที่' : 'Date'} ${selectedDateStr}`;
        }
        if (scope === 'month') {
            return `${monthNames[selectedMonth]} ${language === 'th' ? selectedYear + 543 : selectedYear}`;
        }
        if (scope === 'year') {
            return `${language === 'th' ? 'ปี' : 'Year'} ${language === 'th' ? selectedYear + 543 : selectedYear}`;
        }
        return language === 'th' ? 'ข้อมูลทั้งหมด' : 'All Records';
    };

    // 1. Export Excel (CSV with UTF-8 BOM for Thai Excel support)
    const exportToExcel = () => {
        const headers = [
            language === 'th' ? 'ลำดับ' : 'No.',
            language === 'th' ? 'ชื่อบริการ' : 'Subscription Name',
            language === 'th' ? 'ราคา' : 'Price',
            language === 'th' ? 'สกุลเงิน' : 'Currency',
            language === 'th' ? 'รอบการชำระ' : 'Billing Cycle',
            language === 'th' ? 'วันเริ่มสมัคร' : 'Start Date',
            language === 'th' ? 'วันตัดรอบบิลถัดไป' : 'Next Billing Date',
            language === 'th' ? 'หมวดหมู่' : 'Category',
            language === 'th' ? 'ช่องทางชำระเงิน' : 'Payment Method',
            language === 'th' ? 'แจ้งเตือนล่วงหน้า (วัน)' : 'Reminder Days',
            language === 'th' ? 'สถานะ' : 'Status',
            language === 'th' ? 'หมายเหตุ' : 'Notes',
        ];

        const rows = filteredSubscriptions.map((sub, idx) => {
            const customCat = categories.find((c) => c.key === sub.category);
            const defaultCat = SUBSCRIPTION_CATEGORIES[sub.category] || SUBSCRIPTION_CATEGORIES.other;
            const catLabel = customCat
                ? (language === 'th' ? customCat.label_th : customCat.label_en)
                : (language === 'th' ? defaultCat.label_th : defaultCat.label_en);

            const statusLabel = sub.status === 'active'
                ? (language === 'th' ? 'เปิดใช้งาน' : 'Active')
                : sub.status === 'paused'
                ? (language === 'th' ? 'หยุดชั่วคราว' : 'Paused')
                : (language === 'th' ? 'ยกเลิกแล้ว' : 'Cancelled');

            return [
                idx + 1,
                `"${(sub.name || '').replace(/"/g, '""')}"`,
                sub.price,
                sub.currency || 'THB',
                sub.billingCycle,
                sub.startDate || '',
                sub.nextBillingDate || '',
                `"${(catLabel || '').replace(/"/g, '""')}"`,
                `"${(sub.paymentMethod || '').replace(/"/g, '""')}"`,
                sub.reminderDays || 3,
                `"${statusLabel}"`,
                `"${(sub.notes || '').replace(/"/g, '""')}"`,
            ].join(',');
        });

        // Add summary row
        rows.push('');
        rows.push([
            '',
            `"${language === 'th' ? 'ยอดรวมทั้งหมด' : 'Total Amount'}"`,
            totalAmount,
            'THB',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
            '',
        ].join(','));

        const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `fintrace_subscriptions_${scope}_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    // 2. Export PDF via Printable HTML
    const exportToPdf = () => {
        const reportTitle = language === 'th' ? 'รายงานรอบบิลค่าบริการ FinTrace' : 'FinTrace Subscription & Billing Report';
        const generatedDate = new Date().toLocaleString(language === 'th' ? 'th-TH' : 'en-US');
        const scopeLabel = getScopeLabel();

        const tableRowsHtml = filteredSubscriptions.map((sub, idx) => {
            const customCat = categories.find((c) => c.key === sub.category);
            const defaultCat = SUBSCRIPTION_CATEGORIES[sub.category] || SUBSCRIPTION_CATEGORIES.other;
            const catLabel = customCat
                ? (language === 'th' ? customCat.label_th : customCat.label_en)
                : (language === 'th' ? defaultCat.label_th : defaultCat.label_en);

            const statusClass = sub.status === 'active'
                ? 'status-active'
                : sub.status === 'paused'
                ? 'status-paused'
                : 'status-cancelled';

            const statusText = sub.status === 'active'
                ? (language === 'th' ? 'ใช้งาน' : 'Active')
                : sub.status === 'paused'
                ? (language === 'th' ? 'พัก' : 'Paused')
                : (language === 'th' ? 'ยกเลิก' : 'Cancelled');

            return `
                <tr>
                    <td style="text-align: center;">${idx + 1}</td>
                    <td><strong>${sub.name}</strong></td>
                    <td><span class="category-badge">${catLabel}</span></td>
                    <td>${sub.billingCycle}</td>
                    <td>${sub.nextBillingDate}</td>
                    <td>${sub.paymentMethod || 'Credit Card'}</td>
                    <td style="text-align: center;"><span class="status-badge ${statusClass}">${statusText}</span></td>
                    <td style="text-align: right; font-weight: bold;">฿${Number(sub.price).toLocaleString()}</td>
                </tr>
            `;
        }).join('');

        const htmlContent = `
            <!DOCTYPE html>
            <html lang="${language}">
            <head>
                <meta charset="UTF-8">
                <title>${reportTitle} - ${scopeLabel}</title>
                <style>
                    body {
                        font-family: 'Sarabun', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                        color: #1e293b;
                        background: #fff;
                        margin: 0;
                        padding: 24px;
                    }
                    .header {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        border-bottom: 2px solid #e2e8f0;
                        padding-bottom: 16px;
                        margin-bottom: 20px;
                    }
                    .brand {
                        display: flex;
                        align-items: center;
                        gap: 10px;
                    }
                    .brand-icon {
                        width: 36px;
                        height: 36px;
                        background: #f59e0b;
                        color: white;
                        border-radius: 8px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-weight: bold;
                        font-size: 18px;
                    }
                    .brand h1 {
                        margin: 0;
                        font-size: 20px;
                        color: #0f172a;
                    }
                    .brand p {
                        margin: 0;
                        font-size: 11px;
                        color: #64748b;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                    }
                    .meta {
                        text-align: right;
                        font-size: 12px;
                        color: #64748b;
                    }
                    .summary-cards {
                        display: grid;
                        grid-template-columns: repeat(3, 1fr);
                        gap: 12px;
                        margin-bottom: 20px;
                    }
                    .card {
                        background: #f8fafc;
                        border: 1px solid #e2e8f0;
                        border-radius: 8px;
                        padding: 12px;
                    }
                    .card p {
                        margin: 0;
                        font-size: 11px;
                        color: #64748b;
                    }
                    .card h3 {
                        margin: 4px 0 0 0;
                        font-size: 18px;
                        color: #0f172a;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        font-size: 12px;
                        margin-bottom: 24px;
                    }
                    th {
                        background: #f1f5f9;
                        color: #475569;
                        padding: 10px 8px;
                        border-bottom: 2px solid #cbd5e1;
                        text-align: left;
                        font-weight: 600;
                    }
                    td {
                        padding: 8px;
                        border-bottom: 1px solid #e2e8f0;
                    }
                    tr:nth-child(even) td {
                        background: #f8fafc;
                    }
                    .category-badge {
                        background: #e2e8f0;
                        color: #334155;
                        padding: 2px 6px;
                        border-radius: 4px;
                        font-size: 10px;
                    }
                    .status-badge {
                        padding: 2px 6px;
                        border-radius: 4px;
                        font-size: 10px;
                        font-weight: bold;
                    }
                    .status-active { background: #dcfce7; color: #166534; }
                    .status-paused { background: #fef9c3; color: #854d0e; }
                    .status-cancelled { background: #fee2e2; color: #991b1b; }
                    .total-row td {
                        border-top: 2px solid #0f172a;
                        font-size: 14px;
                        font-weight: bold;
                        background: #f8fafc;
                    }
                    .footer {
                        text-align: center;
                        font-size: 11px;
                        color: #94a3b8;
                        margin-top: 30px;
                        padding-top: 12px;
                        border-top: 1px solid #e2e8f0;
                    }
                    @media print {
                        body { padding: 0; }
                        button { display: none; }
                        @page { margin: 1.5cm; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="brand">
                        <div class="brand-icon">🔔</div>
                        <div>
                            <h1>FinTrace</h1>
                            <p>Subscription & Bill Alert PWA</p>
                        </div>
                    </div>
                    <div class="meta">
                        <div><strong>${language === 'th' ? 'ขอบเขตรายงาน' : 'Scope'}:</strong> ${scopeLabel}</div>
                        <div><strong>${language === 'th' ? 'วันที่พิมพ์' : 'Printed At'}:</strong> ${generatedDate}</div>
                    </div>
                </div>

                <div class="summary-cards">
                    <div class="card">
                        <p>${language === 'th' ? 'จำนวนรายการทั้งหมด' : 'Total Subscriptions'}</p>
                        <h3>${filteredSubscriptions.length} ${language === 'th' ? 'รายการ' : 'Items'}</h3>
                    </div>
                    <div class="card">
                        <p>${language === 'th' ? 'ยอดรวมค่าใช้จ่าย' : 'Total Amount'}</p>
                        <h3 style="color: #0284c7;">฿${totalAmount.toLocaleString()}</h3>
                    </div>
                    <div class="card">
                        <p>${language === 'th' ? 'สถานะเปิดใช้งาน' : 'Active Status'}</p>
                        <h3 style="color: #16a34a;">${filteredSubscriptions.filter(s => s.status === 'active').length} ${language === 'th' ? 'รายการ' : 'Active'}</h3>
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th style="width: 30px; text-align: center;">#</th>
                            <th>${language === 'th' ? 'ชื่อบริการ' : 'Subscription'}</th>
                            <th>${language === 'th' ? 'หมวดหมู่' : 'Category'}</th>
                            <th>${language === 'th' ? 'รอบชำระ' : 'Cycle'}</th>
                            <th>${language === 'th' ? 'วันตัดรอบบิล' : 'Next Bill'}</th>
                            <th>${language === 'th' ? 'ช่องทางชำระ' : 'Payment'}</th>
                            <th style="text-align: center;">${language === 'th' ? 'สถานะ' : 'Status'}</th>
                            <th style="text-align: right;">${language === 'th' ? 'ยอดเงิน (THB)' : 'Amount (THB)'}</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRowsHtml}
                        <tr class="total-row">
                            <td colspan="7" style="text-align: right;">${language === 'th' ? 'ยอดรวมทั้งหมด (Total):' : 'Grand Total:'}</td>
                            <td style="text-align: right; color: #0284c7;">฿${totalAmount.toLocaleString()}</td>
                        </tr>
                    </tbody>
                </table>

                <div class="footer">
                    FinTrace - Subscription & Bill Alert App • ${generatedDate}
                </div>

                <script>
                    window.onload = function() {
                        setTimeout(function() {
                            window.print();
                        }, 500);
                    };
                </script>
            </body>
            </html>
        `;

        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.open();
            printWindow.document.write(htmlContent);
            printWindow.document.close();
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-base font-bold">
                        <Download className="w-5 h-5 text-primary" />
                        {language === 'th' ? 'ส่งออกรายงานรอบบิล' : 'Export Billing Report'}
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                        {language === 'th'
                            ? 'เลือกตัวกรองและรูปแบบไฟล์ที่ต้องการส่งออก (Excel / PDF)'
                            : 'Select filters and export report in Excel (.csv) or PDF format.'}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2 text-xs">
                    {/* Filter 1: Scope */}
                    <div className="space-y-1.5">
                        <label className="font-semibold text-foreground flex items-center gap-1.5">
                            <CalendarIcon className="w-3.5 h-3.5 text-primary" />
                            {language === 'th' ? 'ช่วงเวลาที่ต้องการส่งออก' : 'Report Timeframe'}
                        </label>
                        <Select value={scope} onValueChange={(val: any) => setScope(val)}>
                            <SelectTrigger className="text-xs h-9">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="month">
                                    {language === 'th' ? `เฉพาะเดือน ${monthNames[selectedMonth]} ${selectedYear + 543}` : `Selected Month (${monthNames[selectedMonth]} ${selectedYear})`}
                                </SelectItem>
                                {selectedDateStr && (
                                    <SelectItem value="selected_date">
                                        {language === 'th' ? `เฉพาะวันที่เลือก (${selectedDateStr})` : `Selected Date (${selectedDateStr})`}
                                    </SelectItem>
                                )}
                                <SelectItem value="year">
                                    {language === 'th' ? `ทั้งปี ${selectedYear + 543}` : `Whole Year (${selectedYear})`}
                                </SelectItem>
                                <SelectItem value="all">
                                    {language === 'th' ? 'ข้อมูลทั้งหมด (All Records)' : 'All Records'}
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Filter 2 & 3: Category & Status */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <label className="font-semibold text-foreground flex items-center gap-1.5">
                                <Filter className="w-3.5 h-3.5 text-indigo-400" />
                                {language === 'th' ? 'หมวดหมู่' : 'Category'}
                            </label>
                            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                <SelectTrigger className="text-xs h-9">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{language === 'th' ? 'ทุกหมวดหมู่' : 'All Categories'}</SelectItem>
                                    {categories.map((cat) => (
                                        <SelectItem key={cat.id || cat.key} value={cat.key}>
                                            {language === 'th' ? cat.label_th : cat.label_en}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <label className="font-semibold text-foreground flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                {language === 'th' ? 'สถานะ' : 'Status'}
                            </label>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="text-xs h-9">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{language === 'th' ? 'ทุกสถานะ' : 'All Status'}</SelectItem>
                                    <SelectItem value="active">{language === 'th' ? 'เปิดใช้งาน (Active)' : 'Active'}</SelectItem>
                                    <SelectItem value="paused">{language === 'th' ? 'หยุดชั่วคราว (Paused)' : 'Paused'}</SelectItem>
                                    <SelectItem value="cancelled">{language === 'th' ? 'ยกเลิกแล้ว (Cancelled)' : 'Cancelled'}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Summary Stats Box */}
                    <Card className="p-3 bg-muted/40 border-border space-y-2">
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">{language === 'th' ? 'จำนวนที่พบ:' : 'Matched Subscriptions:'}</span>
                            <Badge variant="secondary" className="font-bold">
                                {filteredSubscriptions.length} {language === 'th' ? 'รายการ' : 'items'}
                            </Badge>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">{language === 'th' ? 'ยอดรวมทั้งหมด:' : 'Total Amount:'}</span>
                            <span className="text-sm font-bold text-primary">
                                ฿{totalAmount.toLocaleString()}
                            </span>
                        </div>
                    </Card>

                    {/* Export Action Buttons */}
                    <div className="space-y-2 pt-2">
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                            {language === 'th' ? 'เลือกรูปแบบการส่งออก' : 'Choose Export Format'}
                        </p>
                        <div className="grid grid-cols-2 gap-2.5">
                            {/* Excel / CSV Button */}
                            <Button
                                type="button"
                                variant="outline"
                                onClick={exportToExcel}
                                disabled={filteredSubscriptions.length === 0}
                                className="h-auto py-2.5 px-3 flex flex-col items-center gap-1.5 border-emerald-500/30 hover:bg-emerald-500/10 hover:border-emerald-500 text-foreground"
                            >
                                <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
                                <div className="text-center">
                                    <p className="font-bold text-xs">{language === 'th' ? 'Excel (.csv)' : 'Excel (CSV)'}</p>
                                    <p className="text-[10px] text-muted-foreground">{language === 'th' ? 'เปิดใน Excel ได้ทันที' : 'Spreadsheet file'}</p>
                                </div>
                            </Button>

                            {/* PDF Report Button */}
                            <Button
                                type="button"
                                variant="outline"
                                onClick={exportToPdf}
                                disabled={filteredSubscriptions.length === 0}
                                className="h-auto py-2.5 px-3 flex flex-col items-center gap-1.5 border-red-500/30 hover:bg-red-500/10 hover:border-red-500 text-foreground"
                            >
                                <FileText className="w-5 h-5 text-red-500" />
                                <div className="text-center">
                                    <p className="font-bold text-xs">{language === 'th' ? 'PDF Report' : 'PDF Report'}</p>
                                    <p className="text-[10px] text-muted-foreground">{language === 'th' ? 'พิมพ์ / เซฟเป็น PDF' : 'Printable layout'}</p>
                                </div>
                            </Button>
                        </div>
                    </div>
                </div>

                <DialogFooter className="pt-2 border-t border-border">
                    <Button type="button" variant="outline" size="sm" onClick={onClose} className="w-full text-xs">
                        {language === 'th' ? 'ปิด' : 'Close'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
