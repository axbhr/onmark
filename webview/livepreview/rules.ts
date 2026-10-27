import { EditorView } from '@codemirror/view';
import type { NodeHandlers } from './context';
import { RuleWidget } from './widgets/rule';

const rule = new RuleWidget();

export const ruleHandlers: NodeHandlers = {
  HorizontalRule(node, ctx) {
    // `---` at offset 0 opens YAML frontmatter (rendered in phase 3), not a rule.
    if (node.from > 0 && !ctx.lineActive(node.from)) ctx.widget(node.from, node.to, rule);
  },
};

export const ruleTheme = EditorView.baseTheme({
  '.cm-om-hr': {
    display: 'inline-block',
    width: '100%',
    verticalAlign: 'middle',
    borderTop: '1px solid var(--vscode-textSeparator-foreground, var(--vscode-descriptionForeground))',
  },
});
