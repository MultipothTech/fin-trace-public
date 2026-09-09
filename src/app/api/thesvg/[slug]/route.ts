import { promises as fs } from 'fs';
import { NextResponse } from 'next/server';
import path from 'path';

const SLUG_RE = /^[a-z0-9][a-z0-9.-]*$/i;

function extractExport(source: string, key: string): string | null {
    // exports.svg = `...`;  or exports.title = "Netflix";
    const template = new RegExp(`exports\\.${key}\\s*=\\s*\`([\\s\\S]*?)\`;`);
    const tmplMatch = source.match(template);
    if (tmplMatch?.[1] != null) return tmplMatch[1];

    const quoted = new RegExp(`exports\\.${key}\\s*=\\s*["']([^"']*)["']`);
    const qMatch = source.match(quoted);
    return qMatch?.[1] ?? null;
}

export async function GET(
    _request: Request,
    context: { params: Promise<{ slug: string }> }
) {
    const { slug } = await context.params;
    if (!slug || !SLUG_RE.test(slug)) {
        return NextResponse.json({ error: 'Invalid slug' }, { status: 400 });
    }

    try {
        const iconPath = path.join(
            process.cwd(),
            'node_modules',
            '@thesvg',
            'icons',
            'dist',
            `${slug}.cjs`
        );
        const source = await fs.readFile(iconPath, 'utf8');
        const svg = extractExport(source, 'svg');
        if (!svg) {
            return NextResponse.json({ error: 'Icon not found' }, { status: 404 });
        }

        return NextResponse.json({
            slug: extractExport(source, 'slug') || slug,
            title: extractExport(source, 'title') || slug,
            hex: extractExport(source, 'hex'),
            svg,
        });
    } catch {
        return NextResponse.json({ error: 'Icon not found' }, { status: 404 });
    }
}
