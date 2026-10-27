import { describe, expect, it, vi } from 'vitest';

vi.mock('vscode', () => {
  class Range {
    constructor(
      public sl: number,
      public sc: number,
      public el: number,
      public ec: number,
    ) {}
  }
  class WorkspaceEdit {
    edits: { range: Range; text: string }[] = [];
    replace(_uri: unknown, range: Range, text: string) {
      this.edits.push({ range, text });
    }
  }
  return { Range, WorkspaceEdit, EndOfLine: { LF: 1, CRLF: 2 }, workspace: { applyEdit: vi.fn() } };
});

import * as vscode from 'vscode';
import { DocumentSync } from '../src/editor/sync';
import type { HostMessage } from '../src/shared/protocol';

/** Fake CRLF document; applyEdit mutates it and fires the change event like VS Code does. */
function setup(initial: string) {
  const doc = { text: initial, version: 1, eol: vscode.EndOfLine.CRLF, uri: {}, getText: () => doc.text };
  const posted: HostMessage[] = [];
  const sync = new DocumentSync(doc as unknown as vscode.TextDocument, (m) => posted.push(m));

  const offset = (line: number, ch: number) => {
    const lines = doc.text.split('\r\n');
    return lines.slice(0, line).reduce((n, l) => n + l.length + 2, 0) + ch;
  };
  const externalChange = (text: string) => {
    doc.text = text;
    doc.version++;
    sync.documentChanged();
  };
  vi.mocked(vscode.workspace.applyEdit).mockImplementation(async (edit) => {
    const edits = (edit as unknown as { edits: { range: vscode.Range & Record<string, number>; text: string }[] }).edits;
    const ranges = edits.map(({ range: r, text }) => ({ from: offset(r.sl, r.sc), to: offset(r.el, r.ec), text }));
    let text = doc.text;
    for (const r of ranges.sort((a, b) => b.from - a.from)) text = text.slice(0, r.from) + r.text + text.slice(r.to);
    externalChange(text);
    return true;
  });
  const flush = () => new Promise((r) => setTimeout(r, 0));
  return { doc, sync, posted, externalChange, flush };
}

describe('DocumentSync', () => {
  it('applies webview edits with the document EOL and does not echo them', async () => {
    const { doc, sync, posted, flush } = setup('a\r\nb');
    const { version } = sync.snapshot();
    sync.receiveEdit({
      type: 'edit',
      baseVersion: version,
      changes: [{ from: { line: 1, ch: 1 }, to: { line: 1, ch: 1 }, insert: '\nc' }],
    });
    await flush();
    expect(doc.text).toBe('a\r\nb\r\nc');
    expect(posted).toEqual([]);
  });

  it('forwards external changes LF-normalized', () => {
    const { sync, posted, externalChange } = setup('a\r\nb');
    sync.snapshot();
    externalChange('x\r\nb');
    expect(posted).toEqual([{ type: 'externalUpdate', text: 'x\nb', version: 2 }]);
  });

  it('drops edits based on a version older than the last update', async () => {
    const { doc, sync, posted, externalChange, flush } = setup('a');
    const { version } = sync.snapshot();
    externalChange('ab');
    sync.receiveEdit({
      type: 'edit',
      baseVersion: version,
      changes: [{ from: { line: 0, ch: 0 }, to: { line: 0, ch: 1 }, insert: 'z' }],
    });
    await flush();
    expect(doc.text).toBe('ab');
    expect(posted).toHaveLength(1);
  });
});
